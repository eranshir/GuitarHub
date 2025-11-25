#!/usr/bin/env python3
"""
MusicXML to TabComposition Converter

Converts MusicXML files (.mxl or .musicxml) to GuitarHub's TabComposition JSON format.
Uses lowest fret position strategy for pitch-to-TAB conversion.
"""

import json
import os
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional, Tuple
from pathlib import Path


# Standard guitar tuning (string number -> MIDI note number for open string)
# String 1 (high E) = E4 = MIDI 64
# String 2 (B) = B3 = MIDI 59
# String 3 (G) = G3 = MIDI 55
# String 4 (D) = D3 = MIDI 50
# String 5 (A) = A2 = MIDI 45
# String 6 (low E) = E2 = MIDI 40
GUITAR_TUNING = {
    1: 64,  # E4
    2: 59,  # B3
    3: 55,  # G3
    4: 50,  # D3
    5: 45,  # A2
    6: 40,  # E2
}

# Maximum fret number
MAX_FRET = 24

# Note name to semitone offset (C = 0)
NOTE_TO_SEMITONE = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
}


def pitch_to_midi(step: str, octave: int, alter: int = 0) -> int:
    """Convert MusicXML pitch to MIDI note number.

    Standard MIDI: C4 (middle C) = 60
    Note: Audiveris outputs octaves one higher than actual sheet music,
    so we compensate by using octave directly instead of (octave + 1).
    """
    semitone = NOTE_TO_SEMITONE.get(step.upper(), 0) + alter
    return 12 * octave + semitone


def midi_to_guitar_position(midi_note: int, excluded_strings: set = None) -> Optional[Tuple[int, int]]:
    """
    Convert MIDI note to guitar string and fret.
    Uses lowest fret position strategy (prefers open strings).

    Args:
        midi_note: MIDI note number
        excluded_strings: Set of string numbers to exclude (already used in chord)

    Returns:
        Tuple of (string, fret) or None if note is out of guitar range.
    """
    if excluded_strings is None:
        excluded_strings = set()

    best_position = None
    lowest_fret = MAX_FRET + 1

    for string, open_note in GUITAR_TUNING.items():
        if string in excluded_strings:
            continue

        fret = midi_note - open_note

        if 0 <= fret <= MAX_FRET:
            if fret < lowest_fret:
                lowest_fret = fret
                best_position = (string, fret)

    return best_position


def assign_chord_positions(midi_notes: List[int]) -> List[Tuple[int, int, int]]:
    """
    Assign guitar positions to a chord (multiple simultaneous notes).
    Distributes notes across strings: highest pitch on highest string (string 1).

    Args:
        midi_notes: List of MIDI note numbers

    Returns:
        List of (midi_note, string, fret) tuples for playable notes
    """
    if not midi_notes:
        return []

    # Sort by pitch, highest first (will go on string 1, then 2, etc.)
    sorted_notes = sorted(midi_notes, reverse=True)

    positions = []
    used_strings = set()

    for midi_note in sorted_notes:
        position = midi_to_guitar_position(midi_note, used_strings)
        if position:
            string, fret = position
            positions.append((midi_note, string, fret))
            used_strings.add(string)

    return positions


def parse_musicxml_duration(duration_value: int, divisions: int) -> float:
    """
    Convert MusicXML duration to whole note fraction.

    MusicXML uses divisions per quarter note.
    We need whole note fractions (1.0 = whole, 0.25 = quarter, etc.)
    """
    if divisions <= 0:
        divisions = 1

    # duration_value is in divisions
    # divisions = divisions per quarter note
    # So duration in quarter notes = duration_value / divisions
    # And duration in whole notes = duration_in_quarters / 4
    quarter_notes = duration_value / divisions
    whole_notes = quarter_notes / 4.0

    return whole_notes


def parse_mxl_file(mxl_path: str) -> ET.Element:
    """Parse a compressed MusicXML (.mxl) file and return the root element."""
    with zipfile.ZipFile(mxl_path, 'r') as zf:
        # Find the main XML file
        xml_files = [f for f in zf.namelist()
                     if f.endswith('.xml') and not f.startswith('META-INF')]

        if not xml_files:
            raise ValueError("No XML file found in .mxl archive")

        # Usually the main file is listed in container.xml, but for simplicity
        # we'll take the first non-META-INF xml file
        with zf.open(xml_files[0]) as xml_file:
            tree = ET.parse(xml_file)
            return tree.getroot()


def parse_musicxml_file(xml_path: str) -> ET.Element:
    """Parse a MusicXML file (either .mxl or .musicxml)."""
    if xml_path.endswith('.mxl'):
        return parse_mxl_file(xml_path)
    else:
        tree = ET.parse(xml_path)
        return tree.getroot()


