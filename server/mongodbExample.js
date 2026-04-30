/**
 * mongodbExample.js
 * 
 * A minimal example to test connectivity and basic operations with MongoDB Atlas.
 * 
 * INSTALL:
 * npm install mongodb dotenv
 * 
 * RUN:
 * node mongodbExample.js
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// The MONGODB_URI should be in your .env file
const uri = process.env.DATABASE_URL;

async function run() {
  if (!uri) {
    console.error('❌ Error: DATABASE_URL not found in environment variables.');
    process.exit(1);
  }

  // Create a new MongoClient
  const client = new MongoClient(uri);

  try {
    console.log('📡 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected successfully to server');

    const db = client.db('AstroAI_Demo');
    const collection = db.collection('chat_history');

    // 1. Insert 10 realistic documents (AI Chat messages)
    console.log('📝 Inserting sample chat documents...');
    const sampleMessages = Array.from({ length: 10 }).map((_, i) => ({
      sender: i % 2 === 0 ? 'User' : 'AI Assistant',
      content: `This is message number ${i + 1} in our AI chat session.`,
      type: 'text',
      // Real timestamps with different values (1 minute apart)
      timestamp: new Date(Date.now() - (10 - i) * 60000)
    }));

    const insertResult = await collection.insertMany(sampleMessages);
    console.log(`✅ Successfully inserted ${insertResult.insertedCount} documents.`);

    // 2. Read and print the 5 most recent documents
    console.log('\n🔍 Fetching 5 most recent messages:');
    const recentMessages = await collection.find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();

    recentMessages.forEach((msg, idx) => {
      console.log(`[${idx + 1}] ${msg.sender}: ${msg.content} (${msg.timestamp.toISOString()})`);
    });

    // 3. Read and print one full document by _id
    const firstId = insertResult.insertedIds[0];
    console.log(`\n🆔 Fetching a specific document by _id: ${firstId}`);
    const specificDoc = await collection.findOne({ _id: firstId });
    console.log('Result:', JSON.stringify(specificDoc, null, 2));

  } catch (error) {
    console.error('❌ An error occurred during the database operation:');
    console.error(error.message);
  } finally {
    // 4. Close the connection
    console.log('\n👋 Closing connection...');
    await client.close();
    console.log('✅ Connection closed.');
  }
}

// Run the script
run().catch(console.dir);
