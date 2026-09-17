# auto-push-startup.ps1 - Daftarkan Auto-Push saat Windows login
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "auto-push.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName "AutoPush" -Action $action -Trigger $trigger -Settings $settings -Description "Auto commit & push setiap perubahan file ke GitHub" -Force

Write-Host "Auto-Push terdaftar di Task Scheduler. Akan berjalan otomatis setiap kali Windows login." -ForegroundColor Green