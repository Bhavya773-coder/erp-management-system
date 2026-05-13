import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-admin.json');
let firebaseApp = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    // Handle cases where the string might be wrapped in quotes or have literal \n
    // but JSON.parse should handle standard JSON.
    const serviceAccount = JSON.parse(serviceAccountStr);
    
    // Fix private key formatting if it was passed with literal \n strings
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized via environment variable');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase from environment variable:', error.message);
    console.log('   - Hint: Ensure the FIREBASE_SERVICE_ACCOUNT value is a valid JSON string.');
  }
} else if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized via file');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase from file:', error.message);
  }
} else {
  console.warn('⚠️ Firebase credentials not found (checked FIREBASE_SERVICE_ACCOUNT env and ' + serviceAccountPath + ')');
}

import User from '../models/User.js';

/**
 * Send direct FCM notifications using Firebase Admin SDK
 * @param {string[]} tokens - Array of FCM tokens
 * @param {object} payload - { title, body, data, badge }
 * @param {string} userId - Optional userId to cleanup invalid tokens
 */
export const sendFCMNotifications = async (tokens, payload, userId = null) => {
  if (!firebaseApp || !tokens || tokens.length === 0) return;

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    android: {
      priority: 'high',
      notification: {
        channelId: payload.channelId || 'messages',
        icon: 'notification_icon',
        color: '#25D366'
      }
    },
    apns: {
      payload: {
        aps: {
          badge: payload.badge || 1,
          sound: 'default'
        }
      }
    },
    tokens: tokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ FCM: Successfully sent ${response.successCount} messages; ${response.failureCount} errors.`);
    
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error.code;
          const errorMessage = resp.error.message;
          console.error(`❌ FCM Error for token ${tokens[idx]}:`, errorMessage);

          // Standard cleanup for invalid/expired tokens
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token' ||
            errorMessage.includes('SenderId mismatch')
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0 && userId) {
        console.log(`🧹 Cleaning up ${tokensToRemove.length} invalid FCM tokens for user ${userId}...`);
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { $in: tokensToRemove } }
        });
      }
    }
    return response;
  } catch (error) {
    console.error('❌ FCM: Error sending messages:', error);
  }
};

export default admin;
