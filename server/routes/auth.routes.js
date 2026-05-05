import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { name, email, password, phone, aadhaarNumber, role, education, skills, aadhaarFrontImage, aadhaarBackImage } = req.body;

      // Check if user exists
      const query = [{ email }];
      if (aadhaarNumber && aadhaarNumber.trim() !== "") {
        query.push({ aadhaarNumber });
      }

      const existingUser = await User.findOne({ $or: query });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === email ? 'Email already registered' : 'Aadhaar number already registered'
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password, // Will be hashed by pre-save hook
        phone,
        aadhaarNumber: (aadhaarNumber && aadhaarNumber.trim() !== "") ? aadhaarNumber : undefined,
        role,
        education,
        skills: skills || [],
        aadhaarFrontImage,
        aadhaarBackImage
      });

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            education: user.education,
            skills: user.skills
          },
          token
        }
      });

      // Emit socket event to all users about the new registration
      if (req.io) {
        req.io.emit('user:created', {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            education: user.education,
            skills: user.skills,
            isOnline: false
          }
        });
      }
    } catch (error) {
      console.error('Signup error details:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error during registration',
        error: error.message 
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            education: user.education,
            skills: user.skills
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error during login' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// @route   POST /api/auth/push-subscription
// @desc    Save push subscription for current user
// @access  Private
router.post('/push-subscription', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ success: false, message: 'Subscription is required' });
    }

    await User.findByIdAndUpdate(decoded.userId, { pushSubscription: subscription });

    res.json({ success: true, message: 'Push subscription saved successfully' });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// @route   POST /api/auth/expo-push-token
// @desc    Register an Expo push token for mobile notifications
// @access  Private
router.post('/expo-push-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ success: false, message: 'Expo push token is required' });
    }

    // Add token to array if not already present
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.expoPushTokens) user.expoPushTokens = [];
    
    if (!user.expoPushTokens.includes(expoPushToken)) {
      user.expoPushTokens.push(expoPushToken);
      await user.save();
      console.log(`📱 Expo push token registered for user ${decoded.userId}: ${expoPushToken}`);
    } else {
      console.log(`📱 Expo push token already exists for user ${decoded.userId}`);
    }

    res.json({ success: true, message: 'Expo push token registered' });
  } catch (error) {
    console.error('Expo push token registration error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// @route   DELETE /api/auth/expo-push-token
// @desc    Unregister an Expo push token
// @access  Private
router.delete('/expo-push-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ success: false, message: 'Expo push token is required' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.expoPushTokens) {
      user.expoPushTokens = user.expoPushTokens.filter(t => t !== expoPushToken);
      await user.save();
      console.log(`📱 Expo push token removed for user ${decoded.userId}: ${expoPushToken}`);
    }

    res.json({ success: true, message: 'Expo push token unregistered' });
  } catch (error) {
    console.error('Expo push token unregistration error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

export default router;
