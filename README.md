# TheRoundTable

A modern full-stack application enabling interactive conversations with historical figures using AI.

## Technology Stack

- **Frontend**: Next.js with TypeScript
- **Backend**: Node.js/Express with TypeScript
- **Infrastructure**: AWS with Terraform
- **Database**: DynamoDB
- **Caching**: Redis
- **AI Integration**: OpenAI API

## Prerequisites

- Node.js (v18 or later)
- Redis (v3.2 or later)
- AWS Account with appropriate permissions
- Docker (for containerization)
- Terraform (for infrastructure)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/theroundtable.git
   cd theroundtable
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. Install dependencies:
   ```bash
   # Install backend dependencies
   cd theroundtable-backend
   npm install

   # Install frontend dependencies
   cd ../theroundtable-frontend
   npm install
   ```

4. Start the development servers:
   ```bash
   # Start backend (from theroundtable-backend directory)
   npm run dev

   # Start frontend (from theroundtable-frontend directory)
   npm run dev
   ```

5. Visit http://localhost:3000 to see the application.

## Project Structure

```
theroundtable/
├── theroundtable-backend/    # Backend API server
├── theroundtable-frontend/   # Next.js frontend application
├── terraform/                # Infrastructure as Code
└── scripts/                  # Utility scripts
```

## Development

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write unit tests for new features
- Follow the established Git workflow

## Infrastructure

Infrastructure is managed with Terraform. See the `terraform/` directory for details.

## Testing

```bash
# Run backend tests
cd theroundtable-backend
npm test

# Run frontend tests
cd theroundtable-frontend
npm test
```

## Deployment

Deployment instructions are available in the deployment guide (see docs/deployment.md).

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
