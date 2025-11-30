#!/usr/bin/env python3
"""
OMR Pipeline - Orchestrates the full OMR processing flow.

Pipeline steps:
1. Validate input file (PDF or image)
2. Convert PDF to images (if needed)
3. Auto-downsample large images
4. Run Audiveris OMR
5. Convert MusicXML to TabComposition
6. Return result with title extracted
"""

import json
import os
import re
import shutil
import subprocess
import tempfile
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from threading import Thread

from PIL import Image

# Import our converter
from musicxml_to_tab import convert_musicxml_to_tab, merge_compositions, extract_title

# Constants
MAX_PIXELS = 20_000_000  # Audiveris limit
JOB_RETENTION_DAYS = 7  # Keep jobs for 7 days

# Platform-specific Audiveris path
import platform
if platform.system() == "Linux":
    AUDIVERIS_PATH = "/opt/audiveris/bin/Audiveris"
elif platform.system() == "Darwin":  # macOS
    AUDIVERIS_PATH = "/Applications/Audiveris.app/Contents/MacOS/Audiveris"
else:
    AUDIVERIS_PATH = "audiveris"  # Assume it's in PATH
SUPPORTED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif'}
SUPPORTED_EXTENSIONS = SUPPORTED_IMAGE_EXTENSIONS | {'.pdf'}

# Job storage (in-memory for simplicity, could be Redis/DB in production)
_jobs: Dict[str, Dict] = {}


class OMRJob:
    """Represents an OMR processing job."""

    def __init__(self, job_id: str, input_path: str, output_dir: str):
        self.job_id = job_id
        self.input_path = input_path
        self.output_dir = output_dir
        self.status = "pending"
        self.progress = ""
        self.pages_total = 0
        self.pages_completed = 0
        self.result = None
        self.error = None
        self.created_at = time.time()

    def to_dict(self) -> Dict:
        """Convert job to dictionary for API response."""
        return {
            "job_id": self.job_id,
            "status": self.status,
            "progress": self.progress,
            "pages_total": self.pages_total,
            "pages_completed": self.pages_completed,
            "error": self.error
        }


def get_job(job_id: str) -> Optional[OMRJob]:
    """Get a job by ID."""
    return _jobs.get(job_id)


def create_job(input_path: str, output_dir: str) -> OMRJob:
    """Create a new OMR job."""
    job_id = uuid.uuid4().hex[:12]
    job = OMRJob(job_id, input_path, output_dir)
    _jobs[job_id] = job
    return job


