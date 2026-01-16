$ErrorActionPreference = 'Stop'

$Repo = "aetosdios27/WebNotes"
$AppName = "WebNotes"

Write-Host "🔍 Checking GitHub for latest version..."

try {
    $LatestRelease = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest"
    # Look for .msi installer
    $Asset = $LatestRelease.assets | Where-Object { $_.name -like "*.msi" } | Select-Object -First 1

    if (!$Asset) {
        Write-Error "Could not find .msi installer in the latest release."
    }

    $DownloadUrl = $Asset.browser_download_url
    $InstallerPath = "$env:TEMP\WebNotes_Installer.msi"

    Write-Host "⬇️  Downloading $AppName..."
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $InstallerPath

    Write-Host "📦 Installing..."
    # Run MSI silently
    Start-Process msiexec.exe -ArgumentList "/i `"$InstallerPath`" /quiet /qn /norestart" -Wait

    Remove-Item $InstallerPath
    Write-Host "✅ WebNotes installed successfully!"
    Write-Host "   You can find it in your Start Menu."

} catch {
    Write-Error "Installation failed: $_"
}
