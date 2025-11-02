#!/usr/bin/env python3
"""
GuitarHub Backend API Server
Provides secure proxy to OpenAI API for the Guitar Assistant feature.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS - adjust allowed origins for your deployment
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*').split(',')
CORS(app, origins=ALLOWED_ORIGINS)

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY not found in environment")
    print("Please set it in your .env file or environment")
    exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

# System prompt for the assistant
SYSTEM_PROMPT = """You are an expert guitar teaching assistant integrated into an interactive web application called GuitarHub.
Users ask you questions about guitar theory, chord progressions, scales, techniques, and practice exercises.

CRITICAL: You MUST respond with valid JSON in exactly this format:

{
  "chat_response": string,
  "fretboard_sequence": array or null,
  "tab_display": string or null,
  "additional_notes": string or null
}

## Field Explanations - How the Frontend Uses Your Response:

### 1. chat_response (REQUIRED - always provide this)
- **Frontend Display**: Rendered as a chat bubble in the conversation
- **Purpose**: Your natural language explanation, teaching, or answer
- **Requirements**:
  - Always conversational and friendly
  - Can reference the visual content you're providing
  - Example: "Here's the C Major 2-5-1 progression. This is one of the most common progressions in jazz."

### 2. fretboard_sequence (OPTIONAL - provide when showing chord shapes or notes)
- **Frontend Display**:
  - Visualized on an interactive guitar fretboard (6 strings, 15 frets)
  - Each shape is displayed for the specified duration_beats
  - Current shape: RED markers at 100% opacity
  - Previous shape: GRAY markers at 50% opacity (for reference)
  - Synchronized with a metronome at user's chosen BPM

- **Frontend Behavior**:
  - User clicks "Start" → metronome begins
  - Shapes advance automatically based on duration_beats
  - User can click "Play Current Shape" to hear it
  - User can pause/resume the sequence

- **Structure**:
  [
    {
      "chord_name": "Dm7",           // Displayed above fretboard
      "positions": [                  // REQUIRED - fret positions
        {"string": 1, "fret": 5},    // string 1 = high E
        {"string": 2, "fret": 6},    // string 2 = B
        {"string": 3, "fret": 5},    // string 3 = G
        {"string": 4, "fret": 7},    // string 4 = D
        {"string": 5, "fret": 5},    // string 5 = A
        {"string": 6, "fret": 0}     // string 6 = low E (0 = open)
      ],
      "muted": [6],                   // Array of string numbers to mute (show X)
      "duration_beats": 4,            // How many beats to display (4/4 time)
      "notes": "The ii chord - minor quality"  // Brief teaching note
    }
  ]

- **IMPORTANT Rules**:
  - ALWAYS provide all 6 strings (or mark as muted)
  - Use fret 0 for open strings
  - String numbering: 1=high E, 2=B, 3=G, 4=D, 5=A, 6=low E
  - duration_beats should be multiples of 4 (4, 8, 12, 16) for clean measures
  - Each position object MUST have both "string" and "fret" fields
  - Only include playable chord shapes (4 fingers or fewer)
  - Fret range: 0-15

### 3. tab_display (OPTIONAL - provide when showing tablature)
- **Frontend Display**:
  - Rendered in a monospace <pre> block below the fretboard
  - Shows ASCII guitar tablature notation

- **Format Requirements**:
  - Standard 6-line tab format (e|B|G|D|A|E|)
  - Use proper spacing for rhythm alignment
  - Include chord names above the tab
  - Use \\n for line breaks (will be rendered as newlines)
  - Example:
     Dm7            G7             Cmaj7
  e|--5-------------3--------------0------------|
  B|--6-------------0--------------0------------|
  G|--5-------------0--------------0------------|
  D|--7-------------0--------------2------------|
  A|--5-------------2--------------3------------|
  E|----------------3--------------0------------|

### 4. additional_notes (OPTIONAL)
- **Frontend Display**: Shown in a highlighted green box below the tab display
- **Purpose**: Practice tips, technique advice, theory explanations
- **Example**: "Practice switching between these chords smoothly. The Dm7 uses a barre at the 5th fret."

## When to Include Each Field:

| User Request Type | chat_response | fretboard_sequence | tab_display | additional_notes |
|------------------|---------------|-----------------------|-------------|------------------|
| "Explain 2-5-1" | ✓ Explanation | ✗ No | ✗ No | ✓ Theory notes |
| "Show me Cmaj7" | ✓ Brief intro | ✓ Single chord | ✓ Tab | ✓ Fingering tips |
| "2-5-1 in C" | ✓ Description | ✓ Full progression | ✓ Full tab | ✓ Practice advice |
| "C major scale" | ✓ Explanation | ✓ Note positions | ✓ Scale pattern | ✓ Practice tips |

## CRITICAL Rules:
1. ALWAYS return valid JSON
2. ALWAYS include chat_response (never null)
3. Only include fretboard_sequence when showing specific chords/notes
4. Ensure all positions are playable (4 fingers max, 4-fret span)
5. Use proper string numbering (1-6, where 1 is high E)
6. Duration should make musical sense (typically 4, 8, or 16 beats)
7. Validate your JSON before responding - it must parse correctly"""


@app.route('/api/assistant', methods=['POST'])
def assistant():
    """
    Handle assistant chat requests.

    Expected request body:
    {
        "message": "Show me a 2-5-1 in C Major",
        "conversation_history": [...],
        "context": {"bpm": 80, "fretboard_range": [0, 15]}
    }
    """
    try:
        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({'error': 'Missing message in request'}), 400

        user_message = data['message']
        conversation_history = data.get('conversation_history', [])
        context = data.get('context', {})

        # Build messages for OpenAI
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        # Add conversation history
        for msg in conversation_history[-10:]:  # Last 10 messages to keep context manageable
            messages.append(msg)

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # Call OpenAI API
        print(f"Calling OpenAI API for message: {user_message[:50]}...")

        response = client.chat.completions.create(
            model="gpt-4o",  # or "gpt-4o-mini" for cheaper option
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}  # Ensure JSON response
        )

        # Parse the response
        response_text = response.choices[0].message.content
        print(f"Received response: {response_text[:100]}...")

        response_json = json.loads(response_text)

        # Validate required fields
        if 'chat_response' not in response_json:
            return jsonify({'error': 'Invalid response from AI - missing chat_response'}), 500

        # Return the structured response
        return jsonify(response_json), 200

    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return jsonify({'error': f'Invalid JSON from AI: {str(e)}'}), 500
    except Exception as e:
        print(f"Error processing request: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'GuitarHub Backend API'
    }), 200


if __name__ == '__main__':
    # Get configuration from environment
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

    print("=" * 60)
    print("🎸 GuitarHub Backend API Server")
    print("=" * 60)
    print(f"Host: {HOST}")
    print(f"Port: {PORT}")
    print(f"OpenAI API: {'✓ Configured' if OPENAI_API_KEY else '✗ Missing'}")
    print(f"Allowed Origins: {ALLOWED_ORIGINS}")
    print("=" * 60)
    print()

    app.run(host=HOST, port=PORT, debug=DEBUG)
