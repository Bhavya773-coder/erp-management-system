import express from 'express';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/users/subscribe
// @desc    Subscribe to push notifications
// @access  Private
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const subscription = req.body;
    
    // Validate subscription object
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription object'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if subscription already exists to prevent duplicates
    const subscriptionExists = user.pushSubscriptions?.some(
      sub => sub.endpoint === subscription.endpoint
    );

    if (!subscriptionExists) {
      if (!user.pushSubscriptions) {
        user.pushSubscriptions = [];
      }
      user.pushSubscriptions.push(subscription);
      await user.save();
      console.log(`New push subscription saved for user ${user._id}:`, subscription.endpoint);
    } else {
      console.log(`Push subscription already exists for user ${user._id}`);
    }

    res.status(201).json({
      success: true,
      message: 'Subscription saved successfully'
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving subscription'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, role } = req.query;
    
    const query = {
      _id: { $ne: req.user._id } // Exclude current user
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('name email phone role education skills createdAt')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: users.length,
      data: { users }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('name email phone role education skills createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @route   GET /api/users/profile/me
// @desc    Get current user profile
// @access  Private
router.get('/profile/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { phone, education, skills, avatarUrl } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 
        $set: { 
          phone, 
          education, 
          skills: Array.isArray(skills) ? skills : skills?.split(',').map(s => s.trim()).filter(Boolean),
          avatarUrl 
        } 
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

    // Emit socket event to all users to update their user lists/chats
    req.io.emit('user:updated', {
      userId: updatedUser._id,
      updates: {
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
        phone: updatedUser.phone,
        education: updatedUser.education,
        skills: updatedUser.skills
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private/Admin
router.put('/:id/role', authenticate, async (req, res) => {
  try {
    // Only admins can change roles
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }

    const { role } = req.body;
    const { id } = req.params;

    if (!['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user: updatedUser }
    });

    // Notify the specific user about their role change
    req.io.to(`user:${id}`).emit('user:role_updated', {
      role: updatedUser.role
    });

    // Also notify everyone else to update their user list
    req.io.emit('user:updated', {
      userId: id,
      updates: { role: updatedUser.role }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating role'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Only admins can delete users
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }

    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account'
      });
    }

    // Deep cleanup start
    // 1. Find all chats this user is part of
    const userChats = await Chat.find({ 'members.user': id });
    
    for (const chat of userChats) {
      if (chat.isGroup) {
        // If it's a group, just remove the user from members
        await Chat.findByIdAndUpdate(chat._id, {
          $pull: { members: { user: id } }
        });
      } else {
        // If it's individual, delete the whole chat and its messages
        await Message.deleteMany({ chat: chat._id });
        await Chat.findByIdAndDelete(chat._id);
      }
    }

    // 2. Delete any orphaned messages sent by this user in other chats
    await Message.deleteMany({ sender: id });

    // 3. Finally delete the user
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

    // Notify the user they've been deleted (to force logout)
    req.io.to(`user:${id}`).emit('user:deleted_self');

    // Notify everyone else
    req.io.emit('user:deleted', { userId: id });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

export default router;
