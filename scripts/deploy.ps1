#!/usr/bin/env pwsh
# TheRoundTable Deployment Script

param(
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$All
)

$ErrorActionPreference = "Stop"

# Set default to deploy both if no parameters specified
if (-not $Frontend -and -not $Backend) {
    $All = $true
}

if ($All) {
    $Frontend = $true
    $Backend = $true
}

$workspaceRoot = Join-Path $PSScriptRoot ".."
$frontendPath = Join-Path $workspaceRoot "theroundtable-frontend"
$backendPath = Join-Path $workspaceRoot "theroundtable-backend"

# Deploy Frontend
if ($Frontend) {
    Write-Host "Deploying frontend..." -ForegroundColor Cyan
    
    Set-Location $frontendPath
    
    # Build and create docker image
    npm run deploy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Frontend deployment failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Frontend deployed successfully!" -ForegroundColor Green
}

# Deploy Backend
if ($Backend) {
    Write-Host "Deploying backend..." -ForegroundColor Cyan
    
    Set-Location $backendPath
    
    # Build and create docker image
    npm run deploy
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Backend deployment failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Backend deployed successfully!" -ForegroundColor Green
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green
