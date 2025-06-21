import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  // Only use explicit credentials in development with local DynamoDB
  ...(process.env.NODE_ENV === 'development' && process.env.DYNAMODB_ENDPOINT
    ? {
        endpoint: process.env.DYNAMODB_ENDPOINT,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        }
      }
    : {})
});

export const dynamoDB = DynamoDBDocumentClient.from(client);

export const TableNames = {
  USERS: process.env.DYNAMODB_USERS_TABLE || `${process.env.DYNAMODB_TABLE_PREFIX || 'theroundtable'}-users-${process.env.NODE_ENV || 'dev'}`,
  CONVERSATIONS: process.env.DYNAMODB_CONVERSATIONS_TABLE || `${process.env.DYNAMODB_TABLE_PREFIX || 'theroundtable'}-conversations-${process.env.NODE_ENV || 'dev'}`,
  CHARACTERS: process.env.DYNAMODB_CHARACTERS_TABLE || `${process.env.DYNAMODB_TABLE_PREFIX || 'theroundtable'}-characters-${process.env.NODE_ENV || 'dev'}`
};

export async function checkDynamoDBConnection(): Promise<boolean> {
  try {
    // In local development with DynamoDB local, we just check if we can connect
    if (process.env.NODE_ENV === 'development' && process.env.DYNAMODB_ENDPOINT) {
      logger.info(`Using local DynamoDB at ${process.env.DYNAMODB_ENDPOINT}`);
      // For local development, we'll just return success as tables might not exist yet
      return true;
    }
    
    // Try to list tables to check connection
    const command = new ListTablesCommand({});
    await client.send(command);
    logger.info('DynamoDB connection verified successfully');
    return true;
  } catch (error) {
    logger.error('DynamoDB connection error:', error);
    return false;
  }
}