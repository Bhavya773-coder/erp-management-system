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
      ...(payload.subtitle && { subtitle: payload.subtitle }),
    });
  }

  if (messages.length === 0) return;

  // Group messages by experienceId to avoid PUSH_TOO_MANY_EXPERIENCE_IDS
  // Since we don't know the experienceId upfront from the token string easily,
  // we will chunk them but if we get the specific error, we will handle it.
  // IMPROVED: Grouping by "project" is usually handled by splitting the work.
  // For now, we'll send them in smaller chunks or catch the multi-experience error.
  
  const chunks = expo.chunkPushNotifications(messages);
  const results = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      results.push(...ticketChunk);
      
      ticketChunk.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          console.log(`✅ Expo push sent to ${chunk[idx].to}`);
        } else if (ticket.status === 'error') {
          console.error(`❌ Expo push error: ${ticket.message}`);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            console.log(`🗑️ Token ${chunk[idx].to} is no longer valid`);
          }
        }
      });
    } catch (error) {
      // HANDLE: PUSH_TOO_MANY_EXPERIENCE_IDS
      if (error.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS' && error.details) {
        console.log('🔄 Detected mixed Experience IDs. Re-grouping and retrying...');
        
        for (const [experienceId, tokens] of Object.entries(error.details)) {
          const groupMessages = messages.filter(m => tokens.includes(m.to));
          const groupChunks = expo.chunkPushNotifications(groupMessages);
          
          for (const gChunk of groupChunks) {
            try {
              const gTickets = await expo.sendPushNotificationsAsync(gChunk);
              results.push(...gTickets);
              console.log(`✅ Retried and sent chunk for experience: ${experienceId}`);
            } catch (gErr) {
              console.error(`❌ Retry failed for experience ${experienceId}:`, gErr);
            }
          }
        }
      } else {
        console.error('❌ Expo push chunk send error:', error);
      }
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
