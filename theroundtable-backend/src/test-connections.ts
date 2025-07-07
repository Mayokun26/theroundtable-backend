// filepath: c:\Users\Oreko\work\TheRoundTable\theroundtable-backend\src\test-connections.ts
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { OpenAI } from 'openai';
import { ListTablesCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { logger } from './utils/logger';

dotenv.config();

async function testConnections() {
  console.log('\n🔍 Testing Environment Variables:\n');
  
  // Check required environment variables
  const requiredVars = [
    'AWS_REGION', 
    'DYNAMODB_TABLE_PREFIX',
    'REDIS_HOST',
    'REDIS_PORT',
    'OPENAI_API_KEY'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing ${varName}`);
    } else {
      console.log(`✅ ${varName} is set`);
    }
  }

  console.log('\n🔍 Testing DynamoDB Connection:\n');
  try {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      },
      ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {})
    });

    const command = new ListTablesCommand({});
    const result = await client.send(command);
    console.log('✅ DynamoDB connected successfully');
    console.log('📋 Tables in DynamoDB:', result.TableNames);
  } catch (err) {
    console.error('❌ DynamoDB connection failed:', err);
  }

  console.log('\n🔍 Testing Redis Connection:\n');
  try {
    const redisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {})
    };

    const redis = new Redis(redisOptions);
    
    await redis.ping();
    console.log('✅ Redis connected successfully');
    
    // Test set and get
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log('📋 Redis test value:', value);
    
    await redis.quit();
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
  }

  console.log('\n🔍 Testing OpenAI API Connection:\n');
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key is missing');
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      console.log(`ℹ️ Found OpenAI API key starting with: ${apiKey.substring(0, 5)}...`);
      
      if (apiKey.includes('your-openai') || apiKey.startsWith('test_') || apiKey === 'fallback-key') {
        console.error('❌ OpenAI API key appears to be a placeholder value');
      } else {
        const openai = new OpenAI({ 
          apiKey: apiKey,
          timeout: 10000 // 10 second timeout for this test
        });
        
        console.log('✅ OpenAI API client initialized');
        
        // Make a minimal API call with retry logic
        console.log('🔄 Making a test API call to OpenAI...');
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: "Say hello for a connection test (1-5 words only)" }
            ],
            max_tokens: 10
          });
          
          if (completion.choices && completion.choices[0]) {
            console.log('✅ OpenAI API call successful!');
            console.log(`📋 Response: "${completion.choices[0].message.content}"`);
          } else {
            console.error('❌ OpenAI API call returned empty or invalid response');
          }
        } catch (apiError: any) {
          console.error(`❌ OpenAI API call failed: ${apiError.message}`);
          
          if (apiError.status === 401) {
            console.error('❌ Authentication error - API key is likely invalid');
          } else if (apiError.status === 429) {
            console.error('❌ Rate limit or quota exceeded');
          }
        }
      }
    }
  } catch (err: any) {
    console.error('❌ OpenAI API client initialization failed:', err.message || err);
  }

  console.log('\n✨ Connection tests completed\n');
}

// Run the tests
testConnections()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Tests failed with error:', err);
    process.exit(1);
  });
