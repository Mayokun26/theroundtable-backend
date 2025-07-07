# AWS Authentication Guide for TheRoundTable

This document explains how to properly set up AWS authentication for TheRoundTable project deployment.

## AWS Credentials Setup

### 1. Required AWS Credentials

For deploying TheRoundTable, you need AWS credentials with the following permissions:
- ECR (Elastic Container Registry) - for Docker image storage
- ECS (Elastic Container Service) - for container orchestration
- DynamoDB - for database access
- S3 - for frontend hosting
- CloudFront - for content delivery
- Lambda - for serverless functions
- Route 53 - for DNS management (if using custom domains)

### 2. Setting AWS Credentials

#### Option A: Environment Variables (Recommended for Development)

Set the following environment variables in your PowerShell session:

```powershell
$env:AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
$env:AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
$env:AWS_DEFAULT_REGION="us-east-1"  # Or your desired region
```

#### Option B: .env File (Recommended for Local Development)

Create or update the `.env` file in your project root:

```
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
```

⚠️ **IMPORTANT**: Ensure the `.env` file is included in `.gitignore` to prevent committing credentials.

#### Option C: AWS CLI Configuration

Run `aws configure` to set up your credentials:

```powershell
aws configure
```

This will prompt you for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region
- Default output format

### 3. Verifying AWS Authentication

To verify your AWS credentials are working:

```powershell
# Check AWS identity
aws sts get-caller-identity

# List ECR repositories
aws ecr describe-repositories

# Verify ECR Docker login
.\scripts\ecr-login.ps1
```

## Troubleshooting Docker ECR Authentication

If you encounter issues with Docker login to ECR (400 Bad Request errors), try these solutions:

### Solution 1: Use the ECR Login Helper Script

```powershell
# Run the helper script
.\scripts\ecr-login.ps1
```

### Solution 2: Docker Config Reset

If Docker credentials are corrupted:

1. Edit `%USERPROFILE%\.docker\config.json`
2. Remove any existing entries for ECR registries
3. Re-run the ECR login helper script

### Solution 3: Check AWS Credentials Permissions

Ensure your AWS user has the necessary permissions:
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecr:PutImage`

### Solution 4: Check Docker Network Settings

If Docker can't reach AWS services:
1. Verify Docker network settings
2. Check for any HTTP proxy settings
3. Ensure no firewalls are blocking Docker's outbound connections

## Deployment Instructions

For complete deployment instructions, follow the main [Deployment Guide](DEPLOYMENT-GUIDE.md).

For a simplified deployment process that handles AWS authentication automatically, use:

```powershell
# Build and deploy with all options
.\build-and-deploy.ps1 -Build -Deploy -All
```
