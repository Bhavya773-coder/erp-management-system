import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const debug = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to DB');

    const users = await User.find({});
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`- ${u.email} (Aadhaar: ${u.aadhaarNumber})`);
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

debug();
