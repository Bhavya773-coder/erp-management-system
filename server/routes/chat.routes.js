import express from 'express';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/chats
// @desc    Get all chats for current user
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({
      'members.user': req.user._id
    })
    .populate('members.user', 'name email phone education skills role avatarUrl isOnline lastSeen')
    .populate('createdBy', 'name')
    .sort({ updatedAt: -1 });

    const formattedChats = await Promise.all(chats.map(async (chat) => {
      // Filter out members where user might be null (deleted)
      const validMembers = chat.members.filter(m => m.user);
      const otherMembers = validMembers.filter(m => m.user._id.toString() !== req.user._id.toString());
      
      // Get last message
      const lastMessage = await Message.findOne({ chat: chat._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'name');

      // Get unread count
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        status: { $ne: 'SEEN' },
        sender: { $ne: req.user._id }
      });

      return {
        id: chat._id.toString(),
        isGroup: chat.isGroup,
        name: chat.isGroup ? chat.name : (otherMembers[0]?.user?.name || 'Unknown'),
        members: validMembers.map(m => ({
          id: m._id,
          user: {
            id: m.user._id,
            name: m.user.name,
            email: m.user.email,
            phone: m.user.phone,
            avatarUrl: m.user.avatarUrl,
            isOnline: m.user.isOnline,
            lastSeen: m.user.lastSeen,
            education: m.user.education,
            skills: m.user.skills,
            role: m.user.role
          },
          isAdmin: m.isAdmin
        })),
        lastMessage: lastMessage ? {
          id: lastMessage._id,
          content: lastMessage.content,
          messageType: lastMessage.messageType,
          status: lastMessage.status,
          createdAt: lastMessage.createdAt,
          isCompleted: lastMessage.isCompleted || false,
          scheduleDate: lastMessage.scheduleDate,
          sender: lastMessage.sender ? {
            id: lastMessage.sender._id,
            name: lastMessage.sender.name
          } : { id: 'unknown', name: 'Deleted User' }
        } : null,
        unreadCount,
        createdAt: chat.createdAt
      };
    }));

    res.json({
      success: true,
      count: formattedChats.length,
      data: { chats: formattedChats }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/chats/individual
// @desc    Create or get individual chat
// @access  Private
router.post('/individual', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Check if individual chat already exists
    let chat = await Chat.findOne({
      isGroup: false,
      'members.user': { $all: [req.user._id, userId] }
    }).populate('members.user', 'name email phone avatarUrl isOnline lastSeen education skills role');

    if (chat) {
      return res.json({ success: true, data: { chat } });
    }

    // Create new chat
    chat = await Chat.create({
      isGroup: false,
      members: [
        { user: req.user._id },
        { user: userId }
      ]
    });

    chat = await Chat.findById(chat._id).populate('members.user', 'name email phone avatarUrl isOnline lastSeen education skills role');

    const validMembers = chat.members.filter(m => m.user);
    const otherMembers = validMembers.filter(m => m.user._id.toString() !== req.user._id.toString());
    const formattedChat = {
      id: chat._id.toString(),
      isGroup: chat.isGroup,
      name: chat.isGroup ? chat.name : (otherMembers[0]?.user?.name || 'Unknown'),
      members: validMembers.map(m => ({
        id: m._id,
        user: {
          id: m.user._id,
          name: m.user.name,
          email: m.user.email,
          phone: m.user.phone,
          avatarUrl: m.user.avatarUrl,
          isOnline: m.user.isOnline,
          lastSeen: m.user.lastSeen,
          education: m.user.education,
          skills: m.user.skills,
          role: m.user.role
        },
        isAdmin: m.isAdmin
      })),
      lastMessage: null,
      unreadCount: 0,
      createdAt: chat.createdAt
    };

    res.status(201).json({ success: true, message: 'Chat created', data: { chat: formattedChat } });

    // Emit socket event to both members
    chat.members.forEach(member => {
      const userId = member.user._id.toString();
      req.io.to(`user:${userId}`).emit('chat:updated', {
        chat: formattedChat
      });
      // Make user's sockets join the new chat room
      req.io.in(`user:${userId}`).socketsJoin(`chat:${formattedChat.id}`);
    });
  } catch (error) {
    console.error('Create individual chat error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/chats/group
// @desc    Create group chat
// @access  Private
router.post('/group', authenticate, async (req, res) => {
  try {
    const { name, memberIds } = req.body;

    if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
      return res.status(400).json({ success: false, message: 'Valid name and members required' });
    }

    const members = [
      { user: req.user._id, isAdmin: true },
      ...memberIds.map(id => ({ user: id, isAdmin: false }))
    ];

    let chat = await Chat.create({
      isGroup: true,
      name,
      createdBy: req.user._id,
      members
    });

    chat = await Chat.findById(chat._id).populate('members.user', 'name email phone avatarUrl isOnline lastSeen education skills role');

    res.status(201).json({ success: true, message: 'Group created', data: { chat } });

    // Format chat for real-time update
    const formattedGroup = {
      id: chat._id.toString(),
      isGroup: chat.isGroup,
      name: chat.name,
      members: chat.members.map(m => ({
        id: m._id,
        user: {
          id: m.user._id,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          isOnline: m.user.isOnline,
          lastSeen: m.user.lastSeen
        },
        isAdmin: m.isAdmin
      })),
      lastMessage: null,
      unreadCount: 0,
      createdAt: chat.createdAt
    };

    // Emit socket event to all members
    chat.members.forEach(member => {
      const userId = member.user._id.toString();
      req.io.to(`user:${userId}`).emit('chat:updated', {
        chat: formattedGroup
      });
      // Make user's sockets join the new chat room
      req.io.in(`user:${userId}`).socketsJoin(`chat:${formattedGroup.id}`);
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/chats/:id
// @desc    Get chat details with messages
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      'members.user': req.user._id
    }).populate('members.user', 'name email phone role avatarUrl isOnline lastSeen education skills');

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const validMembers = chat.members.filter(m => m.user);
    const otherMembers = validMembers.filter(m => m.user._id.toString() !== req.user._id.toString());
    const formattedChat = {
      id: chat._id.toString(),
      isGroup: chat.isGroup,
      name: chat.isGroup ? chat.name : (otherMembers[0]?.user?.name || 'Unknown'),
      members: validMembers.map(m => ({
        id: m._id,
        user: {
          id: m.user._id,
          name: m.user.name,
          email: m.user.email,
          phone: m.user.phone,
          avatarUrl: m.user.avatarUrl,
          isOnline: m.user.isOnline,
          lastSeen: m.user.lastSeen,
          education: m.user.education,
          skills: m.user.skills,
          role: m.user.role
        },
        isAdmin: m.isAdmin
      })),
      createdAt: chat.createdAt
    };

    const messages = await Message.find({ chat: chat._id })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map(m => ({
      id: m._id,
      chatId: m.chat,
      content: m.content,
      messageType: m.messageType,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileSize: m.fileSize,
      status: m.status,
      isCompleted: m.isCompleted || false,
      scheduleDate: m.scheduleDate,
      createdAt: m.createdAt,
      senderId: m.sender ? m.sender._id.toString() : 'unknown',
      sender: m.sender ? {
        id: m.sender._id.toString(),
        name: m.sender.name
      } : { id: 'unknown', name: 'Deleted User' }
    }));

    res.json({ success: true, data: { chat: formattedChat, messages: formattedMessages } });
  } catch (error) {
    console.error('Get chat details error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/chats/:id
// @desc    Delete a chat and all its messages for everyone
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const chatId = req.params.id;

    // 1. Verify user is member of chat
    const chat = await Chat.findOne({
      _id: chatId,
      'members.user': req.user._id
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found or not authorized' });
    }

    // 2. Get member IDs for socket notification before deletion
    const memberIds = chat.members.map(m => (m.user._id || m.user).toString());

    // 3. Delete all messages associated with this chat
    await Message.deleteMany({ chat: chatId });

    // 4. Delete the chat itself
    await Chat.findByIdAndDelete(chatId);

    // 5. Notify all members via socket
    if (req.io) {
      memberIds.forEach(userId => {
        req.io.to(`user:${userId}`).emit('chat:deleted', { chatId });
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted for everyone'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
