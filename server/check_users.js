import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import User from './models/User.js';

async function check() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('📡 Connected to MongoDB');

    const users = await User.find({});
    console.log(`👥 Found ${users.length} users:`);
    
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}):`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Phone: ${u.phone || 'MISSING'}`);
      console.log(`  Education: ${u.education || 'MISSING'}`);
      console.log(`  Skills: ${u.skills?.length > 0 ? u.skills.join(', ') : 'NONE'}`);
      console.log('---');
    });

    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

check();
