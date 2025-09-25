# TheRoundTable Backend

This is the backend service for TheRoundTable application, built with Node.js, TypeScript, and Express.

## 🚀 Technology Stack

- Node.js
- TypeScript
- Express.js
- DynamoDB
- Redis
- AWS Services (Cognito, ECS, etc.)

## 📋 Prerequisites

- Node.js 14+
- Redis
- AWS Account and configured credentials
- TypeScript

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/Mayokun26/theroundtable-backend.git
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
AWS_REGION=your-aws-region
REDIS_HOST=your-redis-host
REDIS_PORT=your-redis-port
OPENAI_API_KEY=your-openai-api-key
```

4. Build the TypeScript code:
```bash
npm run build
```

## 🚀 Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run start
```

## 📁 Project Structure

- `/src` - Source code
  - `/config` - Configuration files
  - `/routes` - API routes
  - `/middleware` - Express middleware
  - `/services` - Business logic
  - `/utils` - Utility functions

## 🔒 Security

- All sensitive information is stored in environment variables
- AWS credentials are managed through AWS SDK
- Input validation and sanitization implemented
- Rate limiting enabled
- CORS configured for frontend domains

## 🛠️ API Endpoints

- `/api/health` - Health check endpoint
- `/api/characters` - Character management
- `/api/conversations` - Conversation management

## 📦 Deployment

The application is containerized using Docker and can be deployed to AWS ECS.

## 🔄 CI/CD

Continuous integration and deployment is handled through AWS CodePipeline.
