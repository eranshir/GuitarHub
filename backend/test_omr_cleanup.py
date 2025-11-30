#!/usr/bin/env python3
"""
Test suite for OMR cleanup functionality.

Run with: pytest test_omr_cleanup.py -v
Or: python test_omr_cleanup.py
"""

import os
import shutil
import tempfile
import time
from pathlib import Path

from omr_pipeline import cleanup_old_jobs, cleanup_temp_output_dirs, OMRJob, _jobs


def test_cleanup_old_jobs_memory():
    """Test that old jobs are removed from memory."""
    # Clear existing jobs
    _jobs.clear()

    # Create test directories
    test_output_dir = tempfile.mkdtemp(prefix="test_omr_output_")
    test_upload_dir = tempfile.mkdtemp(prefix="test_omr_upload_")

    try:
        # Create some test jobs
        old_job = OMRJob("old_job", "input.pdf", test_output_dir)
        old_job.created_at = time.time() - (8 * 24 * 60 * 60)  # 8 days ago
        _jobs["old_job"] = old_job

        recent_job = OMRJob("recent_job", "input.pdf", test_output_dir)
        recent_job.created_at = time.time() - (3 * 24 * 60 * 60)  # 3 days ago
        _jobs["recent_job"] = recent_job

        # Run cleanup with 7-day retention
        stats = cleanup_old_jobs(
            base_output_dir=test_output_dir,
            base_upload_dir=test_upload_dir,
            retention_days=7,
            dry_run=False
        )

        # Verify old job was removed
        assert stats["memory_jobs_removed"] == 1
        assert "old_job" not in _jobs
        assert "recent_job" in _jobs

        print("✓ Memory cleanup test passed")

    finally:
        # Cleanup
        _jobs.clear()
        shutil.rmtree(test_output_dir, ignore_errors=True)
        shutil.rmtree(test_upload_dir, ignore_errors=True)


def test_cleanup_old_jobs_filesystem():
    """Test that old job directories are removed from filesystem."""
    test_output_dir = tempfile.mkdtemp(prefix="test_omr_output_")
    test_upload_dir = tempfile.mkdtemp(prefix="test_omr_upload_")

    try:
        # Create test job directories
        old_job_dir = os.path.join(test_output_dir, "old_job_dir")
        os.makedirs(old_job_dir)
        Path(os.path.join(old_job_dir, "test.json")).write_text("{}")

        recent_job_dir = os.path.join(test_output_dir, "recent_job_dir")
        os.makedirs(recent_job_dir)
        Path(os.path.join(recent_job_dir, "test.json")).write_text("{}")

        # Set modification times
        old_time = time.time() - (8 * 24 * 60 * 60)  # 8 days ago
        os.utime(old_job_dir, (old_time, old_time))

        # Run cleanup
        stats = cleanup_old_jobs(
            base_output_dir=test_output_dir,
            base_upload_dir=test_upload_dir,
            retention_days=7,
            dry_run=False
        )

        # Verify old directory was removed
        assert not os.path.exists(old_job_dir)
        assert os.path.exists(recent_job_dir)
        assert len(stats["output_dirs_removed"]) == 1
        assert stats["space_freed_mb"] > 0

        print("✓ Filesystem cleanup test passed")

    finally:
        shutil.rmtree(test_output_dir, ignore_errors=True)
        shutil.rmtree(test_upload_dir, ignore_errors=True)


def test_cleanup_dry_run():
    """Test that dry run mode doesn't delete anything."""
    test_output_dir = tempfile.mkdtemp(prefix="test_omr_output_")

    try:
        # Create test job directory
        old_job_dir = os.path.join(test_output_dir, "old_job")
        os.makedirs(old_job_dir)
        Path(os.path.join(old_job_dir, "test.json")).write_text("{}")

        # Set old modification time
        old_time = time.time() - (8 * 24 * 60 * 60)
        os.utime(old_job_dir, (old_time, old_time))

        # Run dry run cleanup
        stats = cleanup_old_jobs(
            base_output_dir=test_output_dir,
            retention_days=7,
            dry_run=True
        )

        # Verify directory still exists
        assert os.path.exists(old_job_dir)
        assert len(stats["output_dirs_removed"]) == 1  # Reported but not deleted

        print("✓ Dry run test passed")

    finally:
        shutil.rmtree(test_output_dir, ignore_errors=True)


def test_cleanup_temp_output_dirs():
    """Test cleanup of temporary output directories."""
    test_base_dir = tempfile.mkdtemp(prefix="test_backend_")

    try:
        # Create test temp directories
        temp_dir1 = os.path.join(test_base_dir, "omr_output_test1")
        os.makedirs(temp_dir1)

        temp_dir2 = os.path.join(test_base_dir, "omr_pipeline_test1")
        os.makedirs(temp_dir2)

        # Create old and new files
        old_file = os.path.join(temp_dir1, "old_file.txt")
        Path(old_file).write_text("old data")
        old_time = time.time() - (8 * 24 * 60 * 60)
        os.utime(old_file, (old_time, old_time))

        new_file = os.path.join(temp_dir1, "new_file.txt")
        Path(new_file).write_text("new data")

        old_file2 = os.path.join(temp_dir2, "old_file2.txt")
        Path(old_file2).write_text("old data 2")
        os.utime(old_file2, (old_time, old_time))

        # Run cleanup
        stats = cleanup_temp_output_dirs(
            base_dir=test_base_dir,
            retention_days=7,
            dry_run=False
        )

        # Verify old files removed, new files kept
        assert not os.path.exists(old_file)
        assert not os.path.exists(old_file2)
        assert os.path.exists(new_file)
        assert stats["files_removed"] == 2
        assert len(stats["dirs_cleaned"]) == 2

        print("✓ Temp directory cleanup test passed")

    finally:
        shutil.rmtree(test_base_dir, ignore_errors=True)


def test_cleanup_with_errors():
    """Test that cleanup handles errors gracefully."""
    # Try to clean up non-existent directory
    stats = cleanup_old_jobs(
        base_output_dir="/nonexistent/path",
        retention_days=7,
        dry_run=False
    )

    # Should complete without crashing
    assert stats["memory_jobs_removed"] >= 0
    print("✓ Error handling test passed")


if __name__ == "__main__":
    print("Running OMR Cleanup Tests...")
    print("=" * 60)

    try:
        test_cleanup_old_jobs_memory()
        test_cleanup_old_jobs_filesystem()
        test_cleanup_dry_run()
        test_cleanup_temp_output_dirs()
        test_cleanup_with_errors()

        print("=" * 60)
        print("All tests passed! ✓")

    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
