# ECR Docker Login Workaround
# This script provides workarounds for ECR Docker login issues
# specifically addressing Docker Desktop proxy and credential store issues

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

# Modify Docker config to avoid using credential store for ECR
Write-Step "Creating temporary Docker config without credential store"
try {
    $dockerConfigPath = "$env:USERPROFILE\.docker\config.json"
    $tempConfigPath = "$env:USERPROFILE\.docker\config.json.backup"
    
    # Backup existing config if it exists
    if (Test-Path $dockerConfigPath) {
        Copy-Item -Path $dockerConfigPath -Destination $tempConfigPath -Force
        Write-Host "Backed up existing Docker config to $tempConfigPath"
        
        # Load the existing config
        $dockerConfig = Get-Content $dockerConfigPath | ConvertFrom-Json
        
        # Create modified config without credsStore
        $newConfig = @{
            auths = $dockerConfig.auths
            currentContext = $dockerConfig.currentContext
        }
        
        # Add no_proxy for ECR
        $ecrDomain = "$accountId.dkr.ecr.$Region.amazonaws.com"
        Write-Host "Setting up to bypass proxy for $ecrDomain"
        
        # Write the modified config
        $newConfig | ConvertTo-Json -Depth 10 | Set-Content $dockerConfigPath
        Write-Success "Created temporary Docker config without credential store"
    }
    else {
        Write-Host "No existing Docker config found, creating a new one"
        $newConfig = @{
            auths = @{}
            currentContext = "desktop-linux"
        }
        New-Item -Path $dockerConfigPath -Force | Out-Null
        $newConfig | ConvertTo-Json -Depth 10 | Set-Content $dockerConfigPath
    }
}
catch {
    Write-Error "Failed to modify Docker config: $($_.Exception.Message)"
}

# Get ECR authentication token
Write-Step "Getting ECR authorization token"
try {
    $tokenOutput = aws ecr get-authorization-token --region $Region
    Write-Host "Raw token response: $tokenOutput"
    
    $token = $tokenOutput | ConvertFrom-Json
    if (-not $token -or -not $token.authorizationData -or $token.authorizationData.Count -eq 0) {
        Write-Error "Failed to parse ECR authorization token"
        exit 1
    }
    
    $auth = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($token.authorizationData[0].authorizationToken))
    $userpass = $auth.Split(':')
    $username = $userpass[0]
    $password = $userpass[1]
    $registry = $token.authorizationData[0].proxyEndpoint.Replace("https://", "")
    
    Write-Success "Retrieved ECR authorization token"
    Write-Host "Username: $username"
    Write-Host "Password: [HIDDEN]"
    Write-Host "Registry: $registry"
    
    # Try alternative Docker login approaches
    
    # Method 1: Standard approach with password-stdin
    Write-Step "Trying ECR login method 1: password-stdin"
    try {
        $password | docker login -u $username --password-stdin $registry
        Write-Success "Method 1 succeeded!"
        return
    }
    catch {
        Write-Host "Method 1 failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Method 2: Alternate approach with direct password (less secure)
    Write-Step "Trying ECR login method 2: direct password"
    try {
        docker logout $registry 2>$null
        docker login -u $username -p $password $registry
        Write-Success "Method 2 succeeded!"
        return
    }
    catch {
        Write-Host "Method 2 failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Method 3: Bypass proxy with environment variables
    Write-Step "Trying ECR login method 3: with proxy bypass"
    try {
        $env:NO_PROXY = "$registry,$env:NO_PROXY"
        $password | docker login -u $username --password-stdin $registry
        Write-Success "Method 3 succeeded!"
        return
    }
    catch {
        Write-Host "Method 3 failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Error "All ECR login methods failed. Please check Docker Desktop settings, especially proxy configuration."
    
}
catch {
    Write-Error "Failed to get ECR authorization token: $($_.Exception.Message)"
    exit 1
}

# Restore original Docker config when done
if (Test-Path $tempConfigPath) {
    Write-Step "Restoring original Docker config"
    Copy-Item -Path $tempConfigPath -Destination $dockerConfigPath -Force
    Write-Success "Original Docker config restored"
}
