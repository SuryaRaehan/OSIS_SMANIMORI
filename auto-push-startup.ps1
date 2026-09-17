# auto-push-startup.ps1 - Aktifkan Auto-Push saat Windows login (tanpa admin)
$ErrorActionPreference = "Stop"

$startupDir = Join-Path ([Environment]::GetFolderPath("Startup")) ""
$startupFile = Join-Path $startupDir "AutoPush.cmd"
$scriptPath = Join-Path $PSScriptRoot "auto-push.ps1"

$content = "@echo off`r`npowershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

Set-Content -LiteralPath $startupFile -Value $content -Encoding Ascii

Write-Host "Auto-Push aktif. Akan berjalan otomatis setiap Windows login." -ForegroundColor Green
Write-Host "Lokasi launcher: $startupFile"