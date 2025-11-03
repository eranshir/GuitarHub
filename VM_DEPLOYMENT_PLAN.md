# GuitarHub VM Deployment Plan

## Current VM Setup (Discovered)

**Domain**: livehive.events (34.135.141.111)
**Nginx Config**: `/etc/nginx/sites-enabled/livehive`
**Current Frontend**: `/home/eranshir/sharedMemories/frontend/dist`
**Current Backend**: Running on port 8000 (proxied via `/api/`)
**SSL**: Namecheap cert at `/etc/ssl/certs/livehive.events/fullchain.pem`

**Currently Used Ports:**
- 80: HTTP (redirects to HTTPS)
- 443: HTTPS (nginx)
- 8000: Your existing backend (sharedMemories)
- 5174: Node app

## Deployment Strategy

### Option A: Subdirectory Deployment (Recommended)
Deploy GuitarHub as a subdirectory: `https://livehive.events/guitar/`

**Advantages:**
- ✓ No DNS changes needed
- ✓ Minimal nginx changes
- ✓ Doesn't interfere with existing app
- ✓ Easy to add/remove

**Disadvantages:**
- × Slightly longer URL
- × Need to handle base path in frontend

### Option B: Subdomain Deployment
Deploy on subdomain: `https://guitar.livehive.events`

**Advantages:**
- ✓ Clean URL
- ✓ Completely separate from main app
- ✓ Can use different SSL cert if needed

**Disadvantages:**
- × Requires DNS A record addition in Namecheap
- × Need separate SSL cert or wildcard
- × More complex nginx config

---

## Recommended: Option A - Subdirectory Deployment

## Step-by-Step Deployment Plan

### Step 1: Clone Repository to VM

```bash
# SSH into your VM
ssh livehivehq@34.135.141.111

# Navigate to a good location
cd /home/eranshir

# Clone the repository
git clone https://github.com/eranshir/GuitarHub.git
cd GuitarHub
git checkout v2.0.0

# Verify files
ls -la
```

### Step 2: Set Up Python Backend

```bash
cd /home/eranshir/GuitarHub/backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env  # Edit with your keys
```

**Edit .env to contain:**
```bash
OPENAI_API_KEY=your-openai-key-here
HOST=127.0.0.1  # Only listen on localhost (nginx will proxy)
PORT=5001       # Different from your existing port 8000
DEBUG=False
ALLOWED_ORIGINS=https://livehive.events
```

### Step 3: Test Backend Locally

```bash
# Activate venv if not already
source venv/bin/activate

# Test the server
python server.py

# In another terminal, test the API
curl http://localhost:5001/health
# Should return: {"status":"healthy","service":"GuitarHub Backend API"}

# Stop the test server (Ctrl+C)
```

### Step 4: Create Systemd Service for Backend

```bash
# Create service file
sudo nano /etc/systemd/system/guitarhub-api.service
```

**Content:**
```ini
[Unit]
Description=GuitarHub Backend API
After=network.target

[Service]
Type=simple
User=eranshir
WorkingDirectory=/home/eranshir/GuitarHub/backend
Environment="PATH=/home/eranshir/GuitarHub/backend/venv/bin"
ExecStart=/home/eranshir/GuitarHub/backend/venv/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable guitarhub-api
sudo systemctl start guitarhub-api

# Check status
sudo systemctl status guitarhub-api

# View logs
sudo journalctl -u guitarhub-api -f
```

### Step 5: Update Nginx Configuration

```bash
# Backup current config
sudo cp /etc/nginx/sites-enabled/livehive /etc/nginx/sites-enabled/livehive.backup

# Edit the config
sudo nano /etc/nginx/sites-enabled/livehive
```

**Add these location blocks BEFORE the existing `location /` block:**

```nginx
# GuitarHub Frontend (Static Files)
location /guitar/ {
    alias /home/eranshir/GuitarHub/;
    try_files $uri $uri/ /guitar/index.html;

    # Set proper MIME types
    include /etc/nginx/mime.types;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# GuitarHub Backend API
location /guitar-api/ {
    proxy_pass http://localhost:5001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # CORS headers (if needed)
    add_header Access-Control-Allow-Origin "https://livehive.events" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type" always;
}
```

**Test nginx config:**
```bash
sudo nginx -t
```

**If test passes, reload nginx:**
```bash
sudo systemctl reload nginx
```

### Step 6: Update Frontend API Endpoint

```bash
# Edit the JavaScript file to point to the new API location
nano /home/eranshir/GuitarHub/js/assistantGame.js
```

**Change line 9 to:**
```javascript
this.apiEndpoint = 'https://livehive.events/guitar-api/api/assistant';
```

### Step 7: Set Permissions

```bash
# Ensure nginx can read the files
sudo chown -R eranshir:www-data /home/eranshir/GuitarHub
sudo chmod -R 755 /home/eranshir/GuitarHub
sudo chmod 644 /home/eranshir/GuitarHub/index.html
```

### Step 8: Test the Deployment

```bash
# Check backend is running
curl http://localhost:5001/health

# Check frontend is accessible
curl https://livehive.events/guitar/

# Check API through nginx
curl -X POST https://livehive.events/guitar-api/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"test","conversation_history":[],"context":{"bpm":80}}'
```

### Step 9: Access in Browser

Open: **https://livehive.events/guitar/**

The app should load and the Assistant tab should work!

---

## Alternative: Simpler Symbolic Link Approach

If the above seems complex, here's a simpler option:

```bash
# Clone to /home/eranshir/GuitarHub
cd /home/eranshir
git clone https://github.com/eranshir/GuitarHub.git

# Create symlink in sharedMemories/frontend/dist
ln -s /home/eranshir/GuitarHub /home/eranshir/sharedMemories/frontend/dist/guitar

# Then access at: https://livehive.events/guitar/
```

But you'd still need:
- Backend service setup (Steps 2-4)
- Nginx location block for the API (guitar-api)
- Frontend API endpoint update

---

## Troubleshooting Commands

```bash
# Check backend logs
sudo journalctl -u guitarhub-api -n 100

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart backend
sudo systemctl restart guitarhub-api
```

---

## Rollback Plan

If anything goes wrong:

```bash
# Restore nginx config
sudo cp /etc/nginx/sites-enabled/livehive.backup /etc/nginx/sites-enabled/livehive
sudo systemctl reload nginx

# Stop backend service
sudo systemctl stop guitarhub-api
sudo systemctl disable guitarhub-api
```

Your existing app will be unaffected!
