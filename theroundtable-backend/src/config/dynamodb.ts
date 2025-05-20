import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export const dynamoDB = DynamoDBDocumentClient.from(client);

export const TableNames = {
  USERS: `${process.env.PROJECT_NAME || 'theroundtable'}-users-${process.env.ENVIRONMENT || 'dev'}`,
  CONVERSATIONS: `${process.env.PROJECT_NAME || 'theroundtable'}-conversations-${process.env.ENVIRONMENT || 'dev'}`,
  MESSAGES: `${process.env.PROJECT_NAME || 'theroundtable'}-messages-${process.env.ENVIRONMENT || 'dev'}`
};

export async function checkDynamoDBConnection(): Promise<boolean> {
  try {
    // Try to describe one of our tables to check connection
    await client.send({
      TableName: TableNames.USERS
    });
    logger.info('DynamoDB connected successfully');
    return true;
  } catch (error) {
    logger.error('DynamoDB connection error:', error);
    return false;
  }
} 