def cleanup_old_jobs(base_output_dir: str, base_upload_dir: Optional[str] = None,
                     retention_days: int = JOB_RETENTION_DAYS, dry_run: bool = False) -> Dict:
    """
    Clean up old OMR jobs from memory and filesystem.

    Args:
        base_output_dir: Base directory containing job output folders (e.g., 'omr_jobs')
        base_upload_dir: Optional base directory containing uploaded files (e.g., 'uploads')
        retention_days: Number of days to retain jobs (default: 7)
        dry_run: If True, only report what would be deleted without actually deleting

    Returns:
        Dictionary with cleanup statistics:
        {
            "memory_jobs_removed": int,
            "output_dirs_removed": list[str],
            "upload_dirs_removed": list[str],
            "space_freed_mb": float,
            "errors": list[str]
        }
    """
    cutoff_time = time.time() - (retention_days * 24 * 60 * 60)
    stats = {
        "memory_jobs_removed": 0,
        "output_dirs_removed": [],
        "upload_dirs_removed": [],
        "space_freed_mb": 0.0,
        "errors": []
    }

    # Clean up in-memory jobs
    jobs_to_remove = []
    for job_id, job in _jobs.items():
        if job.created_at < cutoff_time:
            jobs_to_remove.append(job_id)

    if not dry_run:
        for job_id in jobs_to_remove:
            del _jobs[job_id]

    stats["memory_jobs_removed"] = len(jobs_to_remove)

    # Clean up filesystem - output directories
    if os.path.exists(base_output_dir):
        try:
            for job_dir_name in os.listdir(base_output_dir):
                job_dir_path = os.path.join(base_output_dir, job_dir_name)

                if not os.path.isdir(job_dir_path):
                    continue

                # Check directory creation time
                dir_mtime = os.path.getmtime(job_dir_path)

                if dir_mtime < cutoff_time:
                    # Calculate space before deletion
                    try:
                        total_size = sum(
                            os.path.getsize(os.path.join(dirpath, filename))
                            for dirpath, _, filenames in os.walk(job_dir_path)
                            for filename in filenames
                        )
                        stats["space_freed_mb"] += total_size / (1024 * 1024)
                    except Exception as e:
                        stats["errors"].append(f"Error calculating size for {job_dir_name}: {e}")

                    # Remove directory
                    if not dry_run:
                        try:
                            shutil.rmtree(job_dir_path)
                            stats["output_dirs_removed"].append(job_dir_name)
                        except Exception as e:
                            stats["errors"].append(f"Error removing {job_dir_path}: {e}")
                    else:
                        stats["output_dirs_removed"].append(job_dir_name)

        except Exception as e:
            stats["errors"].append(f"Error processing output directory {base_output_dir}: {e}")

    # Clean up filesystem - upload directories (if provided)
    if base_upload_dir and os.path.exists(base_upload_dir):
        try:
            for job_dir_name in os.listdir(base_upload_dir):
                job_dir_path = os.path.join(base_upload_dir, job_dir_name)

                if not os.path.isdir(job_dir_path):
                    continue

                # Check directory creation time
                dir_mtime = os.path.getmtime(job_dir_path)

                if dir_mtime < cutoff_time:
                    # Calculate space before deletion
                    try:
                        total_size = sum(
                            os.path.getsize(os.path.join(dirpath, filename))
                            for dirpath, _, filenames in os.walk(job_dir_path)
                            for filename in filenames
                        )
                        stats["space_freed_mb"] += total_size / (1024 * 1024)
                    except Exception as e:
                        stats["errors"].append(f"Error calculating size for {job_dir_name}: {e}")

                    # Remove directory
                    if not dry_run:
                        try:
                            shutil.rmtree(job_dir_path)
                            stats["upload_dirs_removed"].append(job_dir_name)
                        except Exception as e:
                            stats["errors"].append(f"Error removing {job_dir_path}: {e}")
                    else:
                        stats["upload_dirs_removed"].append(job_dir_name)

        except Exception as e:
            stats["errors"].append(f"Error processing upload directory {base_upload_dir}: {e}")

    return stats


def cleanup_temp_output_dirs(base_dir: str, patterns: Optional[List[str]] = None,
                             retention_days: int = JOB_RETENTION_DAYS, dry_run: bool = False) -> Dict:
    """
    Clean up temporary output directories (e.g., omr_output_*, omr_pipeline_test).

    Args:
        base_dir: Base directory to search for temp directories
        patterns: List of glob patterns to match (default: ['omr_output_*', 'omr_pipeline_*'])
        retention_days: Number of days to retain files
        dry_run: If True, only report what would be deleted

    Returns:
        Dictionary with cleanup statistics
    """
    import glob

    if patterns is None:
        patterns = ['omr_output_*', 'omr_pipeline_*']

    cutoff_time = time.time() - (retention_days * 24 * 60 * 60)
    stats = {
        "dirs_cleaned": [],
        "files_removed": 0,
        "space_freed_mb": 0.0,
        "errors": []
    }

    for pattern in patterns:
        full_pattern = os.path.join(base_dir, pattern)

        for dir_path in glob.glob(full_pattern):
            if not os.path.isdir(dir_path):
                continue

            dir_name = os.path.basename(dir_path)
            files_removed = 0

            try:
                for root, dirs, files in os.walk(dir_path):
                    for filename in files:
                        file_path = os.path.join(root, filename)

                        try:
                            file_mtime = os.path.getmtime(file_path)

                            if file_mtime < cutoff_time:
                                file_size = os.path.getsize(file_path)
                                stats["space_freed_mb"] += file_size / (1024 * 1024)

                                if not dry_run:
                                    os.remove(file_path)

                                files_removed += 1

                        except Exception as e:
                            stats["errors"].append(f"Error processing {file_path}: {e}")

                if files_removed > 0:
                    stats["dirs_cleaned"].append({
                        "dir": dir_name,
                        "files_removed": files_removed
                    })
                    stats["files_removed"] += files_removed

            except Exception as e:
                stats["errors"].append(f"Error processing directory {dir_path}: {e}")

    return stats


