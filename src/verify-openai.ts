import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { OpenAI } from 'openai';

// Try to load environment from multiple possible locations
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('No .env file found, using environment variables as is');
}

async function verifyOpenAIKey() {
  console.log('\n🔍 OpenAI API Key Verification\n');

  // Check if API key is available
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is not set');
    return false;
  }

  console.log(`ℹ️ Found API key starting with: ${apiKey.substring(0, 5)}...`);
  
  // Check for placeholder values
  if (apiKey === 'fallback-key' || 
      apiKey.includes('your-openai') || 
      apiKey.includes('test_your_openai_key')) {
    console.error('❌ API key appears to be a placeholder value');
    return false;
  }

  // Verify key format (should start with sk-)
  if (!apiKey.startsWith('sk-')) {
    console.error('❌ API key has invalid format (should start with sk-)');
    return false;
  }

  // Try to initialize OpenAI client
  try {
    const openai = new OpenAI({
      apiKey,
      timeout: 15000 // 15 second timeout
    });
    
    console.log('✅ OpenAI client initialized successfully');
    
    // Make a test API call
    console.log('🔄 Making test API call...');
    const startTime = Date.now();
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Reply with 'Connection successful' (5 words or less)" }
        ],
        max_tokens: 10
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ API call completed in ${duration}ms`);
      
      if (completion.choices && completion.choices[0]) {
        console.log(`📋 Response: "${completion.choices[0].message.content}"`);
        return true;
      } else {
        console.error('❌ API call returned an empty or invalid response');
        return false;
      }
    } catch (apiError: any) {
      console.error(`❌ API call failed: ${apiError.message}`);
      
      // Provide more detailed error diagnostics
      if (apiError.status === 401) {
        console.error('❌ Authentication error - The API key is invalid');
      } else if (apiError.status === 429) {
        console.error('❌ Rate limit or quota exceeded. Check your OpenAI account.');
      } else if (apiError.status >= 500) {
        console.error('❌ OpenAI service error. Try again later.');
      }
      
      console.error('Error details:', apiError.response?.data || apiError);
      return false;
    }
  } catch (err: any) {
    console.error(`❌ Failed to initialize OpenAI client: ${err.message}`);
    console.error('Error details:', err);
    return false;
  }
}

// Run the verification and exit with appropriate status code
verifyOpenAIKey()
  .then(success => {
    if (success) {
      console.log('\n✅ OpenAI API key verification passed!\n');
      process.exit(0);
    } else {
      console.error('\n❌ OpenAI API key verification failed!\n');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ Verification process error:', err);
    process.exit(1);
  });
