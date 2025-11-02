# Guitar Assistant Feature Design

## Overview
AI-powered assistant that helps users learn guitar concepts with visual feedback on the fretboard.

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Assistant Module                                           │
├───────────────────────────────┬─────────────────────────────┤
│                               │                             │
│   CURRENT CHORD DISPLAY       │   CHAT INTERFACE            │
│   Playing: Dm7 (1 of 3)       │   (Right Side - 350px)      │
│                               │                             │
│   FRETBOARD DISPLAY           │   ┌─────────────────────┐   │
│   (Center - Full Width)       │   │ Chat History        │   │
│                               │   │ (Scrollable)        │   │
│   [Chord Visualization]       │   │                     │   │
│   - Current shape: Red        │   │ 👤 User:            │   │
│   - Previous shape: Gray 50%  │   │ Show me a 2-5-1     │   │
│                               │   │ in C Major          │   │
│   PLAYBACK CONTROLS           │   │                     │   │
│   BPM: [80] ──────            │   │ 🤖 Assistant:       │   │
│   [▶ Start] [⏸ Pause] [⏹ Stop]│   │ Here's the C Major  │   │
│   [🔊 Play Current Shape]     │   │ 2-5-1 progression.  │   │
│                               │   │ This is one of the  │   │
│   ASCII TAB DISPLAY           │   │ most common...      │   │
│   (Below fretboard)           │   │                     │   │
│   ┌─────────────────────────┐ │   │ [Shapes loaded ✓]   │   │
│   │  Dm7      G7     Cmaj7  │ │   └─────────────────────┘   │
│   │ e|--5-------3-------3--  │ │                             │
│   │ B|--6-------3-------5--  │ │   ┌─────────────────────┐   │
│   │ G|--5-------4-------4--  │ │   │ Ask me anything     │   │
│   │ D|--7-------3-------5--  │ │   │ about guitar...     │   │
│   │ A|--5-------5-------3--  │ │   └─────────────────────┘   │
│   │ E|----------3-----------│ │   [Send] [Clear Chat]       │
│   └─────────────────────────┘ │                             │
│                               │                             │
│   ADDITIONAL NOTES            │                             │
│   "Practice switching         │                             │
│    between these chords..."   │                             │
└───────────────────────────────┴─────────────────────────────┘
```

## API Contract

### Request to Backend:
```json
{
  "message": "Show me a 2-5-1 progression in C Major",
  "conversation_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "context": {
    "current_key": "C",
    "fretboard_range": [0, 12],
    "bpm": 80
  }
}
```

### Response from Backend:
```json
{
  "chat_response": "Here's the C Major 2-5-1 progression. This is one of the most common chord progressions in jazz and pop music.",
  "fretboard_sequence": [
    {
      "chord_name": "Dm7",
      "positions": [
        {"string": 6, "fret": 0},
        {"string": 5, "fret": 5},
        {"string": 4, "fret": 5},
        {"string": 3, "fret": 5},
        {"string": 2, "fret": 6},
        {"string": 1, "fret": 5}
      ],
      "muted": [],
      "duration_beats": 4,
      "notes": "This is the ii chord in C Major"
    },
    {
      "chord_name": "G7",
      "positions": [
        {"string": 6, "fret": 3},
        {"string": 5, "fret": 2},
        {"string": 4, "fret": 0},
        {"string": 3, "fret": 0},
        {"string": 2, "fret": 0},
        {"string": 1, "fret": 1}
      ],
      "muted": [],
      "duration_beats": 4,
      "notes": "The V7 chord - creates tension"
    },
    {
      "chord_name": "Cmaj7",
      "positions": [
        {"string": 6, "fret": 0},
        {"string": 5, "fret": 3},
        {"string": 4, "fret": 2},
        {"string": 3, "fret": 0},
        {"string": 2, "fret": 0},
        {"string": 1, "fret": 0}
      ],
      "muted": [],
      "duration_beats": 8,
      "notes": "Resolves to the I chord"
    }
  ],
  "tab_display": "   Dm7            G7             Cmaj7\ne|--5-------------3--------------0------------|\\nB|--6-------------0--------------0------------|\\nG|--5-------------0--------------0------------|\\nD|--7-------------0--------------2------------|\\nA|--5-------------2--------------3------------|\\nE|----------------3--------------0------------|",
  "additional_notes": "Practice switching between these chords smoothly. The Dm7 uses a barre at the 5th fret."
}
```

## Frontend Components Needed:

1. **AssistantGame.js**
   - Manage chat conversation
   - Handle API calls to backend
   - Parse structured responses
   - Control fretboard visualization
   - Sync with metronome

2. **HTML Structure**
   - Chat container with message bubbles
   - Input field for user questions
   - Fretboard display (reuse existing)
   - Metronome controls (reuse existing)
   - ASCII tab display area
   - Position indicator

3. **CSS Styling**
   - Chat bubble styles
   - Two-column layout
   - Tab monospace font
   - Loading states

## System Prompt for GPT (Backend):

```
You are an expert guitar teaching assistant integrated into an interactive web application called GuitarHub.
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
  ```json
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
  ```