def validate_file(file_path: str) -> Tuple[bool, str]:
    """Validate input file."""
    if not os.path.exists(file_path):
        return False, "File not found"

    ext = Path(file_path).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        return False, f"Unsupported file type: {ext}"

    return True, ""


def convert_pdf_to_images(pdf_path: str, output_dir: str, dpi: int = 200) -> List[str]:
    """Convert PDF pages to images."""
    from pdf2image import convert_from_path

    # Increase Pillow limit for large pages
    Image.MAX_IMAGE_PIXELS = 300_000_000

    images = convert_from_path(pdf_path, dpi=dpi)
    image_paths = []
    pdf_name = Path(pdf_path).stem

    for i, image in enumerate(images):
        image_path = os.path.join(output_dir, f"{pdf_name}_page_{i+1}.png")
        image.save(image_path, "PNG")
        image_paths.append(image_path)

    return image_paths


def downsample_if_needed(image_path: str, max_pixels: int = MAX_PIXELS) -> str:
    """Downsample image if it exceeds max_pixels."""
    with Image.open(image_path) as img:
        width, height = img.size
        pixels = width * height

        if pixels <= max_pixels:
            return image_path

        # Calculate scale factor
        scale = (max_pixels / pixels) ** 0.5
        new_width = int(width * scale)
        new_height = int(height * scale)

        # Create downsampled image
        downsampled = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Save to new file
        base, ext = os.path.splitext(image_path)
        new_path = f"{base}_downsampled{ext}"
        downsampled.save(new_path, quality=95)

        return new_path


