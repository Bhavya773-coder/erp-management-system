import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import VoucherSequence from '../models/VoucherSequence.js';
import { sendPushNotification } from '../utils/pushNotification.js';
import { sendExpoPushNotifications } from '../utils/expoPush.js';
import { sendFCMNotifications } from '../services/firebaseService.js';
import mongoose from 'mongoose';

// Store connected users: { userId: socketId }
const connectedUsers = new Map();
// Store typing users: { chatId: Set(userIds) }
const typingUsers = new Map();

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId} (Socket: ${socket.id})`);
    
    // Register user
    connectedUsers.set(socket.userId, socket.id);
    
    // Update online status in DB
    User.findByIdAndUpdate(socket.userId, { isOnline: true }).exec();
    
    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join all chat rooms the user is part of
    joinUserChats(socket, socket.userId);

    // Broadcast user online status
    socket.broadcast.emit('user:status_update', { 
      userId: socket.userId, 
      isOnline: true 
    });

    // Handle join chat
    socket.on('chat:join', async (data) => {
      const { chatId } = data;
      
      try {
        // Verify user is member of chat
        const chat = await Chat.findOne({
          _id: chatId,
          'members.user': socket.userId
        });

        if (chat) {
          socket.join(`chat:${chatId}`);
          console.log(`👥 User ${socket.userId} joined chat ${chatId}`);
          
          // Mark messages as delivered
          await markMessagesDelivered(chatId, socket.userId);
          
          // Notify other members
          socket.to(`chat:${chatId}`).emit('chat:user_joined', {
            chatId,
            userId: socket.userId
          });
        }
      } catch (error) {
        console.error('Join chat error:', error);
      }
    });

    // Handle leave chat
    socket.on('chat:leave', (data) => {
      const { chatId } = data;
      socket.leave(`chat:${chatId}`);
      console.log(`👋 User ${socket.userId} left chat ${chatId}`);
    });

    // Handle send message
    socket.on('message:send', async (data) => {
      const { chatId, content, messageType = 'TEXT', fileUrl, fileName, fileSize, scheduleDate, tempId, forwarded, forwardCount, voucherData, taskData } = data;
      
      try {
        // Verify user is member of chat
        const chat = await Chat.findOne({
          _id: chatId,
          'members.user': socket.userId
        });

        if (!chat) {
          socket.emit('message:error', {
            error: 'Not authorized to send messages in this chat',
            tempId
          });
          return;
        }

        let finalVoucherData = voucherData;
        if (messageType === 'VOUCHER' && voucherData) {
          const prefix = voucherData.company; // 'MP', 'AST', 'AE'
          const seqDoc = await VoucherSequence.findOneAndUpdate(
            { companyPrefix: prefix },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true }
          );
          const number = `${prefix}-${seqDoc.seq.toString().padStart(3, '0')}`;
          finalVoucherData = { ...voucherData, number, status: 'PENDING' };
        }

        // Create message
        const message = await Message.create({
          chat: chatId,
          sender: socket.userId,
          content,
          messageType,
          fileUrl,
          fileName,
          fileSize,
          scheduleDate,
          forwarded: forwarded || false,
          forwardCount: forwardCount || 0,
          voucherData: finalVoucherData,
          taskData: taskData,
          status: 'SENT'
        });

        const populatedMessage = await Message.findById(message._id).populate('sender', 'name');

        const formattedMessage = {
          id: populatedMessage._id.toString(),
          chatId: populatedMessage.chat.toString(),
          content: populatedMessage.content,
          messageType: populatedMessage.messageType,
          fileUrl: populatedMessage.fileUrl,
          fileName: populatedMessage.fileName,
          fileSize: populatedMessage.fileSize,
          status: populatedMessage.status,
          scheduleDate: populatedMessage.scheduleDate,
          isCompleted: populatedMessage.isCompleted || false,
          forwarded: populatedMessage.forwarded,
          forwardCount: populatedMessage.forwardCount,
          voucherData: populatedMessage.voucherData,
          taskData: populatedMessage.taskData,
          createdAt: populatedMessage.createdAt,
          senderId: populatedMessage.sender._id.toString(),
          sender: {
            id: populatedMessage.sender._id.toString(),
            name: populatedMessage.sender.name
          },
          tempId
        };

        // Update chat updatedAt
        const updatedChat = await Chat.findByIdAndUpdate(chatId, { updatedAt: Date.now() }, { returnDocument: 'after' })
          .populate('members.user', 'name email avatarUrl isOnline lastSeen phone education skills role pushSubscription expoPushTokens fcmTokens');

        // Prepare full chat object for sidebar sync
        const validMembers = updatedChat.members.filter(m => m.user);
        const formattedChat = {
          id: updatedChat._id.toString(),
          isGroup: updatedChat.isGroup,
          name: updatedChat.name, // Will be filtered on frontend for individual
          members: validMembers.map(m => ({
            id: m._id,
            user: {
              id: m.user._id.toString(),
              name: m.user.name,
              email: m.user.email,
              avatarUrl: m.user.avatarUrl,
              isOnline: m.user.isOnline,
              lastSeen: m.user.lastSeen
            },
            isAdmin: m.isAdmin
          })),
          lastMessage: formattedMessage,
          updatedAt: updatedChat.updatedAt
        };

        // Emit to all members' personal rooms
        validMembers.forEach(member => {
          const userId = member.user._id.toString();
          
          // Send message via socket
          io.to(`user:${userId}`).emit('message:received', {
            message: formattedMessage
          });

          // Also send chat update to ensure sidebar is in sync
          io.to(`user:${userId}`).emit('chat:updated', {
            chat: formattedChat
          });
          
          // Send push notification to other users
          if (userId !== socket.userId) {
            // --- Web Push (browser) ---
            const pushSubscription = member.user.pushSubscription;
            
              if (pushSubscription) {
              const pushPayload = {
                title: `New message from ${formattedMessage.sender.name}`,
                body: formattedMessage.messageType === 'TEXT' ? formattedMessage.content : 
                      formattedMessage.messageType === 'TASK' ? `⏰ Task Assigned: ${formattedMessage.taskData?.title}` : 
                      `Sent a ${formattedMessage.messageType.toLowerCase()}`,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: formattedMessage.id,
                renotify: true,
                silent: false,
                data: { 
                  chatId: formattedMessage.chatId, 
                  url: '/' 
                }
              };
              
              console.log(`📡 Sending web push to user ${userId}...`);
              sendPushNotification(pushSubscription, pushPayload).then(result => {
                if (result.expired) {
                  console.log(`⚠️ Push subscription expired for user ${userId}, clearing...`);
                  User.findByIdAndUpdate(userId, { pushSubscription: null }).exec();
                } else if (result.success) {
                  console.log(`✅ Web push sent to user ${userId}`);
                }
              }).catch(err => console.error(`❌ Web push failed for user ${userId}:`, err));
            }

              let pushBody = formattedMessage.content || '';
              if (formattedMessage.messageType === 'IMAGE') pushBody = '📷 Photo';
              else if (formattedMessage.messageType === 'FILE') pushBody = '📄 ' + (formattedMessage.fileName || 'Document');
              else if (formattedMessage.messageType === 'SCHEDULE') pushBody = '📅 Schedule';
              else if (formattedMessage.messageType === 'TASK') pushBody = `⏰ Task Assigned: ${formattedMessage.taskData?.title}`;

              const fcmTokens = member.user.fcmTokens;
              const expoPushTokens = member.user.expoPushTokens;

              // --- Direct FCM (Firebase Admin SDK) ---
              // This is the "Native" notification the user wants
              if (fcmTokens && fcmTokens.length > 0) {
                const chatName = updatedChat.isGroup ? updatedChat.name : formattedMessage.sender.name;
                getUserTotalUnreadCount(userId).then(totalUnread => {
                  sendFCMNotifications(fcmTokens, {
                    title: chatName,
                    body: pushBody,
                    badge: totalUnread,
                    data: { chatId: formattedMessage.chatId, type: 'message' }
                  });
                });
              } else if (expoPushTokens && expoPushTokens.length > 0) {
                // --- Expo Push (Fallback) ---
                const chatName = updatedChat.isGroup ? updatedChat.name : formattedMessage.sender.name;
                const subtitle = updatedChat.isGroup ? formattedMessage.sender.name : undefined;
                getUserTotalUnreadCount(userId).then(totalUnread => {
                  sendExpoPushNotifications(expoPushTokens, {
                    title: chatName,
                    subtitle,
                    body: pushBody,
                    sound: 'default',
                    badge: totalUnread,
                    channelId: 'messages',
                    data: {
                      chatId: formattedMessage.chatId,
                      messageId: formattedMessage.id,
                      senderName: formattedMessage.sender.name,
                      type: 'message'
                    }
                  });
                });
              }
          }
        });

        console.log(`📨 Message sent in chat ${chatId} by ${socket.userId}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message:error', {
          error: 'Failed to send message',
          tempId
        });
      }
    });

    // Handle task action
    socket.on('task:action', async (data) => {
      const { messageId, action } = data; // action: 'COMPLETED'
      try {
        const message = await Message.findById(messageId).populate('sender', 'name').populate('chat');
        if (!message || message.messageType !== 'TASK') return;
        
        message.set({
          'taskData.status': action,
          'taskData.completedAt': new Date()
        });
        
        await message.save();
        
        io.to(`chat:${message.chat._id.toString()}`).emit('message:update', {
          messageId: message._id.toString(),
          chatId: message.chat._id.toString(),
          taskData: message.taskData
        });

        // Notify the sender that the task was completed
        const senderUser = await User.findById(message.sender._id);
        const taskTitle = message.taskData.title;
        const chatName = message.chat.isGroup ? message.chat.name : 'Task Update';

        if (senderUser) {
          if (senderUser.fcmTokens && senderUser.fcmTokens.length > 0) {
            sendFCMNotifications(senderUser.fcmTokens, {
              title: `Task Completed`,
              body: `Task "${taskTitle}" has been completed.`,
              data: { type: 'task', chatId: message.chat._id.toString() }
            });
          } else if (senderUser.expoPushTokens && senderUser.expoPushTokens.length > 0) {
            sendExpoPushNotifications(senderUser.expoPushTokens, {
              title: `Task Completed`,
              body: `Task "${taskTitle}" has been completed.`,
              data: { type: 'task', chatId: message.chat._id.toString() }
            });
          }
        }
      } catch (err) {
        console.error('Task action error:', err);
      }
    });

    // Handle voucher action
    socket.on('voucher:action', async (data) => {
      const { messageId, action } = data;
      try {
        const message = await Message.findById(messageId).populate('sender', 'name').populate('chat');
        if (!message || message.messageType !== 'VOUCHER') return;
        
        const approver = await User.findById(socket.userId);
        console.log('📝 Processing voucher action:', action, 'by', approver?.name || socket.userId);
        
        if (action === 'APPROVED') {
          message.set({
            'voucherData.status': action,
            'voucherData.approvedBy': approver ? approver.name : 'Admin',
            'voucherData.approvedAt': new Date()
          });
        } else {
          message.set('voucherData.status', action);
        }
        
        await message.save();
        console.log('💾 Voucher saved successfully with approver:', message.voucherData.approvedBy);
        
        io.to(`user:${message.sender._id.toString()}`).emit('message:update', {
          messageId: message._id.toString(),
          chatId: message.chat._id.toString(),
          voucherData: message.voucherData
        });
        io.to(`chat:${message.chat._id.toString()}`).emit('message:update', {
          messageId: message._id.toString(),
          chatId: message.chat._id.toString(),
          voucherData: message.voucherData
        });

        const senderUser = await User.findById(message.sender._id);
        if (senderUser && senderUser.expoPushTokens && senderUser.expoPushTokens.length > 0) {
           sendExpoPushNotifications(senderUser.expoPushTokens, {
             title: `Voucher ${action}`,
             body: `Voucher ${message.voucherData.number} has been ${action.toLowerCase()}.`,
             data: { type: 'voucher', chatId: message.chat._id.toString() }
           });
        }

        if (senderUser && senderUser.fcmTokens && senderUser.fcmTokens.length > 0) {
          sendFCMNotifications(senderUser.fcmTokens, {
            title: `Voucher ${action}`,
            body: `Voucher ${message.voucherData.number} has been ${action.toLowerCase()}.`,
            data: { type: 'voucher', chatId: message.chat._id.toString() }
          });
        }

        if (action === 'APPROVED') {
          const accountsId = '69f9ec5882a1f7313545e8e7';
          const approverId = socket.userId;
          
          const accIdObj = new mongoose.Types.ObjectId(accountsId);
          const appIdObj = new mongoose.Types.ObjectId(approverId);

          let accChat = await Chat.findOne({
            isGroup: false,
            'members.user': { $all: [accIdObj, appIdObj] }
          });
          
          if (!accChat) {
            accChat = await Chat.create({
              isGroup: false,
              members: [{ user: appIdObj }, { user: accIdObj }]
            });
          }

          const newMsg = await Message.create({
            chat: accChat._id,
            sender: approverId,
            content: `Voucher Approved: ${message.voucherData.number}`,
            messageType: 'VOUCHER',
            fileUrl: message.fileUrl,
            voucherData: message.voucherData,
            forwarded: true,
            forwardCount: message.forwardCount + 1,
            status: 'SENT'
          });
          
          const popMsg = await Message.findById(newMsg._id).populate('sender', 'name');
          const formattedForward = {
             id: popMsg._id.toString(),
             chatId: popMsg.chat.toString(),
             content: popMsg.content,
             messageType: popMsg.messageType,
             fileUrl: popMsg.fileUrl,
             voucherData: popMsg.voucherData,
             forwarded: popMsg.forwarded,
             forwardCount: popMsg.forwardCount,
             createdAt: popMsg.createdAt,
             senderId: popMsg.sender._id.toString(),
             sender: { id: popMsg.sender._id.toString(), name: popMsg.sender.name },
             status: popMsg.status
          };

          io.to(`user:${approverId}`).emit('message:received', { message: formattedForward });
          io.to(`user:${accountsId}`).emit('message:received', { message: formattedForward });
        }
      } catch (error) {
        console.error('Voucher action error:', error);
      }
    });

    // Handle typing indicator
    socket.on('typing:start', (data) => {
      const { chatId } = data;
      
      if (!typingUsers.has(chatId)) {
        typingUsers.set(chatId, new Set());
      }
      typingUsers.get(chatId).add(socket.userId);

      socket.to(`chat:${chatId}`).emit('typing:update', {
        chatId,
        userId: socket.userId,
        isTyping: true
      });
    });

    socket.on('typing:stop', (data) => {
      const { chatId } = data;
      
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId).delete(socket.userId);
      }

      socket.to(`chat:${chatId}`).emit('typing:update', {
        chatId,
        userId: socket.userId,
        isTyping: false
      });
    });

    // Handle message delivered (Double tick)
    socket.on('message:delivered', async (data) => {
      const { messageId, chatId } = data;
      
      try {
        const message = await Message.findById(messageId);
        if (message && message.status === 'SENT') {
          message.status = 'DELIVERED';
          await message.save();

          // Notify the sender
          io.to(`user:${message.sender}`).emit('message:status_update', {
            chatId,
            messageId,
            status: 'DELIVERED'
          });
        }
      } catch (error) {
        console.error('Message delivered error:', error);
      }
    });

    // Handle message seen (Blue tick)
    socket.on('message:seen', async (data) => {
      const { chatId } = data;
      
      try {
        const now = new Date();
        
        // Update user's lastSeen in this chat
        await Chat.updateOne(
          { _id: chatId, 'members.user': socket.userId },
          { $set: { 'members.$.lastSeen': now } }
        );

        // Optional: Still mark messages as seen for legacy/single-status support
        await Message.updateMany(
          {
            chat: chatId,
            sender: { $ne: socket.userId },
            status: { $ne: 'SEEN' },
            createdAt: { $lte: now }
          },
          { $set: { status: 'SEEN' } }
        );

        // Get the chat members to notify them
        const chat = await Chat.findById(chatId);
        if (chat) {
          chat.members.forEach(member => {
            if (member.user) {
              const userId = member.user._id || member.user;
              io.to(`user:${userId.toString()}`).emit('message:status_update', {
                chatId,
                status: 'SEEN',
                seenBy: socket.userId,
                timestamp: new Date().toISOString()
              });
            }
          });
        }
      } catch (error) {
        console.error('Message seen error:', error);
      }
    });

    // Handle message deletion
    socket.on('message:delete', async (data) => {
      const { messageId, chatId } = data;
      
      try {
        const message = await Message.findById(messageId);
        
        // Only sender can delete for everyone
        if (message && message.sender.toString() === socket.userId) {
          await Message.findByIdAndDelete(messageId);

          // Get chat members to notify them
          const chat = await Chat.findById(chatId);
          if (chat) {
            chat.members.forEach(member => {
              if (member.user) {
                const userId = member.user._id || member.user;
                io.to(`user:${userId.toString()}`).emit('message:deleted', {
                  chatId,
                  messageId
                });
              }
            });
          }
        }
      } catch (error) {
        console.error('Message delete error:', error);
      }
    });

    // Handle marking schedule as completed
    socket.on('message:complete_schedule', async (data) => {
      const { messageId, chatId } = data;
      
      try {
        const message = await Message.findById(messageId);
        if (message && message.messageType === 'SCHEDULE') {
          message.isCompleted = true;
          await message.save();

          // Notify all members via chat room and individual rooms
          // This ensures anyone looking at the chat gets the instant update
          io.to(`chat:${chatId}`).emit('message:updated', {
            chatId,
            messageId,
            updates: { isCompleted: true }
          });

          // Also notify members' personal rooms (for those not currently in the chat room)
          const chat = await Chat.findById(chatId);
          if (chat) {
            chat.members.forEach(member => {
              if (member.user) {
                const userId = (member.user._id || member.user).toString();
                io.to(`user:${userId}`).emit('message:updated', {
                  chatId,
                  messageId,
                  updates: { isCompleted: true }
                });
              }
            });
          }
        }
      } catch (error) {
        console.error('Complete schedule error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.userId} (Socket: ${socket.id})`);
      
      connectedUsers.delete(socket.userId);
      
      const now = new Date();
      // Update status in DB
      await User.findByIdAndUpdate(socket.userId, { 
        isOnline: false, 
        lastSeen: now 
      });

      // Clear typing status
      for (const [chatId, users] of typingUsers.entries()) {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          socket.to(`chat:${chatId}`).emit('typing:update', {
            chatId,
            userId: socket.userId,
            isTyping: false
          });
        }
      }

      // Broadcast user offline status
      socket.broadcast.emit('user:status_update', { 
        userId: socket.userId, 
        isOnline: false,
        lastSeen: now.toISOString()
      });
    });
  });
};

async function joinUserChats(socket, userId) {
  try {
    const chats = await Chat.find({ 'members.user': userId });
    for (const chat of chats) {
      socket.join(`chat:${chat._id}`);
    }
    console.log(`✅ User ${userId} joined ${chats.length} chat rooms`);
  } catch (error) {
    console.error('Join user chats error:', error);
  }
}

async function markMessagesDelivered(chatId, userId) {
  try {
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        status: 'SENT'
      },
      { $set: { status: 'DELIVERED' } }
    );
  } catch (error) {
    console.error('Mark delivered error:', error);
  }
}

async function getUserTotalUnreadCount(userId) {
  try {
    const userChats = await Chat.find({ 'members.user': userId });
    let totalUnread = 0;

    for (const chat of userChats) {
      const member = chat.members.find(m => m.user.toString() === userId.toString());
      if (member) {
        const unreadInChat = await Message.countDocuments({
          chat: chat._id,
          sender: { $ne: userId },
          createdAt: { $gt: member.lastSeen }
        });
        totalUnread += unreadInChat;
      }
    }
    
    return totalUnread;
  } catch (error) {
    console.error('Error calculating total unread:', error);
    return 0;
  }
}

export { connectedUsers, typingUsers };
