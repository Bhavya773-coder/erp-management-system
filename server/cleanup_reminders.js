import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from './models/Message.js';

dotenv.config({ path: './.env' });

const cleanup = async () => {
  try {
    const mongoUri = process.env.DATABASE_URL;
    if (!mongoUri) {
      throw new Error('DATABASE_URL not found in .env');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const result = await Message.deleteMany({ messageType: 'SCHEDULE' });
    console.log(`Successfully deleted ${result.deletedCount} reminders.`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
};

cleanup();
