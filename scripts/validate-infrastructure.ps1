#!/bin/pwsh

# Check if Terraform is installed
$terraformVersion = terraform --version
if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform is not installed. Please install it first."
    exit 1
}

# Check if AWS credentials are configured
if (-not (Test-Path .env)) {
    Write-Error ".env file not found. Please create it with AWS credentials."
    exit 1
}

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value)
    }
}

# Validate AWS credentials
$env:AWS_ACCESS_KEY_ID = [Environment]::GetEnvironmentVariable("AWS_ACCESS_KEY_ID")
$env:AWS_SECRET_ACCESS_KEY = [Environment]::GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY")
$env:AWS_REGION = [Environment]::GetEnvironmentVariable("AWS_REGION")

if (-not $env:AWS_ACCESS_KEY_ID -or -not $env:AWS_SECRET_ACCESS_KEY -or -not $env:AWS_REGION) {
    Write-Error "AWS credentials not found in .env file"
    exit 1
}

# Initialize Terraform
Set-Location terraform
terraform init

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to initialize Terraform"
    exit 1
}

# Validate Terraform configuration
terraform validate

if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform configuration validation failed"
    exit 1
}

Write-Host "Infrastructure setup validation completed successfully"
