# Helper script to authenticate Docker with AWS ECR
# This fixes the issues with ECR login when using environment variables

param(
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param($Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "SUCCESS: $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

# Ensure AWS credentials are available
if (-not $env:AWS_ACCESS_KEY_ID -or -not $env:AWS_SECRET_ACCESS_KEY) {
    if (Test-Path -Path ".env") {
        Write-Step "Loading AWS credentials from .env file"
        Get-Content ".env" | ForEach-Object {
            if ($_ -match "^AWS_ACCESS_KEY_ID=(.*)$") {
                $env:AWS_ACCESS_KEY_ID = $Matches[1]
            }
            elseif ($_ -match "^AWS_SECRET_ACCESS_KEY=(.*)$") {
                $env:AWS_SECRET_ACCESS_KEY = $Matches[1]
            }
            elseif ($_ -match "^AWS_REGION=(.*)$") {
                $env:AWS_DEFAULT_REGION = $Matches[1]
            }
        }
    }
    else {
        Write-Error "AWS credentials not found in environment or .env file"
        exit 1
    }
}

# Set region if not provided
if (-not $env:AWS_DEFAULT_REGION) {
    $env:AWS_DEFAULT_REGION = $Region
}

Write-Step "Verifying AWS credentials"
try {
    $accountId = (aws sts get-caller-identity --query "Account" --output text).Trim()
    Write-Success "AWS credentials verified for account $accountId"
}
catch {
    Write-Error "Failed to verify AWS credentials: $($_.Exception.Message)"
    exit 1
}

# Get ECR authorization token
Write-Step "Getting ECR authorization token"
try {
    $token = aws ecr get-authorization-token --region $env:AWS_DEFAULT_REGION | ConvertFrom-Json
    $auth = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($token.authorizationData[0].authorizationToken))
    $userpass = $auth.Split(':')
    $username = $userpass[0]
    $password = $userpass[1]
    $registry = $token.authorizationData[0].proxyEndpoint
    $registry = $registry.Replace("https://", "")
    
    Write-Success "Retrieved ECR authorization token"
}
catch {
    Write-Error "Failed to get ECR authorization token: $($_.Exception.Message)"
    exit 1
}

# Login to ECR with Docker
Write-Step "Logging in to ECR with Docker"
try {
    $password | docker login -u $username --password-stdin $registry
    Write-Success "Successfully logged in to ECR at $registry"
}
catch {
    Write-Error "Failed to login to ECR: $($_.Exception.Message)"
    exit 1
}

# Output ECR registry URI for use in other scripts
Write-Host "ECR_REGISTRY=$registry" -ForegroundColor Green
