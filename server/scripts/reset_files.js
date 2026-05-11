import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Message from '../models/Message.js';
import path from 'path';
import fs from 'fs';

dotenv.config();

const resetFiles = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    // 1. Reset User Avatars
    const userRes = await User.updateMany(
      { avatarUrl: { $exists: true, $ne: null } },
      { $set: { avatarUrl: null } }
    );
    console.log(`👤 Reset avatars for ${userRes.modifiedCount} users`);

    // 2. Clear Message Files (or reset URLs)
    const msgRes = await Message.updateMany(
      { messageType: { $in: ['IMAGE', 'FILE'] } },
      { 
        $set: { 
          content: 'Media file removed (cleanup)',
          fileUrl: null,
          fileName: null,
          messageType: 'TEXT'
        } 
      }
    );
    console.log(`💬 Cleared ${msgRes.modifiedCount} media messages`);

    // 3. Clear local uploads folder just in case
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
      console.log('📁 Cleared local uploads folder');
    }

    console.log('✨ Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
};

resetFiles();
