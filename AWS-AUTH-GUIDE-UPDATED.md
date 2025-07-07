# AWS Authentication Guide for TheRoundTable

This guide explains how to set up AWS authentication for local development and deployment.

## AWS Credentials Setup

1. **Set AWS Environment Variables**

   ```powershell
   $env:AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
   $env:AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
   $env:AWS_DEFAULT_REGION="us-east-1"
   ```

2. **Create/Update .env File**

   Add the following lines to your `.env` file:
   ```
   AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
   AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
   AWS_REGION=us-east-1
   ```

3. **Verify AWS Credentials**

   Run this command to check if your AWS credentials are working:
   ```powershell
   aws sts get-caller-identity
   ```

   You should see output like:
   ```json
   {
       "UserId": "AIDAXXXXXXXXXXXXXXXXX",
       "Account": "123456789012",
       "Arn": "arn:aws:iam::123456789012:user/username"
   }
   ```

## Docker and ECR Authentication

### Known Issue: 400 Bad Request with Docker Login

We're currently experiencing an issue where Docker login to ECR fails with a "400 Bad Request" error, even though AWS credentials are valid and working for other AWS operations.

**Possible causes:**
1. Docker credential store configuration issue
2. Docker Desktop version incompatibility
3. Proxy or network configuration issue
4. IAM permission issues with ECR

### Workarounds:

#### 1. Deploy Lambda Functions Directly

You can deploy Lambda functions directly without using Docker:

```powershell
cd c:\Users\Oreko\work\TheRoundTable\theroundtable-backend
aws lambda update-function-code --function-name theroundtable-backend-dev --zip-file fileb://dist/lambda.zip
```

#### 2. Try Alternative Docker Authentication

In case the standard ECR login doesn't work:

```powershell
# Clear Docker credentials
Remove-Item -Path "$env:USERPROFILE\.docker\config.json" -Force
docker logout 585842938390.dkr.ecr.us-east-1.amazonaws.com

# Manual login with explicit token
$token = aws ecr get-authorization-token --region us-east-1 | ConvertFrom-Json
$auth = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($token.authorizationData[0].authorizationToken))
$userpass = $auth.Split(':')
$username = $userpass[0]
$password = $userpass[1]
$registry = $token.authorizationData[0].proxyEndpoint.Replace("https://", "")
echo $password | docker login -u $username --password-stdin $registry
```

#### 3. Use AWS CLI Version 2

AWS CLI version 2 might handle ECR authentication better:

```powershell
# Install AWS CLI v2 if not already installed
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

## Required IAM Permissions

Ensure your AWS IAM user has these permissions:

- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:GetRepositoryPolicy`
- `ecr:DescribeRepositories`
- `ecr:ListImages`
- `ecr:DescribeImages`
- `ecr:BatchGetImage`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecr:PutImage`

The easiest way to ensure complete access for development is to attach the `AmazonECR-FullAccess` policy to your IAM user.
