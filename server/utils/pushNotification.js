import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:your@email.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export const sendPushNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error('Push Notification Error:', error);
    // BUG 5 FIX: Include 400 and 401 as expired subscription errors alongside 404 and 410
    if ([400, 401, 404, 410].includes(error.statusCode)) {
      return { success: false, expired: true };
    }
    return { success: false, error };
  }
};
