#!/usr/bin/env pwsh
# ECR Authentication Fix Script
# This script addresses common issues with Docker authentication to AWS ECR

param(
    [string]$Region = "us-east-1",
    [switch]$ForceBasicAuth = $true,
    [switch]$BypassProxy = $true
)

$ErrorActionPreference = "Stop"

function Write-Color {
    param (
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param($Message)
    Write-Color "`n=== $Message ===" -Color Cyan
}

function Write-Success {
    param($Message)
    Write-Color "SUCCESS: $Message" -Color Green
}

function Write-Warning {
    param($Message)
    Write-Color "WARNING: $Message" -Color Yellow
}

function Write-Error {
    param($Message)
    Write-Color "ERROR: $Message" -Color Red
}

# Check AWS CLI version
Write-Step "Checking AWS CLI version"
$awsVersion = aws --version
Write-Host "Using $awsVersion"

# Verify AWS Credentials
Write-Step "Verifying AWS credentials"
try {
    $callerIdentity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Success "AWS credentials verified for account $($callerIdentity.Account)"
    $accountId = $callerIdentity.Account
} catch {
    Write-Error "Failed to verify AWS credentials: $($_.Exception.Message)"
    exit 1
}

# Prepare ECR URI
$ecrUri = "$accountId.dkr.ecr.$Region.amazonaws.com"
Write-Host "ECR URI: $ecrUri"

# Check Docker is running
Write-Step "Checking Docker status"
try {
    # Simple version check instead of full info
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running or command failed"
    }
    
    Write-Success "Docker is running (version $dockerVersion)"
} catch {
    # Even if the formatted version check failed, check if Docker exists at all
    try {
        docker --version
        Write-Warning "Docker exists but may have issues. Continuing anyway."
    } catch {
        Write-Error "Docker is not available: $($_.Exception.Message)"
        exit 1
    }
}

# Remove existing Docker credentials for ECR
Write-Step "Clearing existing Docker credentials for ECR"
try {
    docker logout $ecrUri 2>&1 | Out-Null
    if (Test-Path -Path "$env:USERPROFILE\.docker\config.json") {
        $dockerConfig = Get-Content "$env:USERPROFILE\.docker\config.json" | ConvertFrom-Json -Depth 10
        # Make a backup of the original config
        Copy-Item -Path "$env:USERPROFILE\.docker\config.json" -Destination "$env:USERPROFILE\.docker\config.json.bak" -Force
        
        # Remove the specific ECR entry
        if ($dockerConfig.auths.PSObject.Properties.Name -contains $ecrUri) {
            $dockerConfig.auths.PSObject.Properties.Remove($ecrUri)
            $dockerConfig | ConvertTo-Json -Depth 10 | Set-Content -Path "$env:USERPROFILE\.docker\config.json"
            Write-Success "Removed existing ECR credentials from Docker config"
        }
    }
} catch {
    Write-Warning "Failed to clear Docker credentials: $($_.Exception.Message)"
}

# Bypass proxy for AWS ECR if requested
if ($BypassProxy) {
    Write-Step "Checking for Docker proxy configuration"
    if (Test-Path -Path "$env:USERPROFILE\.docker\config.json") {
        $dockerConfig = Get-Content "$env:USERPROFILE\.docker\config.json" | ConvertFrom-Json -Depth 10
        if (($dockerConfig.proxies) -and 
            (($dockerConfig.proxies.default.httpProxy) -or 
             ($dockerConfig.proxies.default.httpsProxy))) {
            
            Write-Warning "Docker proxy settings detected, which may interfere with ECR authentication"
            
            # Create a no_proxy entry if it doesn't exist
            if (-not $dockerConfig.proxies.default.noProxy) {
                $dockerConfig.proxies.default | Add-Member -NotePropertyName "noProxy" -NotePropertyValue ""
            }
            
            # Add ECR URI to no_proxy if not already there
            if (-not $dockerConfig.proxies.default.noProxy.Contains($ecrUri)) {
                if ($dockerConfig.proxies.default.noProxy -ne "") {
                    $dockerConfig.proxies.default.noProxy += ",$ecrUri"
                } else {
                    $dockerConfig.proxies.default.noProxy = $ecrUri
                }
                
                # Save updated config
                $dockerConfig | ConvertTo-Json -Depth 10 | Set-Content -Path "$env:USERPROFILE\.docker\config.json"
                Write-Success "Added ECR URI to Docker proxy exceptions"
            } else {
                Write-Host "ECR URI already in proxy exceptions"
            }
        }
    }
}

