# VM Discovery Commands

Run these commands on your VM to understand the current setup:

## 1. Nginx Configuration Discovery

```bash
# Find nginx config files
sudo find /etc/nginx -name "*.conf" -type f

# Show main nginx config
sudo cat /etc/nginx/nginx.conf

# Show sites-enabled configs (common location)
sudo ls -la /etc/nginx/sites-enabled/
sudo cat /etc/nginx/sites-enabled/default  # or whatever config exists

# Check if there's a livehive.events specific config
sudo cat /etc/nginx/sites-enabled/livehive.events 2>/dev/null || echo "No livehive.events config found"
```

## 2. Web Server Document Root

```bash
# Find where nginx is serving files from
sudo grep -r "root " /etc/nginx/sites-enabled/ 2>/dev/null
sudo grep -r "root " /etc/nginx/conf.d/ 2>/dev/null

# Common locations to check
ls -la /var/www/
ls -la /var/www/html/
ls -la /usr/share/nginx/html/
ls -la /home/*/public_html/ 2>/dev/null
```

## 3. Running Services and Ports

```bash
# Check what's listening on ports
sudo netstat -tulpn | grep LISTEN
# or
sudo ss -tulpn | grep LISTEN

# Check nginx status
sudo systemctl status nginx

# Check for any other web services
sudo systemctl list-units --type=service --state=running | grep -E "nginx|apache|http"
```

## 4. Current Directory Structure

```bash
# Show current web root contents
ls -la /var/www/html/ 2>/dev/null || echo "Not using /var/www/html"

# Check for existing applications
find /var/www -maxdepth 3 -type d 2>/dev/null
```

## 5. Domain and DNS Info

```bash
# Verify domain points to this server
dig livehive.events +short
curl -I http://livehive.events
curl -I https://livehive.events
```

## 6. SSL/HTTPS Setup

```bash
# Check for SSL certificates (Let's Encrypt)
sudo ls -la /etc/letsencrypt/live/
sudo certbot certificates 2>/dev/null || echo "Certbot not installed"
```

## 7. Python Environment

```bash
# Check Python version and location
python3 --version
which python3

# Check if virtualenv or other tools are installed
pip3 list | grep -E "virtualenv|gunicorn|flask"
```

---

## After Running These Commands:

Share the output and we'll determine:

1. **Where to deploy GuitarHub** (e.g., /var/www/html/GuitarHub)
2. **How to configure nginx** (new location block or separate config)
3. **How to run the backend** (systemd service, gunicorn, etc.)
4. **Whether to use a subdomain** (api.livehive.events) or path (/api/)
5. **SSL certificate setup** (if using HTTPS)

This will ensure we don't break your existing setup!
