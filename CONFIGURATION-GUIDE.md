# CONFIGURATION MANAGEMENT GUIDE

## Overview

This document explains how configuration is managed in TheRoundTable project, focusing on environment variables and API keys, particularly the OpenAI API key which is critical for the AI functionality.

## Configuration Files

The project uses multiple environment files:

- Root directory:
  - `.env.example` - Template for environment variables
  - `.env` - Main environment variables (set by config-manager.ps1)

- Backend directory:
  - `.env` - Main backend environment variables
  - `.env.local` - Local development environment variables
  - `.env.production` - Production environment variables

- Frontend directory:
  - `.env.local` - Local development environment variables
  - `.env.production` - Production environment variables
  - `src/config/environment.ts` - Hardcoded config for frontend

## Critical Environment Variables

Here are the most important environment variables:

| Variable | Purpose | Where Needed |
|----------|---------|--------------|
| OPENAI_API_KEY | API key for OpenAI integration | Backend, Lambda |
| AWS_REGION | AWS region for services | Backend, Frontend, Lambda |
| NODE_ENV | Environment (development/production) | Backend, Lambda |
| NEXT_PUBLIC_API_URL | Backend API endpoint | Frontend |

## Management Tools

Several tools are provided to manage configuration across environments:

1. **manage-theroundtable.ps1** - Central management script with menu options
2. **config-manager.ps1** - Synchronizes environment variables across all configs
3. **verify-configuration.ps1** - Tests configuration including API keys and services
4. **deploy-to-aws.ps1** - Deploys to AWS with proper environment variables

## How Configuration Is Used

1. **Backend**: Uses dotenv to load environment variables from `.env` file
2. **Frontend**: Uses Next.js built-in environment variable support for `.env.local` and `.env.production`
3. **AWS Lambda**: Environment variables set during deployment

## The OpenAI API Key Flow

1. Key is stored in backend `.env` file
2. During deployment, the key is read from `.env` or requested from user
3. Lambda function is updated with the key as an environment variable
4. Backend code loads the key from the environment
5. If the key is missing or invalid, appropriate error messages are shown

## Recommended Configuration Setup

1. Run the central management script:
   ```
   ./manage-theroundtable.ps1
   ```

2. Choose option 1 to configure the environment
3. Enter your OpenAI API key when prompted
4. Choose option 2 to verify the configuration
5. Choose option 3 to deploy to AWS

## Troubleshooting

If you encounter configuration issues:

1. Run the verification script:
   ```
   ./verify-configuration.ps1
   ```

2. Look for error messages about missing or invalid environment variables
3. Run the config manager to fix configuration issues:
   ```
   ./config-manager.ps1
   ```

4. Check Lambda environment variables in AWS console
5. Verify that `OPENAI_API_KEY` is properly set in Lambda

## Important Notes

- Never commit `.env` files to source control (they contain secrets)
- Always keep `.env.example` updated with the required variables (without actual values)
- The config-manager.ps1 script will synchronize all environment files
- After deployment, verify Lambda environment variables
