#!/usr/bin/env python3
"""
GuitarHub Backend API Server
Provides secure proxy to OpenAI API for the Guitar Assistant feature.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import secrets
import hashlib
from datetime import datetime, timedelta
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

# Load enhanced system prompt from file
with open(os.path.join(os.path.dirname(__file__), 'system_prompt.txt'), 'r') as f:
    SYSTEM_PROMPT = f.read()

# Share storage configuration
SHARES_DIR = os.path.join(os.path.dirname(__file__), 'shares')
SHARE_TTL_DAYS = 90  # Shares expire after 90 days

# Ensure shares directory exists
os.makedirs(SHARES_DIR, exist_ok=True)


def generate_share_id():
    """Generate a short, URL-safe share ID."""
    # Generate 6 random bytes, encode as base64, make URL-safe
    random_bytes = secrets.token_bytes(6)
    share_id = hashlib.sha256(random_bytes).hexdigest()[:8]  # Use first 8 chars
    return share_id


def generate_edit_token():
    """Generate a secure edit token."""
    return secrets.token_urlsafe(16)


def save_share(share_id, composition, edit_token):
    """Save a shared composition to disk."""
    share_data = {
        'composition': composition,
        'edit_token_hash': hashlib.sha256(edit_token.encode()).hexdigest(),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'expires_at': (datetime.now() + timedelta(days=SHARE_TTL_DAYS)).isoformat()
    }

    filepath = os.path.join(SHARES_DIR, f'{share_id}.json')
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(share_data, f, ensure_ascii=False, indent=2)

    return share_data


def load_share(share_id):
    """Load a shared composition from disk."""
    filepath = os.path.join(SHARES_DIR, f'{share_id}.json')

    if not os.path.exists(filepath):
        return None

    with open(filepath, 'r', encoding='utf-8') as f:
        share_data = json.load(f)

    # Check if expired
    expires_at = datetime.fromisoformat(share_data['expires_at'])
    if datetime.now() > expires_at:
        # Delete expired share
        os.remove(filepath)
        return None

    return share_data


def verify_edit_token(share_data, edit_token):
    """Verify if the provided edit token matches the stored hash."""
    if not edit_token:
        return False

    provided_hash = hashlib.sha256(edit_token.encode()).hexdigest()
    return provided_hash == share_data['edit_token_hash']


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


@app.route('/api/composer/suggest', methods=['POST'])
def composer_suggest():
    """
    Handle composition suggestion requests.

    Expected request body:
    {
        "message": "Add a bass line to this progression",
        "composition": {...},  // Full or partial TAB data
        "selected_region": {"start_measure": 0, "end_measure": 3},  // Optional
        "context": {"tempo": 120, "time_signature": "4/4"}
    }
    """
    try:
        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({'error': 'Missing message in request'}), 400

        user_message = data['message']
        composition = data.get('composition', {})
        selected_region = data.get('selected_region')
        context = data.get('context', {})

        # Format composition as text for GPT
        tab_context = format_composition_for_gpt(composition, selected_region)

        # Build GPT prompt with structured response requirement
        composer_prompt = f"""You are a guitar composition assistant. The user is working on a guitar tablature composition.

Current composition:
{tab_context}

User request: {user_message}

You MUST respond with valid JSON in this format:

{{
  "chat_response": "Your explanation and teaching (required)",
  "tab_additions": [
    {{
      "string": 1,
      "fret": 0,
      "duration": 0.25,
      "measure_offset": 0
    }}
  ] or null
}}

- chat_response: Explain your suggestion conversationally
- tab_additions: Array of notes to add to the composition (optional)
  - string: 1-6 (1=high e, 6=low E)
  - fret: 0-15
  - duration: 0.0625, 0.125, 0.25, 0.5, 0.75, 1
  - measure_offset: which measure to add to (0=current, 1=next, etc.)

If the user asks for TAB/patterns/arpeggios/bass lines, include tab_additions.
If just explaining theory, set tab_additions to null.

