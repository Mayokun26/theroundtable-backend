# GitHub Copilot Instructions for TheRoundTable

You are now enhanced with agentic capabilities specialized for TheRoundTable project. This is a full-stack application using:
- Frontend: Next.js with TypeScript
- Backend: Node.js/Express with TypeScript
- Infrastructure: AWS Serverless (Lambda, API Gateway)
- Database: DynamoDB
- Authentication: AWS Cognito

## Project-Specific Guidelines

1. Architecture Patterns:
   - Follow Next.js best practices for frontend components and pages
   - Use TypeScript for type safety across both frontend and backend
   - Implement proper error handling and logging
   - Follow RESTful API design principles
   - Use proper AWS service integration patterns

2. Code Organization:
   - Keep components modular and reusable
   - Maintain consistent file structure
   - Follow established naming conventions
   - Use proper TypeScript types and interfaces
   - Place shared types in dedicated type files

3. Security Practices:
   - Implement proper AWS IAM roles and policies
   - Handle authentication and authorization correctly
   - Protect sensitive configuration
   - Follow OWASP security guidelines
   - Use environment variables for secrets

4. Performance Considerations:
   - Optimize DynamoDB queries using proper key structures
   - Implement proper Lambda function timeouts
   - Follow Next.js performance best practices
   - Consider cold start implications for Lambda functions

5. Testing:
   - Write comprehensive unit tests
   - Include integration tests for critical paths
   - Test AWS service integrations
   - Validate frontend component behavior

## Standardization Requirements

1. File Naming:
   - React components: PascalCase (e.g., `CharacterCard.tsx`)
   - Utilities and services: camelCase (e.g., `aiService.ts`)
   - Test files: `*.test.ts` or `*.test.tsx`
   - API routes: camelCase (e.g., `characters.ts`)

2. Code Style:
   - Use arrow functions for React components
   - Use async/await for asynchronous operations
   - Implement proper error boundaries
   - Add JSDoc comments for public functions
   - Use proper TypeScript types instead of 'any'

3. State Management:
   - Use React Context for global state
   - Implement proper loading states
   - Handle errors gracefully
   - Use proper form validation

4. AWS Integration:
   - Use AWS SDK v3
   - Implement proper error handling for AWS services
   - Use IAM roles with least privilege
   - Handle Lambda cold starts appropriately

## Best Practices

1. Error Handling:
   ```typescript
   try {
     // Operation that might fail
   } catch (error) {
     if (error instanceof CustomError) {
       logger.error('Specific error handling', { error });
     } else {
       logger.error('Generic error handling', { error });
     }
     throw new ApplicationError('User-friendly message');
   }
   ```

2. React Components:
   ```typescript
   export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
     // Component logic
     return (
       <div>
         {/* JSX */}
       </div>
     );
   };
   ```

3. API Endpoints:
   ```typescript
   export const handler: APIGatewayProxyHandler = async (event) => {
     try {
       // Handler logic
       return {
         statusCode: 200,
         body: JSON.stringify({ data })
       };
     } catch (error) {
       return errorHandler(error);
     }
   };
   ```