def extract_title(root: ET.Element, fallback_filename: str = "Untitled") -> str:
    """Extract title from MusicXML metadata."""
    # Try work-title first
    work_title = root.find('.//work-title')
    if work_title is not None and work_title.text:
        return work_title.text.strip()

    # Try movement-title
    movement_title = root.find('.//movement-title')
    if movement_title is not None and movement_title.text:
        return movement_title.text.strip()

    # Try credit with type="title"
    for credit in root.findall('.//credit'):
        credit_type = credit.find('credit-type')
        if credit_type is not None and credit_type.text == 'title':
            credit_words = credit.find('credit-words')
            if credit_words is not None and credit_words.text:
                return credit_words.text.strip()

    # Use filename as fallback
    return Path(fallback_filename).stem


def extract_tempo(root: ET.Element) -> int:
    """Extract tempo from MusicXML."""
    # Look for sound element with tempo attribute
    for sound in root.findall('.//sound'):
        tempo = sound.get('tempo')
        if tempo:
            try:
                return int(float(tempo))
            except ValueError:
                pass

    # Look for metronome marking
    for metronome in root.findall('.//metronome'):
        per_minute = metronome.find('per-minute')
        if per_minute is not None and per_minute.text:
            try:
                return int(float(per_minute.text))
            except ValueError:
                pass

    # Default tempo
    return 120


def extract_time_signature(measure: ET.Element, default: str = "4/4") -> str:
    """Extract time signature from a measure."""
    attributes = measure.find('attributes')
    if attributes is not None:
        time_elem = attributes.find('time')
        if time_elem is not None:
            beats = time_elem.find('beats')
            beat_type = time_elem.find('beat-type')
            if beats is not None and beat_type is not None:
                return f"{beats.text}/{beat_type.text}"

    return default


def convert_musicxml_to_tab(xml_path: str) -> Dict:
    """
    Convert a MusicXML file to TabComposition JSON format.

    Args:
        xml_path: Path to .mxl or .musicxml file

    Returns:
        Dictionary in TabComposition format
    """
    root = parse_musicxml_file(xml_path)

    # Extract metadata
    title = extract_title(root, xml_path)
    tempo = extract_tempo(root)

    # Get first part only
    parts = root.findall('.//part')
    if not parts:
        raise ValueError("No parts found in MusicXML")

    part = parts[0]  # Take first part only

    # Initialize composition
    composition = {
        "title": title,
        "tempo": tempo,
        "timeSignature": "4/4",
        "measures": [],
        "version": "1.0"
    }

    # Track divisions (may change per measure)
    divisions = 1
    current_time_sig = "4/4"

    # Process each measure
    for measure_elem in part.findall('measure'):
        # Check for new divisions
        attributes = measure_elem.find('attributes')
        if attributes is not None:
            div_elem = attributes.find('divisions')
            if div_elem is not None and div_elem.text:
                divisions = int(div_elem.text)

        # Check for time signature change
        time_sig = extract_time_signature(measure_elem, current_time_sig)
        if composition["measures"] == []:
            # Set initial time signature
            composition["timeSignature"] = time_sig
        current_time_sig = time_sig

        # Create measure
        measure = {
            "timeSignature": time_sig,
            "events": [],
            "chords": []
        }

        # Track time within measure (in whole notes)
        current_time = 0.0

        # Accumulator for chord notes (notes at the same time)
        pending_chord = []  # List of (midi_note, duration)
        chord_time = 0.0

        def flush_chord():
            """Process accumulated chord notes and add to measure events."""
            nonlocal pending_chord
            if not pending_chord:
                return

            # Get MIDI notes and common duration
            midi_notes = [n[0] for n in pending_chord]
            duration = pending_chord[0][1]  # Use first note's duration

            # Assign positions across strings (highest note on highest string)
            positions = assign_chord_positions(midi_notes)

            for midi_note, string, fret in positions:
                event = {
                    "time": chord_time,
                    "string": string,
                    "fret": fret,
                    "duration": duration,
                    "leftFinger": None
                }
                measure["events"].append(event)

            pending_chord = []

        # Process notes and rests
        for elem in measure_elem:
            if elem.tag == 'note':
                # Check if it's a rest
                if elem.find('rest') is not None:
                    # Flush any pending chord before processing rest
                    flush_chord()
                    # Process rest - just advance time
                    duration_elem = elem.find('duration')
                    if duration_elem is not None and duration_elem.text:
                        duration = parse_musicxml_duration(
                            int(duration_elem.text), divisions
                        )
                        current_time += duration
                    continue

                # Check if it's a chord (simultaneous with previous note)
                is_chord = elem.find('chord') is not None

                # If not a chord note, flush any pending chord first
                if not is_chord:
                    flush_chord()
                    chord_time = current_time

                # Get pitch
                pitch_elem = elem.find('pitch')
                if pitch_elem is None:
                    # Unpitched note (percussion) - skip
                    continue

                step = pitch_elem.find('step')
                octave = pitch_elem.find('octave')
                alter = pitch_elem.find('alter')

                if step is None or octave is None:
                    continue

                step_val = step.text
                octave_val = int(octave.text)
                alter_val = int(alter.text) if alter is not None and alter.text else 0

                # Convert to MIDI
                midi_note = pitch_to_midi(step_val, octave_val, alter_val)

                # Get duration
                duration_elem = elem.find('duration')
                if duration_elem is not None and duration_elem.text:
                    duration = parse_musicxml_duration(
                        int(duration_elem.text), divisions
                    )
                else:
                    duration = 0.25  # Default to quarter note

                # Add to pending chord
                pending_chord.append((midi_note, duration))

                # Advance time only for the first note (non-chord notes)
                if not is_chord:
                    current_time += duration

            elif elem.tag == 'harmony':
                # Extract chord symbol
                root_elem = elem.find('root/root-step')
                if root_elem is not None and root_elem.text:
                    chord_name = root_elem.text

                    # Add bass if present
                    root_alter = elem.find('root/root-alter')
                    if root_alter is not None and root_alter.text:
                        alter = int(root_alter.text)
                        if alter == 1:
                            chord_name += '#'
                        elif alter == -1:
                            chord_name += 'b'

                    # Add quality
                    kind = elem.find('kind')
                    if kind is not None and kind.text:
                        kind_text = kind.text
                        if kind_text == 'minor':
                            chord_name += 'm'
                        elif kind_text == 'dominant':
                            chord_name += '7'
                        elif kind_text == 'major-seventh':
                            chord_name += 'maj7'
                        elif kind_text == 'minor-seventh':
                            chord_name += 'm7'
                        # Add more as needed

                    measure["chords"].append({
                        "time": current_time,
                        "name": chord_name
                    })

            elif elem.tag == 'forward':
                # Forward moves time ahead
                flush_chord()  # Flush before forward
                duration_elem = elem.find('duration')
                if duration_elem is not None and duration_elem.text:
                    duration = parse_musicxml_duration(
                        int(duration_elem.text), divisions
                    )
                    current_time += duration

            elif elem.tag == 'backup':
                # Backup moves time back
                flush_chord()  # Flush before backup
                duration_elem = elem.find('duration')
                if duration_elem is not None and duration_elem.text:
                    duration = parse_musicxml_duration(
                        int(duration_elem.text), divisions
                    )
                    current_time = max(0, current_time - duration)

        # Flush any remaining pending chord at end of measure
        flush_chord()

        # Sort events by time
        measure["events"].sort(key=lambda e: (e["time"], e["string"]))

        composition["measures"].append(measure)

    # Ensure at least one measure
    if not composition["measures"]:
        composition["measures"].append({
            "timeSignature": composition["timeSignature"],
            "events": [],
            "chords": []
        })

    return composition


