# TheRoundTable Deployment Guide

This guide provides step-by-step instructions for deploying TheRoundTable application, both locally for development and to AWS for production.

## Prerequisites

1. AWS credentials with appropriate permissions
2. Node.js and npm installed
3. PowerShell (Windows) or equivalent shell
4. Docker installed (for local DynamoDB)
5. AWS CLI installed and configured

## Local Development Setup

### 1. Configure the Development Environment

Run the primary setup script:

```powershell
.\setup.ps1
```

This will:
- Set up DynamoDB Local in a Docker container
- Create the required tables
- Seed initial character data
- Install dependencies for both frontend and backend

### 2. Start the Development Environment

To start the development servers:

```powershell
.\start-dev.ps1
```

This will:
- Ensure DynamoDB Local is running
- Start the backend server
- Start the frontend development server

## AWS Deployment

### 1. Update AWS Credentials

First, ensure your AWS credentials are configured:

```powershell
.\update-aws-credentials.ps1
```

### 2. Deploy the Complete Application

For a full deployment of both frontend and backend:

```powershell
.\direct-deploy-to-aws.ps1
```

This will:
- Build the frontend
- Build the backend
- Apply Terraform configuration
- Deploy the frontend to S3
- Deploy the backend to Lambda
- Invalidate the CloudFront cache

### 3. Deploy Frontend Only

If you only need to update the frontend:

```powershell
.\deploy-frontend-to-aws.ps1
```

### 4. Deploy Backend Only

If you only need to update the backend API:

```powershell
.\deploy-backend-to-aws.ps1
```

## Troubleshooting

### Frontend Build Issues

If the frontend build fails:

1. Try the fix-frontend-build script:
```powershell
.\fix-frontend-build.ps1
```

2. Check for compatibility issues in package.json:
```powershell
cd theroundtable-frontend
npm install --legacy-peer-deps
```

3. Clear npm cache and node_modules:
```powershell
npm cache clean --force
Remove-Item -Path "node_modules" -Recurse -Force
npm install
```

### AWS Deployment Issues

1. Verify AWS credentials:
```powershell
aws sts get-caller-identity
```

2. Check Terraform state:
```powershell
cd terraform
terraform state list
```

3. Manual S3 sync:
```powershell
cd theroundtable-frontend
aws s3 sync out s3://YOUR-BUCKET-NAME --delete
```

4. Manual Lambda update:
```powershell
cd theroundtable-backend
aws lambda update-function-code --function-name YOUR-LAMBDA-NAME --zip-file fileb://dist/lambda.zip
```

## Deployment Verification

After deployment, verify your application:

1. Frontend: Visit https://theroundtableai.com
2. API: Test endpoints at https://api.theroundtableai.com

## Monitoring and Maintenance

- CloudWatch Logs: Check Lambda function logs
- S3 Access Logs: Monitor frontend access
- DynamoDB: Monitor table usage and throughput

## Next Steps for CI/CD

Future improvements could include:
- GitHub Actions workflow for automated deployments
- Separate staging and production environments
- Automated testing before deployment
- Rollback mechanisms for failed deployments