- **IMPORTANT Rules**:
  - ALWAYS provide all 6 strings (or mark as muted)
  - Use fret 0 for open strings
  - String numbering: 1=high E, 2=B, 3=G, 4=D, 5=A, 6=low E
  - duration_beats should be multiples of 4 (4, 8, 12, 16) for clean measures
  - Each position object MUST have both "string" and "fret" fields
  - Only include playable chord shapes (4 fingers or fewer)

### 3. tab_display (OPTIONAL - provide when showing tablature)
- **Frontend Display**:
  - Rendered in a monospace <pre> block below the fretboard
  - Shows ASCII guitar tablature notation

- **Format Requirements**:
  - Standard 6-line tab format (e|B|G|D|A|E|)
  - Use proper spacing for rhythm alignment
  - Include chord names above the tab
  - Use newline characters (\n) for line breaks
  - Example:
  ```
     Dm7            G7             Cmaj7
  e|--5-------------3--------------0------------|
  B|--6-------------0--------------0------------|
  G|--5-------------0--------------0------------|
  D|--7-------------0--------------2------------|
  A|--5-------------2--------------3------------|
  E|----------------3--------------0------------|
  ```

### 4. additional_notes (OPTIONAL)
- **Frontend Display**: Shown in a highlighted box below the tab display
- **Purpose**: Practice tips, technique advice, theory explanations
- **Example**: "Practice switching between these chords smoothly. The Dm7 uses a barre at the 5th fret."

## When to Include Each Field:

| User Request Type | chat_response | fretboard_sequence | tab_display | additional_notes |
|------------------|---------------|-----------------------|-------------|------------------|
| "Explain 2-5-1" | ✓ Explanation | ✗ No | ✗ No | ✓ Theory notes |
| "Show me Cmaj7" | ✓ Brief intro | ✓ Single chord | ✓ Tab | ✓ Fingering tips |
| "2-5-1 in C" | ✓ Description | ✓ Full progression | ✓ Full tab | ✓ Practice advice |
| "C major scale" | ✓ Explanation | ✓ Note positions | ✓ Scale pattern | ✓ Practice tips |
| "Jazz voicings for Dm7" | ✓ Intro | ✓ Multiple voicings | ✓ All voicings | ✓ Usage notes |

## Example Scenarios:

