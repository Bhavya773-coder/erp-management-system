import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Send push notifications to mobile devices via Expo Push Service.
 * This handles Android (FCM) and iOS (APNs) automatically.
 * 
 * @param {string[]} expoPushTokens - Array of Expo push tokens
 * @param {object} payload - { title, body, data, sound, badge, channelId }
 */
export const sendExpoPushNotifications = async (expoPushTokens, payload) => {
  if (!expoPushTokens || expoPushTokens.length === 0) return;

  const messages = [];

  for (const token of expoPushTokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`⚠️ Invalid Expo push token: ${token}`);
      continue;
    }

    messages.push({
      to: token,
      sound: payload.sound || 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: 'high',
      channelId: payload.channelId || 'messages',
      badge: payload.badge || 1,
      // Android-specific
      ...(payload.subtitle && { subtitle: payload.subtitle }),
    });
  }

  if (messages.length === 0) return;

  // Expo recommends batching - chunks of up to 100
  const chunks = expo.chunkPushNotifications(messages);
  const results = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      results.push(...ticketChunk);
      
      // Log results
      ticketChunk.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          console.log(`✅ Expo push sent to ${chunk[idx].to}`);
        } else if (ticket.status === 'error') {
          if (!ticket.message?.includes('FCM server key')) {
            console.error(`❌ Expo push error: ${ticket.message}`);
          }
          // If the token is invalid, mark it for removal
          if (ticket.details?.error === 'DeviceNotRegistered') {
            console.log(`🗑️ Token ${chunk[idx].to} is no longer valid`);
          }
        }
      });
    } catch (error) {
      console.error('❌ Expo push chunk send error:', error);
    }
  }

  return results;
};

/**
 * Check if a token is a valid Expo push token.
 */
export const isValidExpoPushToken = (token) => {
  return Expo.isExpoPushToken(token);
};

export default expo;
