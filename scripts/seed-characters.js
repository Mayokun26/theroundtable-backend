// Script to seed DynamoDB with initial character data
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load env vars from backend .env.local
dotenv.config({ path: path.resolve(__dirname, '../theroundtable-backend/.env.local') });

const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const region = process.env.AWS_REGION || 'us-east-1';

console.log(`Connecting to DynamoDB at ${endpoint}`);
console.log('Current working directory:', __dirname);

// For debugging purposes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Simple HTTP check to see if the DynamoDB Local endpoint is responsive
const http = require('http');
const url = new URL(endpoint);

console.log('Verifying DynamoDB endpoint is reachable...');
const req = http.request({
  hostname: url.hostname,
  port: url.port,
  path: '/',
  method: 'GET'
}, res => {
  console.log(`DynamoDB endpoint status: ${res.statusCode}`);
  if (res.statusCode !== 200 && res.statusCode !== 400) {
    console.error('DynamoDB endpoint is not responding correctly');
    process.exit(1);
  }
  console.log('DynamoDB endpoint is reachable');
  
  // Create the client only after we know the endpoint is reachable
  setupDynamoDBClient();
});

req.on('error', (error) => {
  console.error('Error connecting to DynamoDB endpoint:', error);
  process.exit(1);
});

req.end();

function setupDynamoDBClient() {
  console.log('Creating DynamoDB client...');
  
  const client = new DynamoDBClient({
    endpoint,
    region,
    credentials: {
      accessKeyId: 'localkey',
      secretAccessKey: 'localsecret'
    }
  });
  
  console.log('DynamoDB client created');
  
  const docClient = DynamoDBDocumentClient.from(client);
  
  // Continue with seeding
  seedCharacters(docClient);
}

// This part is moved to the setupDynamoDBClient function
const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || 'theroundtable';
const environment = process.env.NODE_ENV || 'dev';
const charactersTable = process.env.DYNAMODB_CHARACTERS_TABLE || `${tablePrefix}_characters_${environment}`;

const characters = [
  {
    characterId: uuidv4(),
    name: 'Socrates',
    birthYear: -469,
    deathYear: -399,
    background: 'Classical Greek philosopher credited as the founder of Western philosophy. Known for the Socratic method, a form of dialogue to examine ideas and assumptions.',
    style: 'I speak in questions to lead others to their own understanding. I am thoughtful, inquisitive, and believe the unexamined life is not worth living.',
    imageUrl: 'https://theroundtable-ai.dev/images/characters/socrates.jpg',
    era: 'Ancient Greece',
    tags: ['philosopher', 'ancient greece', 'logic', 'ethics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    characterId: uuidv4(),
    name: 'Leonardo da Vinci',
    birthYear: 1452,
    deathYear: 1519,
    background: 'Italian Renaissance polymath whose areas of interest included invention, painting, sculpting, architecture, science, music, mathematics, engineering, literature, anatomy, geology, astronomy, botany, writing, history, and cartography.',
    style: 'I speak with curiosity and creative insight, connecting disparate ideas through observation of nature. I am fascinated by how things work.',
    imageUrl: 'https://theroundtable-ai.dev/images/characters/davinci.jpg',
    era: 'Renaissance',
    tags: ['renaissance', 'artist', 'inventor', 'polymath', 'italy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    characterId: uuidv4(),
    name: 'Marie Curie',
    birthYear: 1867,
    deathYear: 1934,
    background: 'Polish-born physicist and chemist who conducted pioneering research on radioactivity. The first woman to win a Nobel Prize, the first person to win Nobel Prizes in two different scientific fields, and the first woman to become a professor at the University of Paris.',
    style: 'I speak with precision and determination, focusing on evidence and the scientific method. I am dedicated to my research regardless of obstacles.',
    imageUrl: 'https://theroundtable-ai.dev/images/characters/curie.jpg',
    era: 'Modern Era',
    tags: ['scientist', 'nobel prize', 'physics', 'chemistry', 'radioactivity'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    characterId: uuidv4(),    name: 'William Shakespeare',
    birthYear: 1564,
    deathYear: 1616,
    background: 'English poet, playwright, and actor, widely regarded as the greatest writer in the English language and the world\'s pre-eminent dramatist. Often called England\'s national poet and the "Bard of Avon".',
    style: 'I speak with rich imagery and linguistic flourish, employing metaphor and wordplay. My observations on human nature are timeless and profound.',
    imageUrl: 'https://theroundtable-ai.dev/images/characters/shakespeare.jpg',
    era: 'Elizabethan Era',
    tags: ['writer', 'playwright', 'poet', 'england', 'drama'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function seedCharacters(docClient) {
  try {
    console.log(`Seeding ${characters.length} characters into table: ${charactersTable}`);
    console.log(`DynamoDB endpoint: ${endpoint}`);
    console.log(`AWS region: ${region}`);
    
    // Additional check to verify AWS client setup
    try {
      console.log('Checking if table exists...');
      await docClient.send(new PutCommand({
        TableName: charactersTable,
        Item: {
          characterId: 'test',
          name: 'Test',
          createdAt: new Date().toISOString()
        }
      }));
      console.log('Test write successful, proceeding with character seeding');
    } catch (tableError) {
      console.error('Error checking table:', tableError);
      console.error('Make sure DynamoDB Local is running and the table exists');
      console.error(tableError);
      process.exit(1);
    }
    
    for (const character of characters) {
      try {
        const command = new PutCommand({
          TableName: charactersTable,
          Item: character
        });
        
        await docClient.send(command);
        console.log(`Added character: ${character.name}`);
      } catch (characterError) {
        console.error(`Failed to add character ${character.name}:`, characterError);
      }
    }
    
    console.log('Character seeding complete!');
  } catch (error) {
    console.error('Failed to seed characters:', error);
    process.exit(1);
  }
}
