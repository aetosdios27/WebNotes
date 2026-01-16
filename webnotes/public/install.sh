#!/bin/sh
# WebNotes Installer (Linux/macOS)

set -e

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

REPO="aetosdios27/WebNotes"
LATEST_URL="https://github.com/$REPO/releases/latest"

echo "🔍 Detecting platform..."

case "$OS" in
    Linux)
        FILE_EXT=".deb"
        echo "🐧 Detected Linux ($ARCH)"
        ;;
    Darwin)
        FILE_EXT=".dmg"
        echo "🍎 Detected macOS ($ARCH)"
        ;;
    *)
        echo "❌ Unsupported OS: $OS"
        exit 1
        ;;
esac

# Construct Download URL (This assumes standard Tauri naming convention)
# You might need to adjust this if your release filenames are different
# E.g. webnotes_0.1.0_amd64.deb
# A smarter way is to fetch the release JSON and grep it.

echo "⬇️  Fetching latest release..."

# Get the download URL for the asset ending in .deb or .dmg
DOWNLOAD_URL=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep "browser_download_url" | grep "$FILE_EXT" | cut -d '"' -f 4 | head -n 1)

if [ -z "$DOWNLOAD_URL" ]; then
    echo "❌ Could not find a suitable release asset."
    exit 1
fi

echo "🚀 Downloading from: $DOWNLOAD_URL"

TMP_FILE="/tmp/webnotes_install$FILE_EXT"
curl -L -o "$TMP_FILE" "$DOWNLOAD_URL"

echo "📦 Installing..."

if [ "$OS" = "Linux" ]; then
    sudo dpkg -i "$TMP_FILE"
    echo "✅ Installed! Run 'webnotes' to start."
elif [ "$OS" = "Darwin" ]; then
    hdiutil attach "$TMP_FILE" -nobrowse -mountpoint /Volumes/WebNotes
    cp -R "/Volumes/WebNotes/WebNotes.app" /Applications/
    hdiutil detach /Volumes/WebNotes
    echo "✅ Installed to /Applications!"
fi

rm "$TMP_FILE"
