import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';
import { getEnv } from './env';

const env = getEnv();

const client = new DynamoDBClient({
  region: env.AWS_REGION,
  ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export const dynamoDB = DynamoDBDocumentClient.from(client);

export const TableNames = {
  USERS: `${env.PROJECT_NAME}-users-${env.ENVIRONMENT}`,
  CONVERSATIONS: `${env.PROJECT_NAME}-conversations-${env.ENVIRONMENT}`,
  MESSAGES: `${env.PROJECT_NAME}-messages-${env.ENVIRONMENT}`,
};

import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';

export async function checkDynamoDBConnection(): Promise<boolean> {
  try {
    // Try to describe one of our tables to check connection
    await client.send(new DescribeTableCommand({
      TableName: TableNames.USERS
    }));
    logger.info('DynamoDB connected successfully');
    return true;
  } catch (error) {
    logger.error('DynamoDB connection error:', error);
    return false;
  }
} 