def run_audiveris(image_path: str, output_dir: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Run Audiveris on a single image.

    Returns:
        Tuple of (output_path, error_message)
    """
    cmd = [AUDIVERIS_PATH, "-batch", "-export", "-output", output_dir, image_path]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )

        if result.returncode != 0:
            # Try to extract error from output
            error = "Audiveris processing failed"
            if "No system found" in result.stdout:
                error = "Could not detect music notation in this image"
            elif "Too large image" in result.stdout:
                error = "Image too large for processing"
            return None, error

        # Find output file
        input_basename = Path(image_path).stem
        for ext in ['.mxl', '.musicxml']:
            output_path = os.path.join(output_dir, f"{input_basename}{ext}")
            if os.path.exists(output_path):
                return output_path, None

        # Search more broadly
        import glob
        for ext in ['*.mxl', '*.musicxml']:
            pattern = os.path.join(output_dir, "**", ext)
            files = glob.glob(pattern, recursive=True)
            if files:
                return max(files, key=os.path.getmtime), None

        return None, "No MusicXML output generated"

    except subprocess.TimeoutExpired:
        return None, "Processing timeout (10 minutes)"
    except FileNotFoundError:
        return None, "Audiveris not installed"
    except Exception as e:
        return None, str(e)


def process_omr(job: OMRJob) -> None:
    """
    Process OMR job in background thread.

    Updates job status as it progresses.
    """
    try:
        job.status = "processing"
        job.progress = "Validating input..."

        # Validate input
        valid, error = validate_file(job.input_path)
        if not valid:
            job.status = "failed"
            job.error = error
            return

        # Create temp directory for processing
        temp_dir = tempfile.mkdtemp(prefix="omr_")
        mxl_output_dir = os.path.join(job.output_dir, "mxl")
        os.makedirs(mxl_output_dir, exist_ok=True)

        try:
            # Get images to process
            ext = Path(job.input_path).suffix.lower()
            images_to_process = []

            if ext == '.pdf':
                job.progress = "Converting PDF to images..."
                images_to_process = convert_pdf_to_images(
                    job.input_path, temp_dir, dpi=200
                )
            else:
                # Copy image to temp dir
                temp_image = os.path.join(temp_dir, os.path.basename(job.input_path))
                shutil.copy2(job.input_path, temp_image)
                images_to_process = [temp_image]

            job.pages_total = len(images_to_process)
            job.progress = f"Processing {job.pages_total} page(s)..."

            # Process each image
            mxl_files = []
            compositions = []
            failed_pages = []

            for i, image_path in enumerate(images_to_process):
                job.progress = f"Processing page {i+1} of {job.pages_total}..."

                # Downsample if needed
                processing_path = downsample_if_needed(image_path)

                # Run Audiveris
                mxl_path, error = run_audiveris(processing_path, mxl_output_dir)

                # Clean up downsampled file
                if processing_path != image_path and os.path.exists(processing_path):
                    os.remove(processing_path)

                if mxl_path:
                    mxl_files.append(mxl_path)
                    # Convert to TabComposition
                    try:
                        comp = convert_musicxml_to_tab(mxl_path)
                        compositions.append(comp)
                    except Exception as e:
                        # Log but continue with other pages
                        print(f"Warning: Failed to convert {mxl_path}: {e}")
                        failed_pages.append(i + 1)
                else:
                    # Audiveris failed for this page
                    failed_pages.append(i + 1)
                    print(f"Warning: Audiveris failed for page {i+1}: {error}")

                job.pages_completed = i + 1

            # Check if we got any results
            if not compositions:
                job.status = "failed"
                job.error = "No music notation could be recognized in the uploaded file"
                return

            # Merge compositions from all pages
            job.progress = "Merging pages..."
            merged = merge_compositions(compositions)

            # Use original filename as title (remove any _page_N suffix)
            original_name = Path(job.input_path).stem
            # Remove _page_N suffix pattern if present
            clean_title = re.sub(r'_page_\d+$', '', merged["title"])
            if clean_title == "Untitled" or clean_title != merged["title"]:
                merged["title"] = original_name

            # Add processing stats
            merged["_processing"] = {
                "pages_total": job.pages_total,
                "pages_processed": len(compositions),
                "failed_pages": failed_pages
            }

            # Save result
            result_path = os.path.join(job.output_dir, "composition.json")
            with open(result_path, 'w') as f:
                json.dump(merged, f, indent=2)

            job.result = merged
            job.status = "completed"
            job.progress = "Done"

        finally:
            # Clean up temp directory
            shutil.rmtree(temp_dir, ignore_errors=True)

    except Exception as e:
        job.status = "failed"
        job.error = str(e)


def start_omr_job(input_path: str, output_dir: str) -> OMRJob:
    """
    Start an OMR processing job in background.

    Args:
        input_path: Path to input PDF or image
        output_dir: Directory to store output

    Returns:
        OMRJob object for tracking progress
    """
    os.makedirs(output_dir, exist_ok=True)

    job = create_job(input_path, output_dir)

    # Start processing in background thread
    thread = Thread(target=process_omr, args=(job,))
    thread.daemon = True
    thread.start()

    return job


def process_omr_sync(input_path: str, output_dir: str) -> Dict:
    """
    Process OMR synchronously (blocking).

    Args:
        input_path: Path to input PDF or image
        output_dir: Directory to store output

    Returns:
        TabComposition dictionary or raises exception
    """
    os.makedirs(output_dir, exist_ok=True)

    job = create_job(input_path, output_dir)
    process_omr(job)

    if job.status == "failed":
        raise Exception(job.error)

    return job.result


# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Run OMR pipeline on PDF or image file"
    )
    parser.add_argument("input", help="Input PDF or image file")
    parser.add_argument("-o", "--output", default="./omr_pipeline_output",
                        help="Output directory")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Show detailed progress")

    args = parser.parse_args()

    print(f"Input: {args.input}")
    print(f"Output: {args.output}")
    print()

    try:
        # Use sync processing for CLI
        result = process_omr_sync(args.input, args.output)

        print(f"\n✓ Success!")
        print(f"  Title: {result['title']}")
        print(f"  Tempo: {result['tempo']} BPM")
        print(f"  Time Signature: {result['timeSignature']}")
        print(f"  Measures: {len(result['measures'])}")

        total_notes = sum(len(m['events']) for m in result['measures'])
        print(f"  Total Notes: {total_notes}")

        result_path = os.path.join(args.output, "composition.json")
        print(f"\n  Saved to: {result_path}")

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        exit(1)
