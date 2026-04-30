import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';

let io;

export const initScheduleService = (socketIo) => {
  io = socketIo;
  
  // Check every 5 seconds for blazing speed
  setInterval(checkSchedules, 5000);
  console.log('⏰ Schedule Service initialized');
};

const checkSchedules = async () => {
  try {
    const now = new Date();
    
    // Find messages of type SCHEDULE that are due and not yet notified
    const dueSchedules = await Message.find({
      messageType: 'SCHEDULE',
      scheduleDate: { $lte: now },
      isNotified: false,
      isDeleted: false
    }).populate('sender', 'name');

    for (const message of dueSchedules) {
      // Mark as notified first to avoid duplicate notifications
      message.isNotified = true;
      await message.save();

      // Find the chat members
      const chat = await Chat.findById(message.chat);
      if (chat) {
        // Send notification to all members except the sender (or everyone)
        chat.members.forEach(member => {
          const userId = member.user._id || member.user;
          
          // Emit socket event for notification
          io.to(`user:${userId.toString()}`).emit('notification:schedule_due', {
            messageId: message._id,
            chatId: message.chat,
            title: message.content,
            senderName: message.sender.name
          });
        });
        
        console.log(`🔔 Notification sent for schedule: ${message.content}`);
      }
    }
  } catch (error) {
    console.error('Schedule check error:', error);
  }
};