### Scenario 1: Chord Progression Request
User: "Show me a 2-5-1 in C Major"
Response:
```json
{
  "chat_response": "Here's the C Major 2-5-1 progression. This is one of the most common chord progressions in jazz and pop music. The ii-V-I creates a smooth harmonic resolution.",
  "fretboard_sequence": [
    {
      "chord_name": "Dm7",
      "positions": [
        {"string": 1, "fret": 5}, {"string": 2, "fret": 6},
        {"string": 3, "fret": 5}, {"string": 4, "fret": 7},
        {"string": 5, "fret": 5}, {"string": 6, "fret": 0}
      ],
      "muted": [],
      "duration_beats": 4,
      "notes": "ii chord - sets up the progression"
    },
    {
      "chord_name": "G7",
      "positions": [
        {"string": 1, "fret": 1}, {"string": 2, "fret": 0},
        {"string": 3, "fret": 0}, {"string": 4, "fret": 0},
        {"string": 5, "fret": 2}, {"string": 6, "fret": 3}
      ],
      "muted": [],
      "duration_beats": 4,
      "notes": "V7 chord - creates tension"
    },
    {
      "chord_name": "Cmaj7",
      "positions": [
        {"string": 1, "fret": 0}, {"string": 2, "fret": 0},
        {"string": 3, "fret": 0}, {"string": 4, "fret": 2},
        {"string": 5, "fret": 3}, {"string": 6, "fret": 0}
      ],
      "muted": [],
      "duration_beats": 8,
      "notes": "I chord - resolution"
    }
  ],
  "tab_display": "   Dm7            G7             Cmaj7\ne|--5-------------1--------------0------------|\\nB|--6-------------0--------------0------------|\\nG|--5-------------0--------------0------------|\\nD|--7-------------0--------------2------------|\\nA|--5-------------2--------------3------------|\\nE|----------------3--------------0------------|",
  "additional_notes": "Practice switching between these chords smoothly. Start at 60 BPM and gradually increase. Notice how the G7 creates tension that resolves to Cmaj7."
}
```

### Scenario 2: Single Chord Inquiry
User: "How do I play Fmaj7?"
Response:
```json
{
  "chat_response": "Fmaj7 is a beautiful, jazzy chord. Here's a common voicing using a partial barre on the first fret.",
  "fretboard_sequence": [
    {
      "chord_name": "Fmaj7",
      "positions": [
        {"string": 1, "fret": 0}, {"string": 2, "fret": 1},
        {"string": 3, "fret": 2}, {"string": 4, "fret": 3},
        {"string": 5, "fret": 3}, {"string": 6, "fret": 1}
      ],
      "muted": [],
      "duration_beats": 16,
      "notes": "Root: F, Third: A, Fifth: C, Seventh: E"
    }
  ],
  "tab_display": "e|--0--|\\nB|--1--|\\nG|--2--|\\nD|--3--|\\nA|--3--|\\nE|--1--|",
  "additional_notes": "Use your index finger to barre strings 1 and 6 at the first fret. This is easier than a full F barre chord."
}
```

### Scenario 3: Theory Question (No Fretboard)
User: "What is a 2-5-1 progression?"
Response:
```json
{
  "chat_response": "A 2-5-1 (ii-V-I) progression is a fundamental chord sequence in jazz and popular music. It uses the second, fifth, and first chords of a major scale. In C Major: Dm (ii) → G7 (V) → Cmaj (I). The progression creates tension with the V chord and resolves to the I chord, making it sound complete and satisfying.",
  "fretboard_sequence": null,
  "tab_display": null,
  "additional_notes": "This progression appears in thousands of jazz standards. Try it in different keys to build familiarity!"
}
```

## CRITICAL Rules:
1. ALWAYS return valid JSON
2. ALWAYS include chat_response (never null)
3. Only include fretboard_sequence when showing specific chords/notes
4. Ensure all positions are playable (4 fingers max, 4-fret span)
5. Use proper string numbering (1-6, where 1 is high E)
6. Duration should make musical sense (typically 4, 8, or 16 beats)
7. If user asks for multiple voicings, include them all in the sequence
```

## Security on Your VM:

```bash
# .env file on your VM
DEEPINFRA_TOKEN=dlgbQnorz3shaOBHUwOO7QPFWwKyI9Ef
OPENAI_API_KEY=your-openai-key-here
ALLOWED_ORIGINS=https://yourusername.github.io
```

## Advantages of This Approach:

✓ Tokens stay on your VM
✓ Can use any API (DeepInfra, OpenAI, etc.)
✓ Full control over rate limiting
✓ Can add caching to reduce costs
✓ GitHub Pages hosts static files (free)
✓ Your VM handles backend logic

Would you like me to proceed with implementing this feature? I can start with:
1. HTML/CSS for the Assistant UI
2. Frontend JavaScript (AssistantGame.js)
3. Then the Python Flask backend