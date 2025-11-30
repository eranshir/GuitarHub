# Measure Beat Count Validation Fix

## Issue: guitarHub-u22
**Problem:** Measures sometimes have incorrect beat count (e.g., 2/4 in 4/4 sheet)

## Root Cause Analysis

The `musicxml_to_tab.py` converter was processing MusicXML files and creating TabComposition JSON, but it wasn't validating that the actual duration of events in each measure matched the expected duration based on the time signature.

### Why This Happens

1. **MusicXML Complexity**: MusicXML files can have:
   - `<forward>` elements (move time forward without a note)
   - `<backup>` elements (move time backward)
   - Incomplete measures (especially at the end of pieces)
   - Errors from OMR (Optical Music Recognition) tools like Audiveris

2. **No Validation**: The original code tracked `current_time` within measures but never checked if the final measure duration matched the time signature.

3. **Silent Failures**: These issues would go unnoticed until a user tried to play or edit the composition.

## Solution Implemented

Added comprehensive validation to detect and report measures with incorrect beat counts:

### New Functions Added

1. **`parse_time_signature(time_sig: str) -> tuple[int, int]`**
   - Parses time signature strings like "4/4" or "3/4"
   - Returns (beats, beat_type) tuple
   - Example: "4/4" → (4, 4), "3/4" → (3, 4)

2. **`calculate_measure_duration(time_sig: str) -> float`**
   - Calculates expected measure duration in whole notes
   - Formula: `beats / beat_type`
   - Examples:
     - "4/4" → 1.0 (4 quarter notes = 1 whole note)
     - "3/4" → 0.75 (3 quarter notes = 0.75 whole notes)
     - "6/8" → 0.75 (6 eighth notes = 0.75 whole notes)

3. **`get_measure_event_extent(measure: Dict) -> float`**
   - Calculates the actual duration covered by events in a measure
   - Returns the maximum (time + duration) from all events
   - Handles overlapping events (chords) correctly

### Validation Logic

For each measure, the converter now:

1. Calculates the expected duration based on the time signature
2. Calculates the actual extent of events in the measure
3. Compares them with a tolerance of 0.01 whole notes (to handle floating-point errors)
4. If they don't match:
   - Adds a `_warnings` array to the measure with detailed information
   - Logs a warning to stderr for debugging
   - Includes the warning in the composition's `_validation` metadata

### Output Format

Measures with issues now include:

```json
{
  "timeSignature": "4/4",
  "events": [...],
  "chords": [...],
  "_warnings": [
    {
      "type": "incorrect_beat_count",
      "message": "Measure has 2.00 beats but time signature expects 4",
      "expected_duration": 1.0,
      "actual_duration": 0.5,
      "time_signature": "4/4"
    }
  ]
}
```

The composition includes a summary:

```json
{
  "title": "...",
  "measures": [...],
  "_validation": {
    "has_issues": true,
    "issue_count": 2,
    "issues": [
      {
        "measure_number": 3,
        "type": "incorrect_beat_count",
        "message": "Measure has 2.00 beats but time signature expects 4",
        "expected_duration": 1.0,
        "actual_duration": 0.5,
        "time_signature": "4/4"
      }
    ]
  }
}
```

## Testing

Created comprehensive test suite in `test_measure_validation.py`:

- ✓ Time signature parsing (4/4, 3/4, 6/8, 2/2, invalid inputs)
- ✓ Measure duration calculation for various time signatures
- ✓ Event extent calculation (empty measures, single notes, full measures, chords)
- ✓ Validation scenarios (valid and invalid measures)

All tests pass successfully.

## Files Modified

1. `/Users/eranshir/Documents/Projects/guitarHub/backend/musicxml_to_tab.py`
   - Added 3 new helper functions
   - Added validation logic to measure processing
   - Added validation summary to composition output

2. `/Users/eranshir/Documents/Projects/guitarHub/backend/test_measure_validation.py`
   - New test file with comprehensive unit tests

## Related Issues

This fix is related to **guitarHub-mq9** ("Can't add notes to last measure or they don't render"). The last measure is often where beat count issues appear because:

1. OMR tools sometimes fail to recognize the final measure completely
2. PDF page breaks can cause incomplete measures
3. The validation now makes these issues visible

## Next Steps

1. **For Frontend/Backend Integration**: Check for `_validation.has_issues` in the composition and display warnings to users
2. **For OMR Pipeline**: Consider adding automatic fixing logic (e.g., padding measures with rests)
3. **For guitarHub-mq9**: Investigate if rendering issues are related to these validation warnings

## Usage

The validation runs automatically when converting MusicXML files:

```python
from musicxml_to_tab import convert_musicxml_to_tab

composition = convert_musicxml_to_tab("sheet.mxl")

# Check for validation issues
if "_validation" in composition and composition["_validation"]["has_issues"]:
    print(f"Found {composition['_validation']['issue_count']} validation issues:")
    for issue in composition["_validation"]["issues"]:
        print(f"  - Measure {issue['measure_number']}: {issue['message']}")
```

## Impact

- **Non-breaking**: Existing code continues to work; validation metadata is optional
- **Diagnostic**: Makes hidden issues visible for debugging
- **Foundation**: Provides building blocks for automatic fixing in the future
