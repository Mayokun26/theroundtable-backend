# TheRoundTable - Build and Deploy Script
# Simplified single script for building and deploying the application

param(
    [switch]$Local,
    [switch]$Build,
    [switch]$Deploy,
    [switch]$All,
    [switch]$SkipInfra,
    [switch]$CommitToGit,
    [switch]$ForceCommit,
    [switch]$FixGitUpstream
)

$ErrorActionPreference = "Stop"

# AWS Configuration
$awsRegion = "us-east-1" # Or your desired region
$backendRepoName = "theroundtable-backend"
$frontendRepoName = "theroundtable-frontend"

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

function Get-AWSAccountId {
    try {
        # Get the AWS Account ID from the caller identity
        $accountId = (aws sts get-caller-identity --query "Account" --output text).Trim()
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to get AWS Account ID. Make sure you are logged in to AWS CLI."
        }
        return $accountId
    } catch {
        Write-Error "Error getting AWS Account ID: $($_.Exception.Message)"
        exit 1
    }
}

function Test-Docker {
    Write-Host "Checking if Docker is running..."
    docker info > $null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running. Please start Docker Desktop."
    }
}

function Test-GitCredentials {
    param(
        [string]$RepoPath
    )
    
    Set-Location $RepoPath
    
    # Check if git is configured with credentials
    $hasUserConfig = git config --get user.name
    $hasEmailConfig = git config --get user.email
    
    if (-not $hasUserConfig -or -not $hasEmailConfig) {
        Write-Host "Git user configuration is incomplete. Setting up default values..." -ForegroundColor Yellow
        
        if (-not $hasUserConfig) {
            git config --local user.name "TheRoundTable Deployment"
        }
        
        if (-not $hasEmailConfig) {
            git config --local user.email "deployment@theroundtableai.com"
        }
        
        Write-Host "Git user configuration updated" -ForegroundColor Green
    }
    
    # Ensure credential helper is properly configured
    $credentialHelper = git config --get credential.helper
    if (-not $credentialHelper) {
        Write-Host "Setting credential helper to store..." -ForegroundColor Yellow
        git config --local credential.helper store
    }
}

function Fix-GitUpstream {
    $currentBranch = git rev-parse --abbrev-ref HEAD
    
    # First, fetch latest information from remotes
    Write-Host "Fetching latest info from remotes..." -ForegroundColor Yellow
    git fetch --all 2>$null
    
    # Check if there's a problem with multiple upstreams
    $hasMultipleUpstreams = $false
    try {
        # First check if the branch has multiple upstreams configured
        $branchRemotes = git config --get-regexp "branch\.$currentBranch\.remote" 2>$null
        if (($branchRemotes -is [array]) -and ($branchRemotes.Count -gt 1)) {
            $hasMultipleUpstreams = $true
        } else {
            # Try a push dry-run to see if it would fail
            $gitPush = & git push --dry-run 2>&1
            $hasMultipleUpstreams = $gitPush -match "multiple upstream branches"
        }
    } catch {
        # If the command failed, likely due to multiple upstream issue
        $hasMultipleUpstreams = $LASTEXITCODE -ne 0
    }
    
    if ($hasMultipleUpstreams) {
        Write-Host "Detected multiple upstream branches for $currentBranch, attempting to fix..." -ForegroundColor Yellow
        
        # Get all the remotes
        $remotes = git remote
        if ($remotes -contains "origin") {
            # If origin exists, use it as the preferred remote
            Write-Host "Setting 'origin' as the sole upstream for branch $currentBranch" -ForegroundColor Yellow
            
            # First remove all branch.<branch>.merge and branch.<branch>.remote settings
            git config --unset-all "branch.$currentBranch.merge" 2>$null
            git config --unset-all "branch.$currentBranch.remote" 2>$null
            
            # Now set origin as the sole upstream
            git branch --set-upstream-to=origin/$currentBranch $currentBranch
            Write-Host "Fixed upstream configuration: $currentBranch is now tracking origin/$currentBranch" -ForegroundColor Green
        }
        elseif ($remotes.Count -gt 0) {
            # Use the first available remote
            $remote = $remotes[0]
            Write-Host "Setting '$remote' as the sole upstream for branch $currentBranch" -ForegroundColor Yellow
            
            # First remove all branch.<branch>.merge and branch.<branch>.remote settings
            git config --unset-all "branch.$currentBranch.merge" 2>$null
            git config --unset-all "branch.$currentBranch.remote" 2>$null
            
            # Now set the remote as the sole upstream
            git branch --set-upstream-to=$remote/$currentBranch $currentBranch
            Write-Host "Fixed upstream configuration: $currentBranch is now tracking $remote/$currentBranch" -ForegroundColor Green
        }
        else {
            Write-Host "No remotes found, cannot fix upstream configuration" -ForegroundColor Red
        }
    }
}

