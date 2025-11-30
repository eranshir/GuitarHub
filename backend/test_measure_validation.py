#!/usr/bin/env python3
"""
Test suite for measure beat count validation.

This test validates that the musicxml_to_tab converter properly detects
measures with incorrect beat counts.
"""

import sys
from musicxml_to_tab import (
    parse_time_signature,
    calculate_measure_duration,
    get_measure_event_extent
)


def test_parse_time_signature():
    """Test time signature parsing."""
    print("Testing parse_time_signature...")

    tests = [
        ("4/4", (4, 4)),
        ("3/4", (3, 4)),
        ("6/8", (6, 8)),
        ("2/2", (2, 2)),
        ("invalid", (4, 4)),  # Default fallback
    ]

    for time_sig, expected in tests:
        result = parse_time_signature(time_sig)
        assert result == expected, f"Failed: {time_sig} -> {result}, expected {expected}"
        print(f"  ✓ {time_sig} -> {result}")

    print("  All tests passed!\n")


def test_calculate_measure_duration():
    """Test measure duration calculation."""
    print("Testing calculate_measure_duration...")

    tests = [
        ("4/4", 1.0),   # 4 quarter notes = 1 whole note
        ("3/4", 0.75),  # 3 quarter notes = 0.75 whole notes
        ("6/8", 0.75),  # 6 eighth notes = 0.75 whole notes
        ("2/2", 1.0),   # 2 half notes = 1 whole note
        ("2/4", 0.5),   # 2 quarter notes = 0.5 whole notes
    ]

    for time_sig, expected in tests:
        result = calculate_measure_duration(time_sig)
        assert abs(result - expected) < 0.001, f"Failed: {time_sig} -> {result}, expected {expected}"
        print(f"  ✓ {time_sig} = {result} whole notes")

    print("  All tests passed!\n")


def test_get_measure_event_extent():
    """Test measure event extent calculation."""
    print("Testing get_measure_event_extent...")

    # Test empty measure
    measure = {"events": []}
    extent = get_measure_event_extent(measure)
    assert extent == 0.0, f"Empty measure should have extent 0.0, got {extent}"
    print("  ✓ Empty measure = 0.0")

    # Test measure with single quarter note
    measure = {
        "events": [
            {"time": 0.0, "duration": 0.25, "string": 1, "fret": 0}
        ]
    }
    extent = get_measure_event_extent(measure)
    assert abs(extent - 0.25) < 0.001, f"Expected 0.25, got {extent}"
    print("  ✓ Single quarter note = 0.25")

    # Test measure with multiple notes (full 4/4 measure)
    measure = {
        "events": [
            {"time": 0.0, "duration": 0.25, "string": 1, "fret": 0},
            {"time": 0.25, "duration": 0.25, "string": 2, "fret": 1},
            {"time": 0.5, "duration": 0.25, "string": 3, "fret": 2},
            {"time": 0.75, "duration": 0.25, "string": 4, "fret": 3},
        ]
    }
    extent = get_measure_event_extent(measure)
    assert abs(extent - 1.0) < 0.001, f"Expected 1.0, got {extent}"
    print("  ✓ Full 4/4 measure = 1.0")

    # Test measure with half the beats (2/4 worth of notes in 4/4 measure)
    measure = {
        "events": [
            {"time": 0.0, "duration": 0.25, "string": 1, "fret": 0},
            {"time": 0.25, "duration": 0.25, "string": 2, "fret": 1},
        ]
    }
    extent = get_measure_event_extent(measure)
    assert abs(extent - 0.5) < 0.001, f"Expected 0.5, got {extent}"
    print("  ✓ Half measure (2/4) = 0.5")

    # Test measure with overlapping notes (chord)
    measure = {
        "events": [
            {"time": 0.0, "duration": 1.0, "string": 1, "fret": 0},
            {"time": 0.0, "duration": 1.0, "string": 2, "fret": 1},
            {"time": 0.0, "duration": 1.0, "string": 3, "fret": 2},
        ]
    }
    extent = get_measure_event_extent(measure)
    assert abs(extent - 1.0) < 0.001, f"Expected 1.0, got {extent}"
    print("  ✓ Chord (whole notes) = 1.0")

    print("  All tests passed!\n")


def test_validation_scenarios():
    """Test realistic validation scenarios."""
    print("Testing validation scenarios...")

    # Scenario 1: Valid 4/4 measure
    time_sig = "4/4"
    expected = calculate_measure_duration(time_sig)
    measure = {
        "events": [
            {"time": 0.0, "duration": 0.25, "string": 1, "fret": 0},
            {"time": 0.25, "duration": 0.25, "string": 2, "fret": 1},
            {"time": 0.5, "duration": 0.25, "string": 3, "fret": 2},
            {"time": 0.75, "duration": 0.25, "string": 4, "fret": 3},
        ]
    }
    actual = get_measure_event_extent(measure)
    is_valid = abs(actual - expected) < 0.01
    print(f"  ✓ Valid 4/4 measure: expected={expected}, actual={actual}, valid={is_valid}")
    assert is_valid

    # Scenario 2: Invalid 4/4 measure (only 2 beats)
    measure = {
        "events": [
            {"time": 0.0, "duration": 0.25, "string": 1, "fret": 0},
            {"time": 0.25, "duration": 0.25, "string": 2, "fret": 1},
        ]
    }
    actual = get_measure_event_extent(measure)
    is_valid = abs(actual - expected) < 0.01
    print(f"  ✓ Invalid 4/4 measure (2 beats): expected={expected}, actual={actual}, valid={is_valid}")
    assert not is_valid

    # Scenario 3: Valid 3/4 measure
    time_sig = "3/4"
    expected = calculate_measure_duration(time_sig)
    measure = {
        "events": [
            {"time": 0.0, "duration": 0.25, "string": 1, "fret": 0},
            {"time": 0.25, "duration": 0.25, "string": 2, "fret": 1},
            {"time": 0.5, "duration": 0.25, "string": 3, "fret": 2},
        ]
    }
    actual = get_measure_event_extent(measure)
    is_valid = abs(actual - expected) < 0.01
    print(f"  ✓ Valid 3/4 measure: expected={expected}, actual={actual}, valid={is_valid}")
    assert is_valid

    print("  All tests passed!\n")


if __name__ == "__main__":
    print("=" * 60)
    print("Measure Beat Count Validation Tests")
    print("=" * 60)
    print()

    try:
        test_parse_time_signature()
        test_calculate_measure_duration()
        test_get_measure_event_extent()
        test_validation_scenarios()

        print("=" * 60)
        print("All tests passed! ✓")
        print("=" * 60)
        sys.exit(0)

    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
