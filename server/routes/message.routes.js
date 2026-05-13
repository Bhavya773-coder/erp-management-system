import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/messages/forward/bulk
// @desc    Forward multiple messages to multiple chats
// @access  Private
router.post('/forward/bulk', authenticate, async (req, res) => {
  try {
    const { messageIds, targetChatIds } = req.body;

    if (!messageIds || !targetChatIds || !Array.isArray(messageIds) || !Array.isArray(targetChatIds)) {
      return res.status(400).json({ success: false, message: 'Message IDs and target chat IDs are required as arrays' });
    }

    const originalMessages = await Message.find({ _id: { $in: messageIds } });
    
    for (const targetChatId of targetChatIds) {
      const targetChat = await Chat.findOne({ _id: targetChatId, 'members.user': req.user._id });
      if (!targetChat) continue;

      const chatName = targetChat.isGroup ? targetChat.name : 'Personal Chat';

      for (const originalMessage of originalMessages) {
        const forwardedMessage = await Message.create({
          chat: targetChatId,
          sender: req.user._id,
          content: originalMessage.content,
          messageType: originalMessage.messageType,
          fileUrl: originalMessage.fileUrl,
          fileName: originalMessage.fileName,
          fileSize: originalMessage.fileSize,
          forwarded: true,
          forwardCount: (originalMessage.forwardCount || 0) + 1,
          status: 'SENT'
        });

        const populatedMessage = await Message.findById(forwardedMessage._id)
          .populate('sender', 'name')
          .populate({
            path: 'chat',
            populate: { path: 'members.user', select: 'name email' }
          });

        if (req.io) {
          req.io.to(`chat:${targetChatId}`).emit('message:received', { message: populatedMessage });
        }
      }
      await Chat.findByIdAndUpdate(targetChatId, { updatedAt: Date.now() });
    }

    res.status(201).json({ success: true, message: 'Messages forwarded successfully' });
  } catch (error) {
    console.error('Bulk forward error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/messages/forward
// @desc    Forward a message to another chat (legacy singular)
// @access  Private
router.post('/forward', authenticate, async (req, res) => {
  try {
    const { messageId, targetChatId } = req.body;

    if (!messageId || !targetChatId) {
      return res.status(400).json({ success: false, message: 'Message ID and target chat ID are required' });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) return res.status(404).json({ success: false, message: 'Message not found' });

    const targetChat = await Chat.findOne({ _id: targetChatId, 'members.user': req.user._id });
    if (!targetChat) return res.status(403).json({ success: false, message: 'Not authorized' });

    const chatName = targetChat.isGroup ? targetChat.name : 'Personal Chat';
    const forwardedMessage = await Message.create({
      chat: targetChatId,
      sender: req.user._id,
      content: originalMessage.content,
      messageType: originalMessage.messageType,
      fileUrl: originalMessage.fileUrl,
      fileName: originalMessage.fileName,
      fileSize: originalMessage.fileSize,
      forwarded: true,
      forwardCount: (originalMessage.forwardCount || 0) + 1,
      status: 'SENT'
    });

    const populatedMessage = await Message.findById(forwardedMessage._id)
      .populate('sender', 'name')
      .populate({
        path: 'chat',
        populate: { path: 'members.user', select: 'name email' }
      });

    await Chat.findByIdAndUpdate(targetChatId, { updatedAt: Date.now() });

    if (req.io) {
      req.io.to(`chat:${targetChatId}`).emit('message:received', { message: populatedMessage });
    }

    res.status(201).json({ success: true, message: 'Message forwarded successfully', data: { message: populatedMessage } });
  } catch (error) {
    console.error('Forward error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/messages/shared/documents
// @desc    Get all FILE messages shared with or by the current user
// @access  Private
router.get('/shared/documents', authenticate, async (req, res) => {
  try {
    // Find all chats the user is part of
    const chats = await Chat.find({ 'members.user': req.user._id });
    const chatIds = chats.map(c => c._id);
    
    // Find all FILE messages in those chats
    const documents = await Message.find({
      chat: { $in: chatIds },
      messageType: 'FILE',
      isDeleted: false
    })
      .populate('sender', 'name')
      .populate('chat', 'name isGroup')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: { documents } });
  } catch (error) {
    console.error('Get shared documents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/messages/:chatId
// @desc    Get messages for a chat
// @access  Private
router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, search, messageType } = req.query;

    const chat = await Chat.findOne({ _id: chatId, 'members.user': req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Not authorized' });

    const query = { chat: chatId, isDeleted: false };
    if (search) query.content = { $regex: search, $options: 'i' };
    if (messageType) {
      const types = messageType.split(',');
      query.messageType = { $in: types };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Message.find(query)
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    if (!search && !messageType && page == 1) {
      await Message.updateMany(
        { chat: chatId, sender: { $ne: req.user._id }, status: { $ne: 'SEEN' } },
        { $set: { status: 'SEEN' } }
      );
    }

    res.json({ success: true, count: messages.length, data: { messages: messages.reverse() } });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/messages/schedules/all
// @desc    Get all schedules for current user
// @access  Private
router.get('/schedules/all', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({ 'members.user': req.user._id });
    const chatIds = chats.map(c => c._id);
    const schedules = await Message.find({ chat: { $in: chatIds }, messageType: 'SCHEDULE', isDeleted: false })
      .populate('sender', 'name')
      .sort({ scheduleDate: 1 });

    res.json({ success: true, data: { schedules } });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const { chatId, content, messageType = 'TEXT', fileUrl, fileName, fileSize } = req.body;
    if (!chatId) return res.status(400).json({ success: false, message: 'Chat ID is required' });

    const chat = await Chat.findOne({ _id: chatId, 'members.user': req.user._id });
    if (!chat) return res.status(403).json({ success: false, message: 'Not authorized' });

    const message = await Message.create({ chat: chatId, sender: req.user._id, content, messageType, fileUrl, fileName, fileSize });
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name')
      .populate({ path: 'chat', populate: { path: 'members.user', select: 'name email' } });

    await Chat.findByIdAndUpdate(chatId, { updatedAt: Date.now() });

    res.status(201).json({ success: true, message: 'Message sent', data: { message: populatedMessage } });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/messages/:id/complete
// @desc    Mark a schedule as completed
// @access  Private
router.put('/:id/complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    if (message.messageType !== 'SCHEDULE') return res.status(400).json({ success: false, message: 'Not a schedule' });

    message.isCompleted = true;
    await message.save();

    if (req.io) {
      req.io.to(`chat:${message.chat}`).emit('message:updated', { chatId: message.chat, messageId: id, updates: { isCompleted: true } });
    }

    res.json({ success: true, message: 'Schedule completed' });
  } catch (error) {
    console.error('Complete message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/messages/forward/:id
// @desc    Get a message for forwarding
// @access  Private
router.get('/forward/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id).populate('sender', 'name');
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: { message } });
  } catch (error) {
    console.error('Get forward message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
