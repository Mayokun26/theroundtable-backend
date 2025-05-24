import { APIGatewayProxyHandler } from 'aws-lambda';
import { app } from './server';
import serverless from 'serverless-http';

// Convert Express app to Lambda handler
const handler = serverless(app);

// Export the Lambda handler
export const lambdaHandler: APIGatewayProxyHandler = async (event, context) => {
  return await handler(event, context);
};
