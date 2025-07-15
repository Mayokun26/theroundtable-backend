# TheRoundTable AWS Deployment Script with proper cleanup
$ErrorActionPreference = "Stop"

Write-Host "TheRoundTable AWS Deployment Script" -ForegroundColor Cyan
Write-Host ""

# Configuration
$domainName = "theroundtableai.com"
$env:AWS_REGION = "us-east-1"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$frontendDir = Join-Path $projectRoot "theroundtable-frontend"
$backendDir = Join-Path $projectRoot "theroundtable-backend"

# Check AWS credentials
try {
    Write-Host "Validating AWS credentials..." -ForegroundColor Yellow
    $callerIdentity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "AWS credentials confirmed for: $($callerIdentity.Arn)" -ForegroundColor Green
}
catch {
    Write-Host "AWS credentials are invalid or not configured" -ForegroundColor Red
    Write-Host "Please run 'aws configure' to set up your AWS credentials" -ForegroundColor Yellow
    exit 1
}

# Set up environment variables
Write-Host "Configuring environment variables..." -ForegroundColor Yellow
$envFile = Join-Path $frontendDir ".env.production"
$apiUrl = "https://api.$domainName"
"NEXT_PUBLIC_API_URL=$apiUrl" | Out-File -FilePath $envFile -Force -Encoding utf8
Write-Host "Environment configured with API URL: $apiUrl" -ForegroundColor Green

# Go to the frontend directory
Set-Location $frontendDir

# Setup the output directory properly
Write-Host "Cleaning up previous build output..." -ForegroundColor Yellow
$outDir = Join-Path $frontendDir "out"
if (Test-Path $outDir) {
    try {
        # First attempt: try direct removal
        Remove-Item -Path $outDir -Recurse -Force -ErrorAction Stop
        Write-Host "Previous build output cleaned" -ForegroundColor Green
    } catch {
        # Second attempt: Using robocopy to empty the directory
        Write-Host "Direct removal failed, trying alternative cleanup..." -ForegroundColor Yellow
        $emptyDir = Join-Path $env:TEMP "empty_dir"
        if (-not (Test-Path $emptyDir)) {
            New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null
        }
        
        # Use robocopy to mirror empty directory (effectively emptying the target)
        robocopy $emptyDir $outDir /MIR /NFL /NDL /NJH /NJS /nc /ns /np
        
        # Now try removing the directory again
        if (Test-Path $outDir) {
            Write-Host "Manual cleanup of remaining files..." -ForegroundColor Yellow
            Get-ChildItem -Path $outDir -Recurse -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
        }
        
        Write-Host "Cleanup completed" -ForegroundColor Green
    }
}

# Run the ensure-images script to create placeholder images
Write-Host "Setting up placeholder images for fallback..." -ForegroundColor Yellow
node ensure-images.js

# Install dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend dependency installation failed" -ForegroundColor Red
    exit 1
}

# Make sure rimraf is installed (for clean directory removal)
Write-Host "Ensuring rimraf is available..." -ForegroundColor Yellow
npm install rimraf --save-dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "rimraf installation failed, but continuing anyway" -ForegroundColor Yellow
}

# Clean the out directory first
Write-Host "Cleaning output directory..." -ForegroundColor Yellow
npm run clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "Clean command failed, but continuing anyway..." -ForegroundColor Yellow
}

# Build app
Write-Host "Building frontend application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed" -ForegroundColor Red
    exit 1
}

# Check if build was successful
if (-not (Test-Path $outDir)) {
    Write-Host "Build output directory not found" -ForegroundColor Red
    exit 1
}

# Deploy to S3
Write-Host "Deploying to S3..." -ForegroundColor Yellow

# Sync with S3
aws s3 sync $outDir "s3://$domainName" --delete
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload to S3. Make sure bucket exists and permissions are correct." -ForegroundColor Red
    exit 1
}

# Invalidate CloudFront cache if CloudFront is being used
$distributionId = aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@, '$domainName')]].Id" --output text

if ($distributionId) {
    Write-Host "Invalidating CloudFront cache..." -ForegroundColor Yellow
    aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*"
    Write-Host "CloudFront invalidation initiated" -ForegroundColor Green
} else {
    Write-Host "No CloudFront distribution found for $domainName, skipping cache invalidation" -ForegroundColor Yellow
}

Write-Host "Website deployed successfully!" -ForegroundColor Green
Write-Host "Visit: https://$domainName" -ForegroundColor Cyan
