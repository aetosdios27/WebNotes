#!/bin/sh
# WebNotes Installer
# Installs native packages (.deb, .rpm, .dmg) based on your OS.

set -e

REPO="aetosdios27/WebNotes"
BIN_NAME="webnotes"

# ANSI Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "${BLUE}🔍 Detecting platform...${NC}"

# Helper to fetch URL from GitHub API
get_url() {
    curl -s "https://api.github.com/repos/$REPO/releases/latest" \
    | grep "browser_download_url" \
    | grep "$1" \
    | cut -d '"' -f 4 \
    | head -n 1
}

OS="$(uname -s)"

if [ "$OS" = "Linux" ]; then
    # --- 1. DEBIAN / UBUNTU / MINT ---
    if command -v dpkg >/dev/null 2>&1; then
        echo "🐧 Detected Debian-based system."
        URL=$(get_url ".deb")

        if [ -z "$URL" ]; then echo "${RED}❌ Error: .deb not found in release.${NC}"; exit 1; fi

        echo "${BLUE}⬇️  Downloading native package...${NC}"
        curl -L -o "/tmp/webnotes.deb" "$URL"

        echo "📦 Installing..."
        sudo dpkg -i "/tmp/webnotes.deb" || sudo apt-get install -f -y
        rm "/tmp/webnotes.deb"

        echo "${GREEN}✅ Installed! Run 'webnotes' to start.${NC}"
        exit 0
    fi

    # --- 2. FEDORA / RHEL / SUSE ---
    if command -v rpm >/dev/null 2>&1; then
        echo "🎩 Detected RPM-based system."
        URL=$(get_url ".rpm")

        if [ -z "$URL" ]; then echo "${RED}❌ Error: .rpm not found in release.${NC}"; exit 1; fi

        echo "${BLUE}⬇️  Downloading native package...${NC}"
        curl -L -o "/tmp/webnotes.rpm" "$URL"

        echo "📦 Installing..."
        sudo rpm -i "/tmp/webnotes.rpm" --force
        rm "/tmp/webnotes.rpm"

        echo "${GREEN}✅ Installed! Run 'webnotes' to start.${NC}"
        exit 0
    fi

    # --- 3. ARCH / OTHER (AppImage Fallback) ---
    echo "🐧 Detected Generic Linux (Arch/Void/Other)."
    URL=$(get_url ".AppImage")

    if [ -z "$URL" ]; then echo "${RED}❌ Error: .AppImage not found.${NC}"; exit 1; fi

    echo "${BLUE}⬇️  Downloading AppImage...${NC}"
    sudo curl -L -o "/usr/local/bin/$BIN_NAME" "$URL"
    sudo chmod +x "/usr/local/bin/$BIN_NAME"

    echo "${GREEN}✅ Installed to /usr/local/bin/$BIN_NAME${NC}"
    exit 0

elif [ "$OS" = "Darwin" ]; then
    # --- 4. MACOS ---
    echo "🍎 Detected macOS."
    URL=$(get_url ".dmg")

    if [ -z "$URL" ]; then echo "${RED}❌ Error: .dmg not found.${NC}"; exit 1; fi

    echo "${BLUE}⬇️  Downloading .dmg...${NC}"
    curl -L -o "/tmp/webnotes.dmg" "$URL"

    echo "📦 Installing..."
    hdiutil attach "/tmp/webnotes.dmg" -nobrowse -mountpoint "/Volumes/WebNotes"
    cp -R "/Volumes/WebNotes/WebNotes.app" /Applications/
    hdiutil detach "/Volumes/WebNotes"
    rm "/tmp/webnotes.dmg"

    echo "${GREEN}✅ Installed to /Applications/WebNotes.app${NC}"
    exit 0
else
    echo "${RED}❌ Unsupported OS: $OS${NC}"
    exit 1
fi
