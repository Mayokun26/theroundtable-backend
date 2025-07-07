# TheRoundTable Simplified Deployment Guide

This guide provides clear instructions for deploying TheRoundTable application to AWS.

## Prerequisites

- AWS CLI installed and configured with correct credentials
- Node.js and npm installed
- Access to the GitHub repositories

## Deployment Steps

### 1. Backend Deployment

```powershell
# Navigate to backend directory
cd theroundtable-backend

# Install dependencies
npm install

# Build the project
npm run build

# Create deployment package
Compress-Archive -Path "dist\*", "node_modules" -DestinationPath lambda-deploy.zip -Force

# Deploy to Lambda (replace FUNCTION_NAME with your Lambda function name)
aws lambda update-function-code --function-name FUNCTION_NAME --zip-file fileb://lambda-deploy.zip --region us-east-1
```

### 2. Frontend Deployment

```powershell
# Navigate to frontend directory
cd theroundtable-frontend

# Ensure environment variables are set
# Check .env.production and .env.local files

# Install dependencies
npm install

# Build the project
npm run build

# Deploy to S3 (replace BUCKET_NAME with your S3 bucket name)
aws s3 sync out s3://BUCKET_NAME --delete

# Invalidate CloudFront cache (replace DISTRIBUTION_ID with your CloudFront distribution ID)
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*" --region us-east-1
```

### 3. Verifying Deployment

1. Check that the backend API is responding:
   ```
   curl https://api.theroundtableai.com/characters
   ```

2. Visit the website in a browser:
   ```
   https://theroundtableai.com
   ```

3. Test the conversation functionality by selecting panelists and starting a conversation.

## Troubleshooting

- **S3 Access Issues**: Verify your AWS credentials and bucket permissions
- **Lambda Errors**: Check CloudWatch logs for the Lambda function
- **API Not Responding**: Ensure API Gateway and Lambda are properly configured
- **Frontend Not Updating**: Make sure CloudFront cache was invalidated

## Important Notes

1. Never commit AWS credentials to GitHub
2. Keep backup copies of the deployment files
3. Always test in a development environment before deploying to production
4. Monitor AWS resources to avoid unexpected costs
