// warmup-lambda.js - Script to ping and warm up the Lambda function
import fetch from 'node-fetch';

// Get the API URL from environment or use default
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.theroundtableai.com';

async function warmupLambda() {
  console.log(`Warming up Lambda function at ${API_URL}...`);
  
  try {
    // First, call the health endpoint to warm up the Lambda
    console.log('Calling health endpoint...');
    const healthResponse = await fetch(`${API_URL}/api/health`, {      method: 'GET',
      timeout: 20000 // 20-second timeout for initial cold start
    });
    
    if (healthResponse.ok) {
      console.log(`Health check successful: ${healthResponse.status}`);
      try {
        const healthData = await healthResponse.json();
        console.log('Health data:', healthData);
      } catch (e) {
        console.log('Health response is not JSON');
      }
    } else {
      console.log(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
      // Even if health check fails, continue with other warmups
    }
    
    // Then call the characters endpoint which is typically faster
    console.log('Calling characters endpoint...');
    const charactersResponse = await fetch(`${API_URL}/characters`, {
      method: 'GET',
      timeout: 10000 // 10-second timeout
    });
    
    if (charactersResponse.ok) {
      console.log(`Characters endpoint successful: ${charactersResponse.status}`);
      const data = await charactersResponse.json();
      console.log(`Retrieved ${data.data?.length || 0} characters`);
    } else {
      console.log(`Characters endpoint failed: ${charactersResponse.status} ${charactersResponse.statusText}`);
    }
      // Finally, warm up the conversation endpoints with a test request
    // This will ensure the OpenAI client is initialized
    console.log('Warming up conversation endpoint...');
    try {
      const warmupPayload = {
        message: "Hello this is a warmup message",
        characterIds: ["1", "2"] // Use IDs of known characters
      };
      
      const conversationResponse = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Warmup-Request': 'true'
        },
        body: JSON.stringify(warmupPayload),
        timeout: 20000 // Allow 20 seconds for the OpenAI API initialization
      });
      
      if (conversationResponse.ok) {
        console.log('Conversation endpoint warmed up successfully');
      } else {
        console.log(`Conversation warmup failed: ${conversationResponse.status} ${conversationResponse.statusText}`);
      }
    } catch (convError: unknown) {
      // This is okay to fail silently as the warmup endpoint may not exist
      console.log('Conversation warmup attempt failed (non-critical):', convError instanceof Error ? convError.message : String(convError));
    }
    
    console.log('Lambda warmup completed');
    return true;
  } catch (error: unknown) {
    console.error('Error warming up Lambda:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// If called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  warmupLambda()
    .then(success => {
      console.log(success ? 'Warmup successful!' : 'Warmup failed');
    })
    .catch(err => {
      console.error('Warmup error:', err);
    });
}

export { warmupLambda };
