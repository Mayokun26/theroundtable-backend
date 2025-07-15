# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Considerations

**CRITICAL CONSTRAINTS** - Adhere strictly to these for the entire session:

- **Only edit files that already exist. Do not create new files.**
- **Before taking any action, always explain your reasoning step by step and state your intended changes out loud, Devin-style.**
- **Do not make assumptions about files, dependencies, or system state that are not explicitly mentioned.**
- **Confirm the plan with the user before showing any code.**
- **Ask questions for multiple rounds until you fully understand the requirements.**
- **You might not have access to .env or .gitignore files.**

## Git Workflow - IMPORTANT

**WSL Git Limitation**: Due to WSL networking issues with large repositories (262MB+), git push operations will timeout from within WSL.

**Required Workflow:**
1. **Make all code changes** in WSL/Claude Code as normal
2. **Commit changes locally** in WSL using standard git commands
3. **NEVER attempt git push from WSL** - it will timeout
4. **Provide PowerShell instructions** to the user for pushing changes
5. **User must run git push from Windows PowerShell** terminal

**PowerShell Commands to Provide:**
```powershell
cd "C:\Users\Oreko\work\theroundtable"
git status
git push origin [branch-name]
gh pr create --title "[title]" --body "[description]"
```

**Important**: Always provide absolute path commands to avoid directory confusion:
- For git operations: Start with `cd "C:\Users\Oreko\work\theroundtable"`
- For frontend operations: Start with `cd "C:\Users\Oreko\work\theroundtable\theroundtable-frontend"`
- For backend operations: Start with `cd "C:\Users\Oreko\work\theroundtable\theroundtable-backend"`

**This workflow is mandatory** - do not attempt WSL git push operations.

## Overview

TheRoundTable is a full-stack application for AI-powered conversations with historical figures. It consists of a Next.js frontend and Node.js/Express backend, deployed on AWS infrastructure.

## Repository Structure

The application is split across separate GitHub repositories:
- **Frontend**: https://github.com/Mayokun26/theroundtable-frontend
- **Backend**: https://github.com/Mayokun26/theroundtable-backend

**Note**: The current workspace contains both frontend and backend in subdirectories (`theroundtable-frontend/` and `theroundtable-backend/`), but the actual development and deployment happens from separate repositories.

## Development Commands

### Frontend (theroundtable-frontend)
```bash
cd theroundtable-frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm test            # Run tests
npm run deploy      # Build and deploy to AWS (includes S3 upload + CloudFront invalidation)
npm run deploy-local # Build and create Docker image (local development only)
```

### Backend (theroundtable-backend)
```bash
cd theroundtable-backend
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm test            # Run tests
npm run deploy      # Build and create Docker image
```

### Infrastructure
```bash
# From root directory
./scripts/validate-infrastructure.ps1  # Validate Terraform configuration
./scripts/deploy.ps1                   # Deploy frontend and/or backend
```

## Architecture

### Backend Structure
- **Entry Point**: `src/index.ts` - Initializes DynamoDB, Redis, and starts the server
- **Server Setup**: `src/server.ts` - Express app configuration with middleware
- **Routes**: RESTful API endpoints in `src/routes/`
  - `/api/health` - Health check endpoint
  - `/api/characters` - Character management
  - `/api/conversations` - Conversation handling
- **Database**: DynamoDB with AWS SDK for character and conversation data
- **Caching**: Redis for session management and performance optimization
- **Services**: AI integration through OpenAI API
- **Middleware**: Error handling, request logging, rate limiting, CORS

### Frontend Structure
- **Framework**: Next.js with TypeScript
- **UI Library**: Material-UI (MUI) with custom theme
- **State Management**: React Query for API state, local state for UI
- **Authentication**: AWS Amplify integration
- **Routing**: Next.js file-based routing
- **Components**: Reusable UI components in `src/components/`

### Key Configuration Files
- **Backend**: `tsconfig.json` uses CommonJS, path aliases with `@/*`
- **Frontend**: `tsconfig.json` uses Next.js plugin, path aliases with `@/*`
- **Both**: ESLint and TypeScript strict mode enabled

## Environment Setup

### Required Environment Variables
Backend requires:
- Database connection (DynamoDB via AWS SDK)
- Redis connection (optional, falls back gracefully)
- OpenAI API key
- AWS credentials for deployment

Frontend requires:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

### Development Prerequisites
- Node.js v18+
- Redis (optional for development)
- DynamoDB access (via AWS credentials)
- AWS credentials (for deployment)
- Docker (for containerization)

## Testing and Quality

Both frontend and backend have:
- Jest testing framework
- TypeScript strict mode
- ESLint configuration
- Type checking as separate npm script

Always run `npm run lint` and `npm run type-check` before deployment.

## Deployment

The application uses AWS S3 + CloudFront for frontend and AWS Lambda for backend:
- Frontend: Next.js static export deployed to S3 with CloudFront CDN
- Backend: Node.js Express server deployed to AWS Lambda
- Infrastructure: Terraform modules for AWS resources

### Frontend Deployment (Updated)
The frontend deployment is now fully integrated with AWS:

```bash
cd theroundtable-frontend
npm run deploy      # Complete AWS deployment (build + S3 upload + CloudFront invalidation)
```

This command:
1. Builds the Next.js static export
2. Uploads files to S3 bucket
3. Invalidates CloudFront cache for immediate updates
4. Deploys to https://theroundtableai.com

### Backend Deployment
```bash
cd theroundtable-backend
npm run deploy      # Build and create Docker image for Lambda deployment
```

### Infrastructure Deployment
```bash
# From root directory
./infrastructure/scripts/final-deploy.ps1  # Complete AWS infrastructure deployment
```

### Development vs Production Commands
- `npm run deploy` - Full AWS deployment (production)
- `npm run deploy-local` - Local Docker build only (development)

**Always run `npm run lint` and `npm run type-check` before deployment.**

## Database and API Integration

- **Character Data**: Stored in DynamoDB, cached in Redis
- **Conversations**: Persistent storage with real-time AI responses
- **Error Handling**: Graceful fallbacks when external services are unavailable
- **Rate Limiting**: Configured to prevent API abuse

## Development Tips

- Backend uses `ts-node-dev` for hot reloading during development
- Frontend development server runs on port 3000, backend on port 3001
- API health checks implemented for service monitoring
- Comprehensive error handling and logging throughout the application