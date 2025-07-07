# AWS Configuration Guide for The Round Table

This guide provides instructions for configuring your AWS account before deploying The Round Table application to theroundtableai.com.

## Prerequisites

1. An AWS account with administrative access
2. AWS CLI installed and configured
3. Domain name registered (theroundtableai.com)

## Initial Account Setup

### 1. Configure AWS CLI

```powershell
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, default region (us-east-1), and output format (json).

### 2. Verify AWS Credentials

Run the test script to verify your AWS credentials and permissions:

```powershell
.\scripts\test-aws-deployment.ps1
```

### 3. Register Domain (if not already registered)

If you haven't already registered theroundtableai.com, you can do so through AWS Route 53:

```powershell
.\scripts\register-domain.ps1 -DomainName theroundtableai.com
```

## Required IAM Permissions

Your AWS user/role should have the following permissions:

- AmazonS3FullAccess
- AmazonDynamoDBFullAccess
- AmazonAPIGatewayAdministrator
- AWSLambda_FullAccess
- AmazonRoute53FullAccess
- AmazonCloudFrontFullAccess
- AWSCertificateManagerFullAccess
- IAMFullAccess (for creating service roles)

## AWS Services Configuration

### 1. Route 53

- Domain: theroundtableai.com
- Hosted Zone: create for domain management

### 2. ACM Certificate

- Primary domain: theroundtableai.com 
- Alternative names: *.theroundtableai.com

### 3. S3 Buckets

- Primary bucket: theroundtableai.com (for website hosting)
- Logging bucket: logs.theroundtableai.com (optional)

### 4. CloudFront Distribution

- Origin: S3 bucket
- SSL Certificate: ACM Certificate
- Custom domain: theroundtableai.com

### 5. API Gateway

- API type: HTTP API
- Custom domain: api.theroundtableai.com
- Integration: Lambda

### 6. Lambda Function

- Runtime: Node.js 18.x
- Handler: lambda.handler
- IAM Role: with permissions for DynamoDB, CloudWatch

### 7. DynamoDB Tables

- characters
- conversations
- users

### 8. Redis for ElastiCache (optional)

- Node Type: cache.t2.micro (for dev)
- Engine: Redis

## Deployment

Once AWS is properly configured, run the deployment script:

```powershell
.\deploy-to-aws.ps1
```

This script will:
1. Build the frontend and backend
2. Deploy infrastructure with Terraform
3. Upload artifacts to S3 and Lambda
4. Configure CloudFront

## Verification

After deployment, verify the application is working:
- Website: https://theroundtableai.com
- API: https://api.theroundtableai.com/api/health

## Troubleshooting

### CloudFront Distribution Not Found
Check the CloudFront distribution status in the AWS Console. It may take up to 30 minutes to deploy.

### Certificate Validation Issues
Verify the ACM certificate status. For domain validation, ensure DNS records are correctly set up.

### API Gateway Connection Issues
Check Lambda permissions and API Gateway integrations in the AWS Console.

### S3 Access Denied
Verify bucket policy and CloudFront origin access identity permissions.

## Cost Considerations

The infrastructure deployed by this project uses the following billable AWS resources:
- S3 storage and requests
- CloudFront data transfer and requests
- Lambda invocations
- DynamoDB read/write capacity
- Route 53 hosted zone
- ACM certificate (free, but requires DNS validation)

For cost optimization, consider:
- Using provisioned capacity for DynamoDB in production
- Setting up proper CloudFront cache behaviors
- Configuring Lambda memory and timeout settings appropriately
