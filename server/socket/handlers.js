import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

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
      const { chatId, content, messageType = 'TEXT', fileUrl, fileName, fileSize, tempId } = data;
      
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

        // Create message
        const message = await Message.create({
          chat: chatId,
          sender: socket.userId,
          content,
          messageType,
          fileUrl,
          fileName,
          fileSize,
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
          createdAt: populatedMessage.createdAt,
          senderId: populatedMessage.sender._id.toString(),
          sender: {
            id: populatedMessage.sender._id.toString(),
            name: populatedMessage.sender.name
          },
          tempId
        };

        // Update chat updatedAt
        const updatedChat = await Chat.findByIdAndUpdate(chatId, { updatedAt: Date.now() }, { new: true })
          .populate('members.user', 'name email avatarUrl isOnline lastSeen phone education skills role');

        // Prepare full chat object for sidebar sync
        const formattedChat = {
          id: updatedChat._id.toString(),
          isGroup: updatedChat.isGroup,
          name: updatedChat.name, // Will be filtered on frontend for individual
          members: updatedChat.members.map(m => ({
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
        chat.members.forEach(member => {
          const userId = member.user._id || member.user;
          
          // Send message
          io.to(`user:${userId}`).emit('message:received', {
            message: formattedMessage
          });

          // Also send chat update to ensure sidebar is in sync
          io.to(`user:${userId}`).emit('chat:updated', {
            chat: formattedChat
          });
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
        await Message.updateMany(
          {
            chat: chatId,
            sender: { $ne: socket.userId },
            status: { $ne: 'SEEN' }
          },
          { $set: { status: 'SEEN' } }
        );

        // Get the chat members to notify them
        const chat = await Chat.findById(chatId);
        if (chat) {
          chat.members.forEach(member => {
            io.to(`user:${member.user._id || member.user}`).emit('message:status_update', {
              chatId,
              status: 'SEEN',
              seenBy: socket.userId,
              timestamp: new Date().toISOString()
            });
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
          message.isDeleted = true;
          message.content = 'This message was deleted';
          message.fileUrl = null;
          message.fileName = null;
          await message.save();

          // Get chat members to notify them
          const chat = await Chat.findById(chatId);
          if (chat) {
            chat.members.forEach(member => {
              io.to(`user:${member.user._id || member.user}`).emit('message:deleted', {
                chatId,
                messageId
              });
            });
          }
        }
      } catch (error) {
        console.error('Message delete error:', error);
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

export { connectedUsers, typingUsers };
