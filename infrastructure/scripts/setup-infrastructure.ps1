#!/usr/bin/env pwsh

# Configuration
$ProjectName = "theroundtable"
$Environment = "dev"
$Region = "us-east-1"
$DomainName = "theroundtable-ai.dev"

# Set AWS credentials from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            Set-Item -Path "env:$name" -Value $value
            Write-Host "Set $name environment variable"
        }
    }
}

# Verify AWS credentials
Write-Host "Verifying AWS credentials..."
Write-Host "Access Key: $env:AWS_ACCESS_KEY_ID"
Write-Host "Region: $env:AWS_REGION"

if ([string]::IsNullOrEmpty($env:AWS_ACCESS_KEY_ID) -or [string]::IsNullOrEmpty($env:AWS_SECRET_ACCESS_KEY)) {
    Write-Error "AWS credentials not found. Please ensure they are set in .env file."
    exit 1
}

# Install required tools if not present
function Install-RequiredTool {
    param (
        [string]$ToolName,
        [string]$WingetId
    )
    
    if (-not (Get-Command $ToolName -ErrorAction SilentlyContinue)) {
        Write-Host "Installing $ToolName..."
        winget install -e --id $WingetId
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}

Install-RequiredTool -ToolName "terraform" -WingetId "Hashicorp.Terraform"
Install-RequiredTool -ToolName "aws" -WingetId "Amazon.AWSCLI"

# Register domain using Route53
Write-Host "`n🌐 Registering domain: $DomainName" -ForegroundColor Cyan
try {
    # Check if domain is available
    $domainCheck = aws route53domains check-domain-availability --domain-name $DomainName | ConvertFrom-Json
    
    if ($domainCheck.Availability -eq "AVAILABLE") {
        Write-Host "Domain is available! Proceeding with registration..." -ForegroundColor Green
        
        # Register the domain
        aws route53domains register-domain `
            --domain-name $DomainName `
            --duration-in-years 1 `
            --auto-renew `
            --admin-contact file://contact.json `
            --registrant-contact file://contact.json `
            --tech-contact file://contact.json

        Write-Host "Domain registration initiated!" -ForegroundColor Green
    } else {
        Write-Host "Domain is not available. Please choose a different domain name." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Error "Failed to register domain: $_"
    exit 1
}

# Initialize and validate Terraform
Write-Host "`n🔧 Initializing Terraform..." -ForegroundColor Cyan
Set-Location terraform
.\terraform.exe init

if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform initialization failed"
    exit 1
}

Write-Host "`n✔️ Creating Terraform plan..." -ForegroundColor Cyan
.\terraform.exe plan -out=tfplan

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nTerraform plan created successfully!" -ForegroundColor Green
    Write-Host "Review the plan above and run 'terraform apply tfplan' to deploy" -ForegroundColor Yellow
} else {
    Write-Error "Terraform plan creation failed"
    exit 1
}
