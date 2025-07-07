// OpenAI API Key Validation Script
// This script tests the OpenAI API key and configuration

import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

console.log('Starting OpenAI API key validation script');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log(`Checking for .env file at ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log(`.env file found at ${envPath}`);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Environment variables loaded successfully');
  }
} else {
  console.warn('.env file not found');
}

// Check if OPENAI_API_KEY exists
console.log('\nValidating OPENAI_API_KEY:');
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is missing from environment variables');
  process.exit(1);
}

// Check format of API key
if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
  console.warn('⚠️ OPENAI_API_KEY does not start with "sk-" which is unusual');
}

console.log(`✓ OPENAI_API_KEY found (starts with: ${process.env.OPENAI_API_KEY.substring(0, 5)}...)`);

// Initialize OpenAI client
console.log('\nInitializing OpenAI client');
try {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10000 // 10-second timeout
  });
  
  console.log('✓ OpenAI client initialized');
  
  // Make a test API call
  console.log('\nTesting API with a simple completion request...');
  openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello, API test' }],
    max_tokens: 5
  }).then(response => {
    console.log('✅ API test successful!');
    console.log(`Response: "${response.choices[0]?.message?.content}"`);
    process.exit(0);
  }).catch(error => {
    console.error('❌ API test failed:', error);
    console.error('\nError details:');
    console.error('- Message:', error.message);
    console.error('- Status:', error.status);
    console.error('- Type:', error.type);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error);
  process.exit(1);
}
