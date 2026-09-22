# 🚀 Smart Productivity - Deployment Setup (Windows PowerShell)
# Run this script to prepare everything for DigitalOcean

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Smart Productivity - Deployment Setup                   ║" -ForegroundColor Cyan
Write-Host "║   This will prepare your code for DigitalOcean            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Check if git is initialized
Write-Host "STEP 1: Checking Git Setup..." -ForegroundColor Blue
if (Test-Path .git) {
    Write-Host "✓ Git repository already initialized" -ForegroundColor Green
} else {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git initialized" -ForegroundColor Green
}
Write-Host ""

# STEP 2: Stage all files
Write-Host "STEP 2: Preparing Files..." -ForegroundColor Blue
git add .
Write-Host "✓ All files staged" -ForegroundColor Green
Write-Host ""

# STEP 3: Create commit
Write-Host "STEP 3: Creating Initial Commit..." -ForegroundColor Blue
$status = git status --porcelain
if ($status) {
    git commit -m "Initial commit - Smart Productivity app with notifications, unified tasks, and extension"
    Write-Host "✓ Commit created" -ForegroundColor Green
} else {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}
Write-Host ""

# STEP 4: Setup GitHub remote
Write-Host "STEP 4: Setting up GitHub Remote..." -ForegroundColor Blue
Write-Host ""
$githubUsername = Read-Host "Enter your GitHub username"

if ([string]::IsNullOrEmpty($githubUsername)) {
    Write-Host "✗ GitHub username cannot be empty" -ForegroundColor Red
    exit 1
}

$repoUrl = "https://github.com/$githubUsername/smart-productivity.git"

# Check if remote exists
$remoteExists = git remote | Select-String "origin" -Quiet
if ($remoteExists) {
    Write-Host "Remote already exists. Updating..." -ForegroundColor Yellow
    git remote set-url origin $repoUrl
} else {
    git remote add origin $repoUrl
}

Write-Host "✓ Remote set to: $repoUrl" -ForegroundColor Green
Write-Host ""

# STEP 5: Push to GitHub
Write-Host "STEP 5: Pushing to GitHub..." -ForegroundColor Blue
Write-Host ""
Write-Host "⚠️  This may prompt for authentication. Follow these steps:" -ForegroundColor Yellow
Write-Host "  1. Use your GitHub username: $githubUsername"
Write-Host "  2. For password, use a Personal Access Token:"
Write-Host "     Go to: https://github.com/settings/tokens"
Write-Host "     Click 'Generate new token (classic)'"
Write-Host "     Check: repo, workflow, write:packages"
Write-Host "     Copy the token and paste as password"
Write-Host ""

git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to push to GitHub" -ForegroundColor Red
    Write-Host "Try running: git push -u origin main" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# STEP 6: Verify files
Write-Host "STEP 6: Verifying Deployment Files..." -ForegroundColor Blue
$files = @(
    "Dockerfile.api",
    "Dockerfile.web",
    "docker-compose.yml",
    "DEPLOYMENT.md",
    ".env.example",
    "apps/api/.env.production",
    "apps/web/.env.production"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file (missing)" -ForegroundColor Red
    }
}
Write-Host ""

# STEP 7: Summary
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "✓ LOCAL SETUP COMPLETE!" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  GET API KEYS (free services):" -ForegroundColor Cyan
Write-Host "   • Google Gemini: https://aistudio.google.com/app/apikey" -ForegroundColor White
Write-Host "   • VAPID Keys: Run in PowerShell:" -ForegroundColor White
Write-Host "     npm install -g web-push" -ForegroundColor Gray
Write-Host "     web-push generate-vapid-keys" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  UPDATE ENVIRONMENT VARIABLES:" -ForegroundColor Cyan
Write-Host "   • Edit: apps/api/.env.production" -ForegroundColor White
Write-Host "   • Add your API keys from step 1" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  CREATE DIGITALOCEAN ACCOUNT:" -ForegroundColor Cyan
Write-Host "   • Go to: https://www.digitalocean.com" -ForegroundColor White
Write-Host "   • Click 'Sign Up'" -ForegroundColor White
Write-Host "   • Use GitHub to sign up (easier)" -ForegroundColor White
Write-Host "   • Add payment method (credit card)" -ForegroundColor White
Write-Host ""

Write-Host "4️⃣  DEPLOY ON DIGITALOCEAN:" -ForegroundColor Cyan
Write-Host "   • Dashboard: https://cloud.digitalocean.com/apps" -ForegroundColor White
Write-Host "   • Click 'Create Apps'" -ForegroundColor White
Write-Host "   • Select GitHub, authorize, choose your repo:" -ForegroundColor White
Write-Host "     $repoUrl" -ForegroundColor White
Write-Host "   • Add 3 services: API, Web, Database" -ForegroundColor White
Write-Host "   • Set environment variables" -ForegroundColor White
Write-Host "   • Deploy!" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   • DEPLOYMENT.md (full guide)" -ForegroundColor White
Write-Host "   • DEPLOYMENT_QUICK_REF.md (commands)" -ForegroundColor White
Write-Host ""

Write-Host "✅ Your code is on GitHub and ready to deploy!" -ForegroundColor Green
Write-Host ""