# Method 1: Use standard ECR authentication with get-login-password
Write-Step "Trying ECR authentication Method 1: get-login-password"
try {
    aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrUri
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Method 1 succeeded!"
        exit 0
    } else {
        Write-Warning "Method 1 failed, trying alternative methods..."
    }
} catch {
    Write-Warning "Method 1 failed: $($_.Exception.Message)"
}

# Method 2: Manual authentication using explicit token parsing and basic auth
Write-Step "Trying ECR authentication Method 2: explicit token"
try {
    $token = aws ecr get-authorization-token --region $Region | ConvertFrom-Json
    if ($null -eq $token) {
        Write-Error "Failed to get ECR authorization token"
        exit 1
    }
    
    $auth = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($token.authorizationData[0].authorizationToken))
    $userpass = $auth.Split(':')
    $username = $userpass[0]
    $password = $userpass[1]
    $registry = $token.authorizationData[0].proxyEndpoint.Replace("https://", "")
    
    Write-Host "Retrieved ECR authorization token"
    Write-Host "Username: $username"
    Write-Host "Password: [HIDDEN]"
    Write-Host "Registry: $registry"
    
    # Use different docker login methods
    Write-Step "Trying ECR login method 1: password-stdin"
    $password | docker login -u $username --password-stdin $registry
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Method 2 succeeded with password-stdin!"
        exit 0
    }
    
    Write-Step "Trying ECR login method 2: direct password"
    docker login -u $username -p $password $registry
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Method 2 succeeded with direct password!"
        exit 0
    }
    
    # For maximum compatibility, write credentials directly to config.json if requested
    if ($ForceBasicAuth) {
        Write-Step "Trying ECR login method 3: direct config modification"
        
        $auth = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$username`:$password"))
        
        # Create a new Docker config with basic auth
        if (-not (Test-Path -Path "$env:USERPROFILE\.docker")) {
            New-Item -Path "$env:USERPROFILE\.docker" -ItemType Directory -Force | Out-Null
        }
        
        if (Test-Path -Path "$env:USERPROFILE\.docker\config.json") {
            $dockerConfig = Get-Content "$env:USERPROFILE\.docker\config.json" | ConvertFrom-Json -Depth 10
            
            # Make a backup
            Copy-Item -Path "$env:USERPROFILE\.docker\config.json" -Destination "$env:USERPROFILE\.docker\config.json.bak" -Force
            
            # Ensure auths object exists
            if (-not $dockerConfig.auths) {
                $dockerConfig | Add-Member -NotePropertyName "auths" -NotePropertyValue @{} -Force
            }
            
            # Add or update ECR auth
            $ecrAuth = @{
                "auth" = $auth
            }
            
            # PowerShell handles this differently depending on version
            if ($dockerConfig.auths -is [PSCustomObject]) {
                # PowerShell 5+
                if (-not ($dockerConfig.auths.PSObject.Properties.Name -contains $registry)) {
                    $dockerConfig.auths | Add-Member -NotePropertyName $registry -NotePropertyValue $ecrAuth -Force
                } else {
                    $dockerConfig.auths.$registry = $ecrAuth
                }
            } else {
                # Hashtable style
                $dockerConfig.auths[$registry] = $ecrAuth
            }
            
            # If credsStore exists, we may want to temporarily remove it
            if ($dockerConfig.PSObject.Properties.Name -contains "credsStore") {
                Write-Warning "Removing credsStore to ensure basic auth works"
                $dockerConfig.PSObject.Properties.Remove("credsStore")
            }
            
            # Save the config
            $dockerConfig | ConvertTo-Json -Depth 10 | Set-Content -Path "$env:USERPROFILE\.docker\config.json"
        } else {
            # Create a new config file
            $configJson = @{
                "auths" = @{
                    "$registry" = @{
                        "auth" = $auth
                    }
                }
            } | ConvertTo-Json -Depth 10
            
            Set-Content -Path "$env:USERPROFILE\.docker\config.json" -Value $configJson
        }
        
        Write-Success "Manually configured Docker authentication for ECR"
        exit 0
    }
    
} catch {
    Write-Error "Method 2 failed: $($_.Exception.Message)"
    exit 1
}

Write-Error "All ECR authentication methods failed"
exit 1