def convert_file(input_path: str, output_path: str = None) -> Dict:
    """
    Convert a MusicXML file and optionally save to JSON.

    Args:
        input_path: Path to input .mxl or .musicxml file
        output_path: Optional path to save JSON output

    Returns:
        TabComposition dictionary
    """
    composition = convert_musicxml_to_tab(input_path)

    if output_path:
        with open(output_path, 'w') as f:
            json.dump(composition, f, indent=2)

    return composition


def merge_compositions(compositions: List[Dict]) -> Dict:
    """
    Merge multiple TabComposition dictionaries (from multiple pages).

    Args:
        compositions: List of TabComposition dictionaries

    Returns:
        Single merged TabComposition
    """
    if not compositions:
        raise ValueError("No compositions to merge")

    if len(compositions) == 1:
        return compositions[0]

    # Use first composition as base
    merged = {
        "title": compositions[0]["title"],
        "tempo": compositions[0]["tempo"],
        "timeSignature": compositions[0]["timeSignature"],
        "measures": [],
        "version": "1.0"
    }

    # Concatenate all measures
    for comp in compositions:
        merged["measures"].extend(comp["measures"])

    return merged


# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Convert MusicXML to GuitarHub TabComposition format"
    )
    parser.add_argument("input", help="Input MusicXML file (.mxl or .musicxml)")
    parser.add_argument("-o", "--output", help="Output JSON file (optional)")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Print composition summary")

    args = parser.parse_args()

    try:
        composition = convert_file(args.input, args.output)

        if args.verbose or not args.output:
            print(f"Title: {composition['title']}")
            print(f"Tempo: {composition['tempo']} BPM")
            print(f"Time Signature: {composition['timeSignature']}")
            print(f"Measures: {len(composition['measures'])}")

            total_notes = sum(
                len(m['events']) for m in composition['measures']
            )
            print(f"Total Notes: {total_notes}")

        if args.output:
            print(f"\nSaved to: {args.output}")
        else:
            # Print JSON to stdout if no output file
            print("\nJSON Output:")
            print(json.dumps(composition, indent=2))

    except Exception as e:
        print(f"Error: {e}")
        exit(1)
