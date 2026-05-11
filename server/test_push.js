import mongoose from 'mongoose';
import User from './models/User.js';
import { sendFCMNotifications } from './services/firebaseService.js';
import dotenv from 'dotenv';
dotenv.config();

const testNotification = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('📡 Connected to MongoDB');

    const email = 'mashrubhavya5@gmail.com'; // User from check_users.js
    const user = await User.findOne({ email });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log(`👤 Found user: ${user.name}`);
    console.log(`📱 Expo Tokens: ${user.expoPushTokens?.length || 0}`);
    console.log(`🔥 FCM Tokens: ${user.fcmTokens?.length || 0}`);

    if (user.fcmTokens && user.fcmTokens.length > 0) {
      console.log('🚀 Sending test FCM notification...');
      await sendFCMNotifications(user.fcmTokens, {
        title: 'Test Notification',
        body: 'If you see this, notifications are working! ✅',
        data: { type: 'test' }
      });
      console.log('✅ FCM Send attempt complete');
    } else {
      console.log('⚠️ No FCM tokens found for this user. Make sure they have logged in to the mobile app.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testNotification();
