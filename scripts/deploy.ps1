#Requires -Version 5.1
<#
.SYNOPSIS
  LEGACY / UNSUPPORTED for onboarding — use Docker instead:
    cp .env.example .env
    docker compose run --rm --service-ports quickstart
  See README.md and docs/setup-docker.md / docs/host-dev.md

  Deploy Banno Pulse to Cloudflare Workers (Windows).

.DESCRIPTION
  Verifies Node.js and Wrangler auth, then runs a minified Worker deploy.
  Prints the Worker URL and Banno People URI reminder.

.PARAMETER RefreshAuth
  Force wrangler logout + login before deploying.

.PARAMETER SkipAuthCheck
  Skip the interactive account confirmation (CI / re-deploys).

.EXAMPLE
  .\scripts\deploy.ps1
  .\scripts\deploy.ps1 -RefreshAuth
#>
param(
  [switch]$RefreshAuth,
  [switch]$SkipAuthCheck
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# Non-interactive when CI or API-token auth is present
if ($env:CI -or $env:CLOUDFLARE_API_TOKEN) {
  $SkipAuthCheck = $true
}
function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "    OK  $Message" -ForegroundColor Green
}

function Write-Fail([string]$Message) {
  Write-Host "    XX  $Message" -ForegroundColor Red
}

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-NodeMajorVersion {
  $raw = (& node -v 2>$null)
  if (-not $raw) { return $null }
  if ($raw -match 'v?(\d+)') { return [int]$Matches[1] }
  return $null
}

Write-Host "Banno Pulse — Windows deploy" -ForegroundColor White

Write-Step "Checking Node.js"
if (-not (Test-Command "node") -or -not (Test-Command "npm")) {
  Write-Fail "Node.js / npm not found. Run .\scripts\setup.ps1 first."
  Write-Host "Or install Node 20 LTS from https://nodejs.org and reopen PowerShell."
  exit 1
}
$major = Get-NodeMajorVersion
Write-Ok "node $(node -v)"
if ($null -eq $major -or $major -lt 18) {
  Write-Fail "Node.js 18.18+ required. Run .\scripts\setup.ps1"
  exit 1
}

if (-not (Test-Path (Join-Path $RepoRoot "node_modules\wrangler"))) {
  Write-Step "Installing dependencies (wrangler missing)"
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Step "Verifying Wrangler Cloudflare account"
if ($RefreshAuth) {
  Write-Host "Refreshing auth..."
  npx --yes wrangler logout | Out-Null
  npx --yes wrangler login
  if ($LASTEXITCODE -ne 0) {
    Write-Fail "wrangler login failed"
    exit $LASTEXITCODE
  }
}

$whoamiOut = & npx --yes wrangler whoami 2>&1 | Out-String
$whoamiExit = $LASTEXITCODE
Write-Host $whoamiOut

if ($whoamiExit -ne 0 -or $whoamiOut -match '(?i)not logged in|not authenticated|login required') {
  Write-Fail "Not logged in to Cloudflare."
  Write-Host "Run:  .\scripts\setup.ps1 -RefreshAuth"
  Write-Host "  or:  .\scripts\deploy.ps1 -RefreshAuth"
  exit 1
}

if (-not $SkipAuthCheck) {
  $ok = Read-Host "Deploy with the Cloudflare account shown above? [Y/n]"
  if ($ok -match '^[Nn]') {
    Write-Host "Aborted. Re-auth with: .\scripts\setup.ps1 -RefreshAuth"
    exit 1
  }
}

Write-Step "Deploying Worker + D1 migrations"
npm run deploy
if ($LASTEXITCODE -ne 0) {
  Write-Fail "Deploy failed"
  exit $LASTEXITCODE
}

Write-Ok "Deploy finished"
Write-Host ""
Write-Host "Copy the https://*.workers.dev URL from the output above."
Write-Host "Add this redirect URI in the Jack Henry dashboard:"
Write-Host "  https://<your-worker>.workers.dev/callback/plugin"
Write-Host "Keep localhost too if you still develop locally:"
Write-Host "  http://localhost:8787/callback/plugin"
Write-Host ""
Write-Host "Set wrangler.jsonc vars.REDIRECT_URI to the Worker callback, then redeploy if needed."
Write-Host "Guide: docs\setup-banno.md"
exit 0
