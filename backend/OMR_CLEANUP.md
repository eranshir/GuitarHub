# OMR Job Cleanup Mechanism

## Overview

The OMR (Optical Music Recognition) cleanup mechanism automatically manages old job data and temporary files to prevent disk space accumulation. It removes jobs older than a configurable retention period (default: 7 days) from both memory and the filesystem.

## Features

- **Memory Cleanup**: Removes old jobs from the in-memory `_jobs` dictionary
- **Job Directory Cleanup**: Removes job output directories from `omr_jobs/`
- **Upload Directory Cleanup**: Removes uploaded files from `uploads/`
- **Temporary File Cleanup**: Cleans up temporary output directories (e.g., `omr_output_*`, `omr_pipeline_*`)
- **Dry Run Mode**: Preview what would be deleted without actually deleting
- **Automatic Startup Cleanup**: Runs automatically when the server starts
- **Manual Cleanup**: CLI tool and API endpoint for on-demand cleanup

## Configuration

### Retention Period

The default retention period is **7 days**. This is defined in `/Users/eranshir/Documents/Projects/guitarHub/backend/omr_pipeline.py`:

```python
JOB_RETENTION_DAYS = 7  # Keep jobs for 7 days
```

You can override this when calling cleanup functions or using the API/CLI.

## Usage

### 1. Automatic Cleanup (Server Startup)

The cleanup runs automatically every time the server starts. It will:
- Remove jobs older than 7 days from memory
- Delete job directories older than 7 days
- Clean up temporary files older than 7 days
- Report the cleanup results in the console

Example output:
```
Running OMR job cleanup on startup...
  Removed 3 job(s) from memory
  Cleaned 6 job directory(ies)
  Removed 75 temporary file(s)
  Freed 7.63 MB
```

### 2. CLI Tool

Use the `omr_cleanup.py` script for manual cleanup:

```bash
# Dry run (preview what would be deleted)
python omr_cleanup.py --dry-run

# Actual cleanup with default retention (7 days)
python omr_cleanup.py

# Custom retention period
python omr_cleanup.py --retention-days 14

# JSON output
python omr_cleanup.py --json

# Cleanup everything (retention 0 days)
python omr_cleanup.py --retention-days 0
```

Options:
- `--retention-days N`: Number of days to retain jobs (default: 7)
- `--dry-run`: Show what would be deleted without actually deleting
- `--json`: Output results as JSON

### 3. API Endpoint

Use the REST API for programmatic cleanup:

**Endpoint**: `POST /api/omr/cleanup`

**Query Parameters**:
- `dry_run` (bool, default: false): Preview mode
- `retention_days` (int, default: 7): Retention period

**Example Requests**:

```bash
# Dry run
curl -X POST "http://localhost:5000/api/omr/cleanup?dry_run=true"

# Actual cleanup with custom retention
curl -X POST "http://localhost:5000/api/omr/cleanup?retention_days=14"

# Default cleanup (7 days)
curl -X POST "http://localhost:5000/api/omr/cleanup"
```

**Response Format**:

```json
{
  "job_cleanup": {
    "memory_jobs_removed": 3,
    "output_dirs_removed": ["job1", "job2"],
    "upload_dirs_removed": ["job1", "job2"],
    "space_freed_mb": 4.1
  },
  "temp_cleanup": {
    "dirs_cleaned": [
      {
        "dir": "omr_output_audiveris",
        "files_removed": 29
      }
    ],
    "files_removed": 75,
    "space_freed_mb": 3.53
  },
  "total_space_freed_mb": 7.63,
  "errors": [],
  "dry_run": false
}
```

## Implementation Details

### Functions in `omr_pipeline.py`

#### `cleanup_old_jobs(base_output_dir, base_upload_dir, retention_days, dry_run)`

Cleans up old job directories and removes jobs from memory.

**Parameters**:
- `base_output_dir` (str): Path to `omr_jobs` directory
- `base_upload_dir` (str, optional): Path to `uploads` directory
- `retention_days` (int): Number of days to retain jobs
- `dry_run` (bool): If True, only report what would be deleted

**Returns**: Dictionary with cleanup statistics

#### `cleanup_temp_output_dirs(base_dir, patterns, retention_days, dry_run)`

Cleans up temporary output directories matching specific patterns.

**Parameters**:
- `base_dir` (str): Base directory to search (usually backend directory)
- `patterns` (list, optional): Glob patterns to match (default: `['omr_output_*', 'omr_pipeline_*']`)
- `retention_days` (int): Number of days to retain files
- `dry_run` (bool): If True, only report what would be deleted

**Returns**: Dictionary with cleanup statistics

### Cleanup Targets

1. **Job Output Directories** (`omr_jobs/{job_id}/`)
   - Contains: `composition.json`, `mxl/` subdirectory with MusicXML files
   - Removed when: Directory modification time > retention_days

2. **Upload Directories** (`uploads/{job_id}/`)
   - Contains: Original uploaded PDF/image files
   - Removed when: Directory modification time > retention_days

3. **Temporary Output Directories**
   - `omr_output_*` (e.g., `omr_output_audiveris`, `omr_output_imagine`)
   - `omr_pipeline_*` (e.g., `omr_pipeline_test`)
   - Removed when: File modification time > retention_days

4. **In-Memory Jobs** (`_jobs` dictionary)
   - Removed when: Job `created_at` timestamp > retention_days

## Scheduling

For production deployments, consider setting up scheduled cleanup:

### Cron Job (Linux/macOS)

Add to crontab (`crontab -e`):

```cron
# Run cleanup daily at 3 AM
0 3 * * * cd /path/to/backend && python3 omr_cleanup.py >> /var/log/omr_cleanup.log 2>&1
```

### systemd Timer (Linux)

Create `/etc/systemd/system/omr-cleanup.service`:

```ini
[Unit]
Description=OMR Job Cleanup

[Service]
Type=oneshot
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/python3 omr_cleanup.py
User=www-data
```

Create `/etc/systemd/system/omr-cleanup.timer`:

```ini
[Unit]
Description=Run OMR cleanup daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable omr-cleanup.timer
sudo systemctl start omr-cleanup.timer
```

## Troubleshooting

### Cleanup Not Working

1. Check file permissions - ensure the server process can delete files
2. Check if directories are being created with correct timestamps
3. Run with `--dry-run` to see what would be deleted
4. Check for errors in the cleanup response/output

### Disk Space Still Full

1. Check for large temporary directories not covered by patterns
2. Verify retention period is appropriate
3. Check for orphaned processes holding file handles
4. Consider reducing retention period or adding more cleanup patterns

### Permission Errors

If you see permission errors:
```bash
# Fix permissions on job directories
chmod -R u+w backend/omr_jobs backend/uploads backend/omr_output_*
```

## Monitoring

Track cleanup effectiveness:

```bash
# Check disk usage before cleanup
du -sh backend/omr_jobs backend/uploads backend/omr_output_*

# Run cleanup
python omr_cleanup.py --json > cleanup_stats.json

# Check disk usage after
du -sh backend/omr_jobs backend/uploads backend/omr_output_*
```

## Future Enhancements

Potential improvements:

1. **Database Persistence**: Store job metadata in SQLite/PostgreSQL instead of memory
2. **Retention Policy**: Different retention periods for completed vs. failed jobs
3. **Archival**: Move old jobs to cold storage instead of deletion
4. **Metrics**: Track cleanup statistics over time
5. **Webhooks**: Notify external systems when cleanup occurs
6. **Selective Cleanup**: Clean up only specific job types or patterns