function Commit-GitChanges {
    param(
        [string]$RepoPath,
        [string]$RepoName,
        [string]$CommitMessage = "Auto commit from build script",
        [switch]$ForceCommit,
        [string]$PreferredRemote = "origin"
    )
    
    Set-Location $RepoPath
    
    # Ensure Git credentials are configured
    Test-GitCredentials -RepoPath $RepoPath
    
    # Fix multiple upstream configuration if it exists
    Fix-GitUpstream
    
    # Check if there are any changes
    $status = git status --porcelain
    
    if ($status) {
        Write-Host "Changes detected in $RepoName, committing..." -ForegroundColor Yellow
        git add .
        git commit -m $CommitMessage
    }
    elseif ($ForceCommit) {
        Write-Host "No changes detected in $RepoName, but creating empty commit as requested..." -ForegroundColor Yellow
        git commit --allow-empty -m "$CommitMessage [Empty commit]"
        
        # Get current branch name
        $currentBranch = git rev-parse --abbrev-ref HEAD
        
        # Get remote info
        $remotes = git remote
        $pushSuccess = $false
        
        if (-not $remotes) {
            Write-Error "No git remotes configured for $RepoName. Commit was made locally only."
            return
        }
        
        # First, check if we can determine the current branch's tracking info
        try {
            # Get all configured remotes for this branch
            $branchRemotes = & git config --get-regexp "branch\.$currentBranch\.remote" 2>$null
            
            if ($branchRemotes) {
                Write-Host "Multiple upstream branches detected for $currentBranch" -ForegroundColor Yellow
                # We'll handle the case where there are multiple upstreams
                foreach ($remote in $remotes) {
                    Write-Host "Attempting to push to $remote/$currentBranch..." -ForegroundColor Yellow
                    
                    # Try to push with alternative credential handling
                    try {
                        # First try using simple credential storage
                        $env:GIT_TERMINAL_PROMPT = "0" # Disable terminal prompting
                        & git -c credential.helper=store push $remote $currentBranch 2>&1 | Out-String | Write-Host
                        
                        if ($LASTEXITCODE -eq 0) {
                            $pushSuccess = $true
                            Write-Host "Successfully pushed to $remote/$currentBranch" -ForegroundColor Green
                            break
                        }
                    }
                    catch {
                        Write-Host "Error during git push: $($_.Exception.Message)" -ForegroundColor Yellow
                    }
                    finally {
                        $env:GIT_TERMINAL_PROMPT = $null
                    }
                }
            }
            else {
                # Try to get the single upstream configuration
                $upstreamInfo = & git rev-parse --abbrev-ref "$currentBranch@{upstream}" 2>$null
                if ($LASTEXITCODE -eq 0 -and $upstreamInfo) {
                    # We have a single upstream, so try pushing to it
                    Write-Host "Pushing to configured upstream $upstreamInfo..." -ForegroundColor Yellow
                    
                    try {
                        # Use simple credential storage
                        $env:GIT_TERMINAL_PROMPT = "0" # Disable terminal prompting
                        & git -c credential.helper=store push 2>&1 | Out-String | Write-Host
                        
                        if ($LASTEXITCODE -eq 0) {
                            $pushSuccess = $true
                        }
                    }
                    catch {
                        Write-Host "Error during git push: $($_.Exception.Message)" -ForegroundColor Yellow
                    }
                    finally {
                        $env:GIT_TERMINAL_PROMPT = $null
                    }
                }
            }
        }
        catch {
            Write-Host "Error determining git upstream: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
        # If not pushed yet, try common remotes
        if (-not $pushSuccess) {
            foreach ($remote in @("origin", "upstream", "github", $remotes[0])) {
                if (-not $pushSuccess -and $remotes -contains $remote) {
                    Write-Host "Trying to push to $remote/$currentBranch..." -ForegroundColor Yellow
                    
                    # Try to push with alternative credential handling
                    try {
                        # Use simple credential storage
                        $env:GIT_TERMINAL_PROMPT = "0" # Disable terminal prompting
                        & git -c credential.helper=store push $remote $currentBranch 2>&1 | Out-String | Write-Host
                        
                        if ($LASTEXITCODE -eq 0) {
                            $pushSuccess = $true
                            break
                        }
                    }
                    catch {
                        Write-Host "Error during git push: $($_.Exception.Message)" -ForegroundColor Yellow
                    }
                    finally {
                        $env:GIT_TERMINAL_PROMPT = $null
                    }
                }
            }
        }
        
        # Report result
        if ($pushSuccess) {
            Write-Success "$RepoName changes committed and pushed successfully"
        } else {
            Write-Host "WARNING: Committed changes to $RepoName locally, but push to remote failed." -ForegroundColor Yellow
            Write-Host "You may need to manually push changes later with: git push" -ForegroundColor Yellow
        }
    } else {
        if (-not $ForceCommit) {
            Write-Host "No changes detected in $RepoName" -ForegroundColor Yellow
        }
    }
}

# Set default to build and deploy if no parameters specified
if (-not $Local -and -not $Build -and -not $Deploy) {
    $All = $true
}

if ($All) {
    $Build = $true
    $Deploy = $true
}

try {
    # If FixGitUpstream is specified, fix Git upstream configuration for both repositories and exit
    if ($FixGitUpstream) {
        Write-Step "Fixing Git Upstream Configuration"
        
        # First, fix any credential helper issues
        Write-Host "Fixing Git credential configuration..." -ForegroundColor Yellow
        
        # Check for credential manager issues and switch to store if needed
        $credentialHelper = git config --global credential.helper
        if ($credentialHelper -eq "manager" -or $credentialHelper -eq "credential-manager") {
            Write-Host "Detected potential credential manager issue, switching to store..." -ForegroundColor Yellow
            git config --global credential.helper store
            Write-Host "Git credential helper set to 'store'" -ForegroundColor Green
        }
        
        Write-Host "Fixing backend Git configuration..." -ForegroundColor Yellow
        Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend"
        Test-GitCredentials -RepoPath "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend"
        Fix-GitUpstream
        
        Write-Host "Fixing frontend Git configuration..." -ForegroundColor Yellow
        Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend"
        Test-GitCredentials -RepoPath "c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend"
        Fix-GitUpstream
        
        Write-Success "Git configuration fixed for both repositories"
        Set-Location "c:\Users\Oreko\work\TheRoundTable"
        return
    }
    
    if ($Local) {
        Write-Step "Starting Local Development"
        
        # Check and update OpenAI API key in .env if needed
        $envFile = "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend\.env"
        if (Test-Path $envFile) {
            Write-Host "Checking OpenAI API key in .env file..." -ForegroundColor Yellow
            
            $envContent = Get-Content $envFile -Raw
            $apiKeyMatch = Select-String -Pattern "OPENAI_API_KEY=(.+)" -InputObject $envContent
            
            if ($apiKeyMatch -and $apiKeyMatch.Matches.Groups[1].Value) {
                $apiKey = $apiKeyMatch.Matches.Groups[1].Value
                Write-Host "Found OpenAI API key in .env file starting with: $($apiKey.Substring(0,5))..." -ForegroundColor Green
                
                # Verify the key format is valid
                if ($apiKey -notmatch "^sk-[a-zA-Z0-9]+") {
                    Write-Host "WARNING: OpenAI API key doesn't appear to be in the correct format (should start with 'sk-')" -ForegroundColor Yellow
                }
            } else {
                Write-Host "OpenAI API key not found or invalid in .env file" -ForegroundColor Yellow
            }
        } else {
            Write-Host "No .env file found at $envFile" -ForegroundColor Yellow
        }
        
        # Start backend with explicit environment variables
        Write-Host "Starting backend..." -ForegroundColor Yellow
        $backendCommand = @"
cd 'c:\Users\Oreko\work\TheRoundTable\theroundtable-backend'
Write-Host 'TheRoundTable Backend Server' -ForegroundColor Green
# Verify .env is loaded correctly
if (Test-Path '.env') {
    Write-Host 'Loading environment variables from .env' -ForegroundColor Yellow
    Get-Content .env | Where-Object {`$_ -match '^[^#]'} | ForEach-Object {
        if (`$_ -match '^(.+?)=(.+)$') {
            `$key = `$matches[1]
            `$value = `$matches[2]
            if (`$key -eq 'OPENAI_API_KEY') {
                Write-Host "Setting `$key environment variable (starts with `$(`$value.Substring(0,5))...)" -ForegroundColor Green
            } else {
                Write-Host "Setting `$key environment variable" -ForegroundColor Green
            }
            [Environment]::SetEnvironmentVariable(`$key, `$value, 'Process')
        }
    }
}
npm run dev
"@
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
        
        # Wait a moment then start frontend
        Start-Sleep -Seconds 3
        Write-Host "Starting frontend..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend'; npm run dev"
        
        Write-Success "Local development servers starting..."
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
        return
    }

    if ($Build) {
        Write-Step "Building Application"
        
        # Build backend
        Write-Host "Building backend..." -ForegroundColor Yellow
        Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend"
        
        # Create a custom build process to avoid the 'zip' command issue
        Write-Host "Building TypeScript files..." -ForegroundColor Yellow
        
        # Run TypeScript compilation only
        npm run tsc
        if ($LASTEXITCODE -ne 0) {
            throw "Backend TypeScript compilation failed"
        }
        
        # Check if dist folder was created
        if (Test-Path ".\dist") {
            Write-Host "TypeScript compilation succeeded, creating lambda.zip using PowerShell..." -ForegroundColor Yellow
            
            # Create lambda.zip manually using PowerShell
            Push-Location ".\dist"
            
            # Check if lambda.zip exists and remove it
            if (Test-Path ".\lambda.zip") {
                Remove-Item -Force ".\lambda.zip"
            }
            
            # Create the zip file
            Write-Host "Creating lambda.zip..." -ForegroundColor Yellow
            try {
                Compress-Archive -Path * -DestinationPath lambda.zip -Force -CompressionLevel Optimal
                if (-not (Test-Path ".\lambda.zip")) {
                    throw "Failed to create lambda.zip"
                }
                Write-Host "Lambda package created successfully" -ForegroundColor Green
            } catch {
                Write-Host "Warning: Could not create lambda.zip: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Host "This won't affect Docker builds but may impact Lambda deployments." -ForegroundColor Yellow
            }
            
            Pop-Location
        } else {
            throw "Backend build failed - dist folder not created"
        }
        Write-Success "Backend built successfully"
        
        # Build frontend
        Write-Host "Building frontend..." -ForegroundColor Yellow
        Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend"
        
        # Optimize system for build
        Write-Host "Optimizing system for build..." -ForegroundColor Yellow
        
        # Set NODE_OPTIONS to increase memory limit for Next.js build
        $env:NODE_OPTIONS = "--max_old_space_size=8192"
        Write-Host "Increased Node.js memory allocation to 8GB" -ForegroundColor Yellow
        
        # Clean up any previous build artifacts that might be using memory
        if (Test-Path ".\node_modules\.cache") {
            Write-Host "Clearing Next.js build cache..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force ".\node_modules\.cache" -ErrorAction SilentlyContinue
        }
        
        # Run additional backend configuration checks to ensure environment is set up properly
        Write-Host "Running backend environment validation..." -ForegroundColor Yellow
        Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend"
        $backendCheckResult = $true
        
        # Test if the OpenAI API key is available
        if (-not $env:OPENAI_API_KEY) {
            # Try to read from .env file
            if (Test-Path ".\.env") {
                $envContent = Get-Content ".\.env"
                foreach ($line in $envContent) {
                    if ($line -match "^OPENAI_API_KEY=(.+)$") {
                        $env:OPENAI_API_KEY = $matches[1]
                        Write-Host "OpenAI API key loaded from .env file" -ForegroundColor Green
                        break
                    }
                }
            }
        }
        
        # Verify OpenAI API key is valid
        if (-not $env:OPENAI_API_KEY) {
            Write-Host "WARNING: OPENAI_API_KEY environment variable is not set. API functionality will be limited." -ForegroundColor Yellow
            $backendCheckResult = $false
        }
        elseif ($env:OPENAI_API_KEY -match "your-openai|test_your_openai|fallback-key") {
            Write-Host "WARNING: OPENAI_API_KEY appears to be a placeholder value. API functionality will be limited." -ForegroundColor Yellow
            $backendCheckResult = $false
        }
        
        # Try to run the build with optimizations
        try {
            # First try with production optimization
            Write-Host "Building with production optimizations..." -ForegroundColor Yellow
            $env:NODE_ENV = "production"
            npm run build
            
            if ($LASTEXITCODE -ne 0) {
                # If that fails, try with development mode which uses less memory
                Write-Host "Production build failed, trying development build..." -ForegroundColor Yellow
                $env:NODE_ENV = "development"
                npm run build
                
                if ($LASTEXITCODE -ne 0) {
                    throw "Frontend build failed in both production and development modes"
                } else {
                    Write-Host "Development build succeeded! Note: This is not optimized for production." -ForegroundColor Yellow
                }
            }
        }
        catch {
            throw "Frontend build failed: $($_.Exception.Message)"
        }
        finally {
            # Reset environment variables after build
            $env:NODE_OPTIONS = ""
            $env:NODE_ENV = ""
        }
        
        Write-Success "Frontend built successfully"
        
        Set-Location "c:\Users\Oreko\work\TheRoundTable"
    }

    if ($Deploy) {
        Write-Step "Deploying to AWS"

        if (-not $SkipInfra) {
            # Deploy infrastructure
            Write-Host "Deploying infrastructure..." -ForegroundColor Yellow
            Set-Location "c:\Users\Oreko\work\TheRoundTable\terraform"
            terraform init
            terraform plan -out=tfplan
            terraform apply -auto-approve tfplan
            if ($LASTEXITCODE -ne 0) { throw "Infrastructure deployment failed" } 
            Write-Success "Infrastructure deployed successfully"
        } else {
            Write-Step "Skipping infrastructure deployment"
        }

        # Docker Deployment
        Test-Docker
        $accountId = Get-AWSAccountId
        $ecrUri = "$accountId.dkr.ecr.$awsRegion.amazonaws.com"
        
        # Check if ECR repositories exist and create them if they don't
        Write-Host "Checking if ECR repositories exist..." -ForegroundColor Yellow
        
        # Check and create backend repository if it doesn't exist
        try {
            aws ecr describe-repositories --repository-names $backendRepoName --region $awsRegion 2>$null
        } catch {
            Write-Host "Creating backend ECR repository..." -ForegroundColor Yellow
            aws ecr create-repository --repository-name $backendRepoName --region $awsRegion
            if ($LASTEXITCODE -ne 0) { throw "Failed to create backend ECR repository" }
        }
        
        # Check and create frontend repository if it doesn't exist
        try {
            aws ecr describe-repositories --repository-names $frontendRepoName --region $awsRegion 2>$null
        } catch {
            Write-Host "Creating frontend ECR repository..." -ForegroundColor Yellow
            aws ecr create-repository --repository-name $frontendRepoName --region $awsRegion
            if ($LASTEXITCODE -ne 0) { throw "Failed to create frontend ECR repository" }
        }

        # Authenticate Docker to ECR
        Write-Host "Authenticating Docker to ECR..." -ForegroundColor Yellow
        # Try the improved ECR login method from our helper script
        try {
            # Run the ECR login helper script
            Write-Host "Using improved ECR login script..." -ForegroundColor Yellow
            & "$PSScriptRoot\scripts\ecr-login.ps1" -Region $awsRegion
            if ($LASTEXITCODE -ne 0) { throw "Improved ECR login failed" }
        }
        catch {
            Write-Host "Falling back to standard ECR login..." -ForegroundColor Yellow
            # Fall back to the original method if the helper fails
            aws ecr get-login-password --region $awsRegion | docker login --username AWS --password-stdin $ecrUri
            if ($LASTEXITCODE -ne 0) { throw "ECR login failed" }
        }

        # Backend Docker Deployment
        Write-Host "Building and pushing backend Docker image..." -ForegroundColor Yellow
        Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend"
        
        # Print the ECR URI for debugging
        Write-Host "ECR URI: $ecrUri/$backendRepoName:latest" -ForegroundColor Yellow
        
        # Use separate variables for better visibility
        $backendImageTag = "$ecrUri/$backendRepoName`:latest"
        $frontendImageTag = "$ecrUri/$frontendRepoName`:latest"
        
        Write-Host "Backend image tag: $backendImageTag" -ForegroundColor Yellow
        
        docker build -t $backendImageTag .
        if ($LASTEXITCODE -ne 0) { throw "Backend Docker build failed" }
        docker push $backendImageTag
        if ($LASTEXITCODE -ne 0) { throw "Backend Docker push failed" }
        Write-Success "Backend Docker image pushed successfully"

        # Frontend Docker Deployment
        Write-Host "Building and pushing frontend Docker image..." -ForegroundColor Yellow
        Set-Location "c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend"
        
        Write-Host "Frontend image tag: $frontendImageTag" -ForegroundColor Yellow
        
        docker build -t $frontendImageTag .
        if ($LASTEXITCODE -ne 0) { throw "Frontend Docker build failed" }
        docker push $frontendImageTag
        if ($LASTEXITCODE -ne 0) { throw "Frontend Docker push failed" }
        Write-Success "Frontend Docker image pushed successfully"

        # Update ECS Services
        Write-Host "Updating ECS services..." -ForegroundColor Yellow
        $ecsClusterName = "theroundtable-dev"
        
        try {
            # Check if cluster exists
            $clusterExists = aws ecs describe-clusters --clusters $ecsClusterName --query "clusters[0].clusterName" --output text 2>$null
            
            if ($clusterExists -eq $ecsClusterName) {
                aws ecs update-service --cluster $ecsClusterName --service "theroundtable-backend-dev" --force-new-deployment --region $awsRegion
                aws ecs update-service --cluster $ecsClusterName --service "theroundtable-frontend-dev" --force-new-deployment --region $awsRegion
                Write-Success "ECS services updated successfully"
            } else {
                Write-Host "ECS cluster $ecsClusterName not found. Skipping service update." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Warning: Could not update ECS services: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
        Set-Location "c:\Users\Oreko\work\TheRoundTable"
        Write-Success "Deployment completed successfully"
    }

    # Commit changes to GitHub repositories if flag is set
    if ($CommitToGit) {
        Write-Step "Committing changes to GitHub"
        
        # Test and configure Git credentials for both repositories
        Write-Host "Checking Git credentials..." -ForegroundColor Yellow
        Test-GitCredentials -RepoPath "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend"
        Test-GitCredentials -RepoPath "c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend"
        
        # Commit backend changes
        Commit-GitChanges -RepoPath "c:\Users\Oreko\work\TheRoundTable\theroundtable-backend" -RepoName "Backend" -CommitMessage "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForceCommit:$ForceCommit
        
        # Commit frontend changes
        Commit-GitChanges -RepoPath "c:\Users\Oreko\work\TheRoundTable\theroundtable-frontend" -RepoName "Frontend" -CommitMessage "Deployment update $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForceCommit:$ForceCommit
        
        Write-Success "Git operations completed"
    }
    
} catch {
    Write-Error "Error: $($_.Exception.Message)"
    exit 1
} finally {
    Set-Location "c:\Users\Oreko\work\TheRoundTable"
}

Write-Host "`nAll tasks completed successfully!" -ForegroundColor Green
