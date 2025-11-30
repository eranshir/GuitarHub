#!/usr/bin/env python3
"""
CLI tool for cleaning up old OMR jobs and temporary files.

Usage:
    python omr_cleanup.py [--retention-days N] [--dry-run]
"""

import argparse
import json
import os
import sys
from omr_pipeline import cleanup_old_jobs, cleanup_temp_output_dirs


def main():
    parser = argparse.ArgumentParser(
        description="Clean up old OMR jobs and temporary files"
    )
    parser.add_argument(
        "--retention-days",
        type=int,
        default=7,
        help="Number of days to retain jobs (default: 7)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )

    args = parser.parse_args()

    # Get directories
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    omr_output_dir = os.path.join(backend_dir, 'omr_jobs')
    uploads_dir = os.path.join(backend_dir, 'uploads')

    if not args.json:
        print("=" * 60)
        print("OMR Job Cleanup")
        print("=" * 60)
        print(f"Retention days: {args.retention_days}")
        print(f"Dry run: {args.dry_run}")
        print()

    # Run cleanup
    job_stats = cleanup_old_jobs(
        base_output_dir=omr_output_dir,
        base_upload_dir=uploads_dir,
        retention_days=args.retention_days,
        dry_run=args.dry_run
    )

    temp_stats = cleanup_temp_output_dirs(
        base_dir=backend_dir,
        retention_days=args.retention_days,
        dry_run=args.dry_run
    )

    # Calculate totals
    total_space = job_stats.get("space_freed_mb", 0) + temp_stats.get("space_freed_mb", 0)
    total_jobs = job_stats.get("memory_jobs_removed", 0)
    total_dirs = len(job_stats.get("output_dirs_removed", [])) + len(job_stats.get("upload_dirs_removed", []))
    total_files = temp_stats.get("files_removed", 0)
    all_errors = job_stats.get("errors", []) + temp_stats.get("errors", [])

    # Output results
    if args.json:
        result = {
            "job_cleanup": job_stats,
            "temp_cleanup": temp_stats,
            "totals": {
                "memory_jobs_removed": total_jobs,
                "directories_removed": total_dirs,
                "files_removed": total_files,
                "space_freed_mb": round(total_space, 2)
            },
            "errors": all_errors,
            "dry_run": args.dry_run
        }
        print(json.dumps(result, indent=2))
    else:
        print("Job Cleanup:")
        print(f"  Memory jobs removed: {total_jobs}")
        print(f"  Output directories: {len(job_stats.get('output_dirs_removed', []))}")
        print(f"  Upload directories: {len(job_stats.get('upload_dirs_removed', []))}")
        print(f"  Space freed: {job_stats.get('space_freed_mb', 0):.2f} MB")
        print()

        print("Temp File Cleanup:")
        print(f"  Directories cleaned: {len(temp_stats.get('dirs_cleaned', []))}")
        for dir_info in temp_stats.get('dirs_cleaned', []):
            print(f"    - {dir_info['dir']}: {dir_info['files_removed']} files")
        print(f"  Total files removed: {total_files}")
        print(f"  Space freed: {temp_stats.get('space_freed_mb', 0):.2f} MB")
        print()

        print("=" * 60)
        print(f"Total space freed: {total_space:.2f} MB")
        print("=" * 60)

        if all_errors:
            print()
            print("Errors encountered:")
            for error in all_errors:
                print(f"  - {error}")

        if args.dry_run:
            print()
            print("This was a dry run. No files were actually deleted.")
            print("Run without --dry-run to perform the cleanup.")

    # Exit with error code if there were errors
    sys.exit(1 if all_errors else 0)


if __name__ == "__main__":
    main()
