import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/messages/:chatId
// @desc    Get messages for a chat
// @access  Private
router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is member of chat
    const chat = await Chat.findOne({
      _id: chatId,
      'members.user': req.user._id
    });

    if (!chat) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark messages as seen
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: req.user._id },
        status: { $ne: 'SEEN' }
      },
      { $set: { status: 'SEEN' } }
    );

    res.json({
      success: true,
      count: messages.length,
      data: { messages: messages.reverse() }
    });
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
    // Find all chats user is part of
    const chats = await Chat.find({ 'members.user': req.user._id });
    const chatIds = chats.map(c => c._id);

    const schedules = await Message.find({
      chat: { $in: chatIds },
      messageType: 'SCHEDULE',
      isDeleted: false
    })
    .populate('sender', 'name')
    .sort({ scheduleDate: 1 });

    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    console.error('Get all schedules error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const { chatId, content, messageType = 'TEXT', fileUrl, fileName, fileSize } = req.body;

    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required' });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      'members.user': req.user._id
    });

    if (!chat) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content,
      messageType,
      fileUrl,
      fileName,
      fileSize
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name')
      .populate({
        path: 'chat',
        populate: { path: 'members.user', select: 'name email' }
      });

    // Update chat updatedAt
    await Chat.findByIdAndUpdate(chatId, { updatedAt: Date.now() });

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: { message: populatedMessage }
    });
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

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.messageType !== 'SCHEDULE') {
      return res.status(400).json({ success: false, message: 'Message is not a schedule' });
    }

    message.isCompleted = true;
    await message.save();

    // Notify others via socket
    if (req.io) {
      req.io.to(`chat:${message.chat}`).emit('message:updated', {
        chatId: message.chat,
        messageId: id,
        updates: { isCompleted: true }
      });
    }

    res.json({
      success: true,
      message: 'Schedule marked as completed'
    });
  } catch (error) {
    console.error('Complete message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
