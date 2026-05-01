import webpush from 'web-push';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys not set. Push notifications disabled.');
}

export const sendPushNotification = async (user, payload) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn('Cannot send push notification: VAPID_PUBLIC_KEY is not set in .env');
    return;
  }
  
  if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
    console.log(`User ${user._id} has no push subscriptions. Skipping notification.`);
    return;
  }

  console.log(`Attempting to send push notification to user ${user._id} (${user.pushSubscriptions.length} subscriptions)`);
  const promises = user.pushSubscriptions.map(async (sub) => {
    try {
      // Convert Mongoose sub-document to plain object to avoid internal property issues
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };
      
      console.log(`Sending push notification to user ${user._id} at endpoint ${subscription.endpoint}`);
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`Push notification sent successfully to user ${user._id}`);
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is invalid or expired
        console.log(`Removing expired subscription for user ${user._id}`);
        user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        await user.save();
      } else {
        console.error(`Push notification error for user ${user._id}:`, error.message);
      }
    }
  });

  await Promise.all(promises);
};
