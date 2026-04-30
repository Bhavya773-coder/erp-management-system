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
  if (!process.env.VAPID_PUBLIC_KEY) return;
  if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

  const promises = user.pushSubscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is invalid or expired
        console.log(`Removing expired subscription for user ${user._id}`);
        user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        await user.save();
      } else {
        console.error('Push notification error:', error);
      }
    }
  });

  await Promise.all(promises);
};
