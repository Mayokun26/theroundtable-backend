import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { OpenAI } from 'openai';

dotenv.config();

async function testConnections() {
  console.log('\n🔍 Testing Environment Variables:\n');
  
  // Check required environment variables
  const requiredVars = [
    'MONGODB_URI',
    'REDIS_URL',
    'OPENAI_API_KEY',
    'CLERK_SECRET_KEY'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing ${varName}`);
    } else {
      console.log(`✅ ${varName} is set`);
    }
  }

  console.log('\n🔍 Testing MongoDB Connection:\n');
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB connected successfully');
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected cleanly');
  } catch (error: any) {
    console.error('❌ MongoDB connection failed:', error?.message || 'Unknown error');
  }

  console.log('\n🔍 Testing Redis Connection:\n');
  try {
    const redis = new Redis(process.env.REDIS_URL as string);
    await redis.ping();
    console.log('✅ Redis connected successfully');
    await redis.quit();
    console.log('✅ Redis disconnected cleanly');
  } catch (error: any) {
    console.error('❌ Redis connection failed:', error?.message || 'Unknown error');
  }

  console.log('\n🔍 Testing OpenAI Configuration:\n');
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    const models = await openai.models.list();
    console.log('✅ OpenAI API key is valid');
  } catch (error: any) {
    console.error('❌ OpenAI API key validation failed:', error?.message || 'Unknown error');
  }

  console.log('\n🔍 Testing Clerk Configuration:\n');
  if (process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
    console.log('✅ Clerk secret key format is valid');
  } else {
    console.error('❌ Clerk secret key format is invalid');
  }
}

testConnections().catch((error: any) => {
  console.error('Test script failed:', error?.message || 'Unknown error');
}); 