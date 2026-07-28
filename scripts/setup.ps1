#Requires -Version 5.1
<#
.SYNOPSIS
  First-time (or refresh) setup for Banno Pulse on Windows.

.DESCRIPTION
  Checks Node.js, installs npm deps, refreshes Wrangler Cloudflare login when
  needed, seeds .dev.vars, and prints Banno People next steps.

.PARAMETER RefreshAuth
  Force wrangler logout + login even if already authenticated.

.PARAMETER SkipInstall
  Skip npm install (use when node_modules is already current).

.EXAMPLE
  .\scripts\setup.ps1
  .\scripts\setup.ps1 -RefreshAuth
#>
param(
  [switch]$RefreshAuth,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "    OK  $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
  Write-Host "    !!  $Message" -ForegroundColor Yellow
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

function Ensure-Node {
  Write-Step "Checking Node.js"

  if (-not (Test-Command "node") -or -not (Test-Command "npm")) {
    Write-Fail "Node.js / npm not found on PATH."
    Write-Host ""
    Write-Host "Install Node.js 20 LTS (recommended), then re-run this script."
    Write-Host ""
    Write-Host "  Option A — Official installer (simplest)"
    Write-Host "    https://nodejs.org  → download Windows LTS → run installer → reopen PowerShell"
    Write-Host ""
    Write-Host "  Option B — winget (if available)"
    Write-Host "    winget install OpenJS.NodeJS.LTS"
    Write-Host ""

    if (Test-Command "winget") {
      $answer = Read-Host "Attempt install with winget now? [y/N]"
      if ($answer -match '^[Yy]') {
        Write-Host "Running: winget install OpenJS.NodeJS.LTS"
        winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
        Write-Warn "Close and reopen PowerShell, then run .\scripts\setup.ps1 again."
        exit 1
      }
    }

    Start-Process "https://nodejs.org" -ErrorAction SilentlyContinue
    exit 1
  }

  $major = Get-NodeMajorVersion
  $npmVersion = (& npm -v)
  Write-Ok "node $(node -v)  |  npm $npmVersion"

  if ($null -eq $major -or $major -lt 18) {
    Write-Fail "Node.js 18.18+ required (20 LTS recommended). Found major=$major"
    Write-Host "Upgrade from https://nodejs.org then re-run this script."
    exit 1
  }
}

function Ensure-NpmInstall {
  if ($SkipInstall) {
    Write-Step "Skipping npm install (-SkipInstall)"
    return
  }

  Write-Step "Installing npm dependencies"
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm install failed"
    exit $LASTEXITCODE
  }
  Write-Ok "Dependencies installed (includes local wrangler)"
}

function Invoke-Wrangler([string[]]$WranglerArgs) {
  & npx --yes wrangler @WranglerArgs
  return $LASTEXITCODE
}

function Ensure-WranglerAuth {
  Write-Step "Checking Cloudflare / Wrangler login"

  if (-not (Test-Path (Join-Path $RepoRoot "node_modules\wrangler"))) {
    Write-Fail "Local wrangler missing. Run without -SkipInstall."
    exit 1
  }

  $whoamiOut = & npx --yes wrangler whoami 2>&1 | Out-String
  $whoamiExit = $LASTEXITCODE
  Write-Host $whoamiOut

  $loggedIn = ($whoamiExit -eq 0) -and ($whoamiOut -notmatch '(?i)not logged in|not authenticated|login required')

  if ($RefreshAuth -or -not $loggedIn) {
    if ($RefreshAuth) {
      Write-Warn "Refreshing Wrangler auth (-RefreshAuth)."
      Write-Host "Logging out of the current Wrangler session..."
      [void](Invoke-Wrangler @("logout"))
    } else {
      Write-Warn "Not logged in (or whoami failed). Starting login."
    }

    Write-Host "A browser window will open — pick the Cloudflare account that should own this Worker."
    $loginExit = Invoke-Wrangler @("login")
    if ($loginExit -ne 0) {
      Write-Fail "wrangler login failed"
      exit $loginExit
    }

    $whoamiOut = & npx --yes wrangler whoami 2>&1 | Out-String
    Write-Host $whoamiOut
  } else {
    Write-Ok "Wrangler is authenticated (see account/email above)."
    $switch = Read-Host "Wrong Cloudflare account? Log out and re-login now? [y/N]"
    if ($switch -match '^[Yy]') {
      [void](Invoke-Wrangler @("logout"))
      $loginExit = Invoke-Wrangler @("login")
      if ($loginExit -ne 0) {
        Write-Fail "wrangler login failed"
        exit $loginExit
      }
      $whoamiOut = & npx --yes wrangler whoami 2>&1 | Out-String
      Write-Host $whoamiOut
    }
  }

  Write-Host ""
  Write-Host "Tip: pin the account in wrangler.jsonc with `"account_id`": `"<id from whoami>`""
  Write-Host "     so deploys cannot land in the wrong account."
  Write-Host "     Multi-account workflows: https://developers.cloudflare.com/workers/wrangler/profiles/"
}

function Ensure-DevVars {
  Write-Step "Local secrets (.dev.vars)"
  $example = Join-Path $RepoRoot ".dev.vars.example"
  $devVars = Join-Path $RepoRoot ".dev.vars"

  if (-not (Test-Path $devVars)) {
    if (Test-Path $example) {
      Copy-Item $example $devVars
      Write-Ok "Created .dev.vars from .dev.vars.example — edit it before local/dev runs."
    } else {
      Write-Warn ".dev.vars.example missing; create .dev.vars manually."
    }
  } else {
    Write-Ok ".dev.vars already exists (left unchanged)"
  }
}

function Show-NextSteps {
  Write-Step "Next steps"
  Write-Host @"

1) Fill .dev.vars (CLIENT_ID, CLIENT_SECRET, ENV_URI, secrets)
   Local redirect: http://localhost:8787/callback/plugin

2) Jack Henry dashboard (test user, plugin, external app):
     https://jackhenry.dev/open-api-docs/getting-started/

3) Cloudflare MCP in Cursor:
     docs\setup-mcp.md

4) Run locally:
     npm run dev

5) First-time Cloudflare resources (when you deploy):
     npx wrangler kv namespace create SESSIONS_KV
     npx wrangler d1 create banno-pulse-goals
     npx wrangler d1 migrations apply banno-pulse-goals --remote
     npx wrangler secret put CLIENT_SECRET
     npx wrangler secret put SESSION_ENC_SECRET
     npx wrangler secret put COOKIE_SIGNING_SECRET

6) Deploy:
     .\scripts\deploy.ps1

Guides: README.md · docs\setup-banno.md · docs\setup-cloudflare.md · docs\setup-mcp.md

"@
}

Write-Host "Banno Pulse — Windows setup" -ForegroundColor White
Ensure-Node
Ensure-NpmInstall
Ensure-WranglerAuth
Ensure-DevVars
Show-NextSteps
Write-Host "Setup finished." -ForegroundColor Green
exit 0
