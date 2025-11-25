#!/bin/bash
#
# GuitarHub OMR Installation Script for GCP Debian/Ubuntu VM
#
# This script installs all dependencies required for the OMR (Optical Music Recognition)
# pipeline using Audiveris.
#
# Usage:
#   chmod +x install_omr.sh
#   sudo ./install_omr.sh
#

set -e  # Exit on error

echo "=============================================="
echo "GuitarHub OMR Installation Script"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo ./install_omr.sh)"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS. This script supports Debian/Ubuntu."
    exit 1
fi

echo "Detected OS: $OS"
echo ""

# Update package list
echo "[1/6] Updating package list..."
apt-get update -qq

# Install Java 17+
echo "[2/6] Installing Java 17..."
apt-get install -y openjdk-17-jre-headless

java -version
echo "Java installed successfully"
echo ""

# Install Tesseract OCR with English language
echo "[3/6] Installing Tesseract OCR..."
apt-get install -y tesseract-ocr tesseract-ocr-eng

tesseract --version
echo "Tesseract installed successfully"
echo ""

# Install Poppler (for PDF to image conversion)
echo "[4/6] Installing Poppler utilities..."
apt-get install -y poppler-utils

pdfinfo -v || pdftoppm -v
echo "Poppler installed successfully"
echo ""

# Install Audiveris
echo "[5/6] Installing Audiveris..."

AUDIVERIS_VERSION="5.8.1"
AUDIVERIS_DEB="Audiveris_${AUDIVERIS_VERSION}-1_amd64.deb"
AUDIVERIS_URL="https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/${AUDIVERIS_DEB}"

# Check if Audiveris is already installed
if command -v audiveris &> /dev/null; then
    echo "Audiveris is already installed"
else
    echo "Downloading Audiveris ${AUDIVERIS_VERSION}..."
    cd /tmp
    wget -q "${AUDIVERIS_URL}" -O "${AUDIVERIS_DEB}" || {
        echo "Failed to download Audiveris. Trying alternative method..."
        # Try without specific architecture
        AUDIVERIS_DEB="Audiveris-${AUDIVERIS_VERSION}-linux-x64.deb"
        AUDIVERIS_URL="https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/${AUDIVERIS_DEB}"
        wget -q "${AUDIVERIS_URL}" -O "${AUDIVERIS_DEB}"
    }

    echo "Installing Audiveris..."
    dpkg -i "${AUDIVERIS_DEB}" || apt-get install -f -y

    # Clean up
    rm -f "${AUDIVERIS_DEB}"
fi

# Verify Audiveris installation
if command -v audiveris &> /dev/null; then
    audiveris -help | head -5
    echo "Audiveris installed successfully"
else
    echo "Warning: Audiveris command not found. You may need to install it manually."
    echo "Download from: https://github.com/Audiveris/audiveris/releases"
fi
echo ""

# Install Python dependencies
echo "[6/6] Installing Python dependencies..."

# Check for pip
if ! command -v pip3 &> /dev/null; then
    apt-get install -y python3-pip
fi

# Install required Python packages
pip3 install --upgrade pip
pip3 install pdf2image Pillow

echo "Python dependencies installed successfully"
echo ""

# Create required directories
echo "Creating required directories..."
BACKEND_DIR=$(dirname "$(readlink -f "$0")")
mkdir -p "${BACKEND_DIR}/uploads"
mkdir -p "${BACKEND_DIR}/omr_jobs"
mkdir -p "${BACKEND_DIR}/shares"

# Set permissions (adjust user as needed)
# chown -R www-data:www-data "${BACKEND_DIR}/uploads" "${BACKEND_DIR}/omr_jobs"

echo ""
echo "=============================================="
echo "Installation Complete!"
echo "=============================================="
echo ""
echo "Installed components:"
echo "  - Java $(java -version 2>&1 | head -1)"
echo "  - Tesseract $(tesseract --version 2>&1 | head -1)"
echo "  - Poppler utilities"
echo "  - Audiveris ${AUDIVERIS_VERSION}"
echo "  - Python packages: pdf2image, Pillow"
echo ""
echo "To test the installation, run:"
echo "  python3 omr_pipeline.py <your_pdf_file.pdf>"
echo ""
echo "To start the server:"
echo "  python3 server.py"
echo ""
