# GuitarHub Backend API

Backend server for the GuitarHub Guitar Assistant feature. Securely proxies requests to OpenAI API.

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example env file and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add:
- `OPENAI_API_KEY`: Your OpenAI API key
- `ALLOWED_ORIGINS`: Your frontend URL (GitHub Pages or local)

### 3. Run the Server

```bash
python server.py
```

The server will start on `http://0.0.0.0:5000`

## Deployment on Your VM

### Option 1: Direct Run
```bash
# Set environment variables
export OPENAI_API_KEY='your-key'
export ALLOWED_ORIGINS='https://yourusername.github.io'

# Run server
python server.py
```

### Option 2: Using systemd (Recommended for VM)

Create `/etc/systemd/system/guitarhub-api.service`:

```ini
[Unit]
Description=GuitarHub Backend API
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/guitarHub/backend
Environment="OPENAI_API_KEY=your-key-here"
Environment="ALLOWED_ORIGINS=https://yourusername.github.io"
ExecStart=/usr/bin/python3 server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable guitarhub-api
sudo systemctl start guitarhub-api
sudo systemctl status guitarhub-api
```

### Option 3: Using gunicorn (Production)

```bash
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 server:app
```

## API Endpoints

### POST /api/assistant
Main assistant endpoint. Accepts chat messages and returns structured responses.

**Request:**
```json
{
  "message": "Show me a 2-5-1 progression in C Major",
  "conversation_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "context": {
    "bpm": 80,
    "fretboard_range": [0, 15]
  }
}
```

**Response:**
```json
{
  "chat_response": "Here's the C Major 2-5-1 progression...",
  "fretboard_sequence": [...],
  "tab_display": "...",
  "additional_notes": "..."
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "GuitarHub Backend API"
}
```

## Update Frontend Configuration

In `js/assistantGame.js`, update the API endpoint to point to your VM:

```javascript
this.apiEndpoint = 'http://your-vm-ip:5000/api/assistant';
// Or for production with domain:
this.apiEndpoint = 'https://api.yourdomain.com/api/assistant';
```

## Security Notes

- Never commit `.env` file to git
- Use HTTPS in production (set up nginx reverse proxy)
- Restrict CORS to your specific domain
- Consider rate limiting for production use

## Testing

Test the server is running:
```bash
curl http://localhost:5000/health
```

Test the assistant endpoint:
```bash
curl -X POST http://localhost:5000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me a C major chord", "conversation_history": [], "context": {"bpm": 80}}'
```