Provide helpful, musical suggestions!"""

        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": composer_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        return jsonify({
            'chat_response': result.get('chat_response', ''),
            'tab_additions': result.get('tab_additions'),
            'tab_context_used': tab_context
        }), 200

    except Exception as e:
        print(f"Error in composer suggest: {e}")
        return jsonify({'error': str(e)}), 500


def format_composition_for_gpt(composition, selected_region=None):
    """Format composition data as readable text for GPT context."""
    if not composition or 'measures' not in composition:
        return "No composition data available."

    output = []
    measures = composition['measures']

    # Determine which measures to include
    if selected_region:
        start = selected_region.get('start_measure', 0)
        end = selected_region.get('end_measure', len(measures))
        measures_to_format = measures[start:end+1]
        output.append(f"Selected region: Measures {start+1} to {end+1}")
    else:
        measures_to_format = measures[-8:] if len(measures) > 8 else measures
        if len(measures) > 8:
            output.append(f"Showing last 8 measures (total: {len(measures)} measures)")

    output.append(f"Time Signature: {composition.get('timeSignature', '4/4')}")
    output.append(f"Tempo: {composition.get('tempo', 120)} BPM\n")

    # Format each measure
    for idx, measure in enumerate(measures_to_format):
        measure_num = idx + 1 if not selected_region else selected_region.get('start_measure', 0) + idx + 1
        output.append(f"Measure {measure_num}:")

        # Show chord annotations
        if measure.get('chords'):
            chords_str = ", ".join([f"{c['name']} at beat {c['time']+1}" for c in measure['chords']])
            output.append(f"  Chords: {chords_str}")

        # Show events (notes)
        events = measure.get('events', [])
        if events:
            # Group by time
            events_by_time = {}
            for event in events:
                t = event['time']
                if t not in events_by_time:
                    events_by_time[t] = []
                events_by_time[t].append(f"String {event['string']} Fret {event['fret']}")

            for time in sorted(events_by_time.keys()):
                output.append(f"  Beat {time+1}: {', '.join(events_by_time[time])}")

        output.append("")

    return "\n".join(output)


@app.route('/api/share', methods=['POST'])
def create_or_update_share():
    """
    Create a new share or update existing share (if author).

    Request body:
    {
        "composition": {...},  // Full composition data
        "shareId": "abc123",   // Optional: if updating existing share
        "editToken": "xyz..."  // Optional: proves you're the author
    }

    Response:
    {
        "shareId": "abc123",
        "editToken": "secret...",  // Only returned on create or if you're author
        "isAuthor": true,
        "isNew": true,
        "expiresAt": "2025-02-11T..."
    }
    """
    try:
        data = request.get_json()

        if not data or 'composition' not in data:
            return jsonify({'error': 'Missing composition in request'}), 400

        composition = data['composition']
        share_id = data.get('shareId')
        edit_token = data.get('editToken')

        # Check if updating existing share
        if share_id:
            existing = load_share(share_id)

            if existing and verify_edit_token(existing, edit_token):
                # Author updating existing share
                existing['composition'] = composition
                existing['updated_at'] = datetime.now().isoformat()

                filepath = os.path.join(SHARES_DIR, f'{share_id}.json')
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(existing, f, ensure_ascii=False, indent=2)

                return jsonify({
                    'shareId': share_id,
                    'editToken': edit_token,  # Return same token
                    'isAuthor': True,
                    'isNew': False,
                    'expiresAt': existing['expires_at']
                }), 200

        # Create new share (or fork if no edit token)
        new_share_id = generate_share_id()
        new_edit_token = generate_edit_token()

        share_data = save_share(new_share_id, composition, new_edit_token)

        return jsonify({
            'shareId': new_share_id,
            'editToken': new_edit_token,
            'isAuthor': True,
            'isNew': True,
            'expiresAt': share_data['expires_at']
        }), 201

    except Exception as e:
        print(f"Error creating share: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/share/<share_id>', methods=['GET'])
def get_share(share_id):
    """
    Load a shared composition.

    Query params:
    - editToken: Optional, proves you're the author

    Response:
    {
        "composition": {...},
        "isAuthor": true/false,
        "createdAt": "...",
        "expiresAt": "..."
    }
    """
    try:
        edit_token = request.args.get('editToken')

        share_data = load_share(share_id)

        if not share_data:
            return jsonify({'error': 'Share not found or expired'}), 404

        is_author = verify_edit_token(share_data, edit_token)

        return jsonify({
            'composition': share_data['composition'],
            'isAuthor': is_author,
            'createdAt': share_data['created_at'],
            'updatedAt': share_data['updated_at'],
            'expiresAt': share_data['expires_at']
        }), 200

    except Exception as e:
        print(f"Error loading share: {e}")
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
