# TheRoundTable - Simplified

A minimal AI-powered conversation platform with historical and fictional characters.

## Project Structure

```
TheRoundTable/
├── theroundtable-frontend/    # Next.js frontend
├── theroundtable-backend/     # Express.js backend  
├── terraform/                 # AWS infrastructure
├── build-and-deploy.ps1      # Single deployment script
├── start-local.ps1           # Local development
└── README.md                 # This file
```

## What It Does

- Frontend: Character selection interface with conversation UI
- Backend: REST API with character and conversation endpoints
- OpenAI Integration: GPT-powered character conversations
- AWS Deployment: Lambda, DynamoDB, S3, CloudFront

## Quick Start

1. **Local Development**
   ```powershell
   .\start-local.ps1
   ```

2. **Deploy to AWS**
   ```powershell
   .\build-and-deploy.ps1
   ```

## Core Components

- **Characters**: 5 pre-defined historical/fictional characters
- **Conversations**: OpenAI-powered character dialogues
- **Simple UI**: Material-UI based interface
- **AWS Infrastructure**: Serverless deployment

## Environment Variables

See `.env.example` in backend and frontend directories.

Key variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `AWS_REGION`: AWS deployment region
- `NEXT_PUBLIC_API_URL`: Backend API URL
