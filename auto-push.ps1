# auto-push.ps1 — Auto commit & push setiap perubahan file ke GitHub
$ErrorActionPreference = "SilentlyContinue"
$repo = $PSScriptRoot

while ($true) {
  $changed = git -C $repo status --porcelain
  if ($changed) {
    git -C $repo add -A
    $msg = "Auto update " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    git -C $repo commit -m $msg
    git -C $repo push origin main
  }
  Start-Sleep -Seconds 3
}