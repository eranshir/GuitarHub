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

# Load enhanced system prompt from file
with open(os.path.join(os.path.dirname(__file__), 'system_prompt.txt'), 'r') as f:
    SYSTEM_PROMPT = f.read()


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
