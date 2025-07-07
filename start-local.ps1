# TheRoundTable - Local Development Starter
# Simple script to start local development environment

$ErrorActionPreference = "Continue"

Write-Host "🚀 Starting TheRoundTable Local Development Environment" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm packages are installed
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow

# Backend dependencies
Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

# Frontend dependencies  
Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Set-Location "c:\Users\Oreko\work\TheRoundTable"

Write-Host "`n🎯 Starting development servers..." -ForegroundColor Cyan

# Run OpenAI API key verification
Write-Host "Verifying OpenAI API key..." -ForegroundColor Yellow
Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend"

# Run API key verification
$verifyCommand = "npx ts-node src/verify-openai.ts"
Invoke-Expression $verifyCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: OpenAI API key verification failed. The application may have limited functionality." -ForegroundColor Red
    Write-Host "         Please check the error messages above and update the API key in the .env file." -ForegroundColor Red
    Write-Host "         Press any key to continue anyway or Ctrl+C to exit..." -ForegroundColor Yellow
    $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
}

# Start backend in new window with explicitly set environment variables
Write-Host "Starting backend on http://localhost:3001..." -ForegroundColor Yellow

# Read environment variables from .env file
$envFile = Join-Path "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend" ".env"
$envVars = @{}

if (Test-Path $envFile) {
    Write-Host "Loading environment variables from $envFile" -ForegroundColor Green
    $envContent = Get-Content $envFile
    
    foreach ($line in $envContent) {
        # Skip comments and empty lines
        if ($line.Trim() -eq "" -or $line.Trim().StartsWith("#")) {
            continue
        }
        
        if ($line -match "^([^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Remove quotes if they exist
            if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
                $value = $matches[1]
            }
            
            $envVars[$key] = $value
            
            if ($key -eq "OPENAI_API_KEY") {
                if ($value) {
                    Write-Host "Found OpenAI API key in .env file (starts with ${value.Substring(0, 4)}...)" -ForegroundColor Green
                }
            }
        }
    }
} else {
    Write-Host "No .env file found at $envFile" -ForegroundColor Yellow
}

# Generate environment variable setup script
$envSetup = ""
foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    $envSetup += "`$env:$key = '$value'`n"
}

# Set command with environment variables explicitly set
$command = @"
cd 'c:\Users\Oreko\work\TheRoundTable\theroundtable-backend'
Write-Host 'Backend Server' -ForegroundColor Green
Write-Host 'Setting up environment variables...' -ForegroundColor Yellow
$envSetup
Write-Host 'Environment variables loaded successfully' -ForegroundColor Green
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $command

# Wait a moment then start frontend
Start-Sleep -Seconds 3
Write-Host "Starting frontend on http://localhost:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend'; Write-Host 'Frontend Server' -ForegroundColor Green; npm run dev"

Write-Host "`n✅ Development environment started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "`nPress any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
