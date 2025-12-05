# PowerShell script to deploy Interactive Lyrics Project to Vercel

Write-Host "🚀 Interactive Lyrics Project - Vercel Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "Checking for Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Vercel CLI first:" -ForegroundColor Yellow
    Write-Host "  npm install -g vercel" -ForegroundColor White
    Write-Host ""
    Write-Host "Or deploy via Vercel Dashboard:" -ForegroundColor Yellow
    Write-Host "  1. Push to Git: git add . && git commit -m 'Deploy' && git push" -ForegroundColor White
    Write-Host "  2. Go to: https://vercel.com/new" -ForegroundColor White
    Write-Host "  3. Import your repository" -ForegroundColor White
    Write-Host "  4. Set Root Directory to: interactive_lyrics_project" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Vercel CLI found!" -ForegroundColor Green
Write-Host ""

# Navigate to project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "📁 Current directory: $scriptPath" -ForegroundColor Cyan
Write-Host ""

# Check if user is logged in
Write-Host "Checking Vercel authentication..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Vercel!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Logging in to Vercel..." -ForegroundColor Yellow
    vercel login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Authenticated!" -ForegroundColor Green
Write-Host ""

# Deploy to production
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Cyan
Write-Host ""

vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your site is now live! 🎉" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running with debug mode:" -ForegroundColor Yellow
    Write-Host "  vercel --prod --debug" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
