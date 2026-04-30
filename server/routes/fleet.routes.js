import express from 'express';
import Fleet from '../models/Fleet.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/fleet
// @desc    Get all fleet files
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const files = await Fleet.find()
      .populate('uploadedBy', 'name email avatarUrl')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: { files } });
  } catch (error) {
    console.error('Fetch fleet files error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/fleet
// @desc    Upload a fleet file
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const { fileName, fileUrl, description, fileSize, fileType } = req.body;

    if (!fileName || !fileUrl || !description) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const newFile = await Fleet.create({
      fileName,
      fileUrl,
      description,
      fileSize,
      fileType,
      uploadedBy: req.user.id
    });

    const populatedFile = await Fleet.findById(newFile._id).populate('uploadedBy', 'name email avatarUrl');

    res.status(201).json({ success: true, data: { file: populatedFile } });
  } catch (error) {
    console.error('Create fleet file error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/fleet/:id
// @desc    Delete a fleet file
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const file = await Fleet.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Only admin or uploader can delete
    if (req.user.role !== 'ADMIN' && file.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Fleet.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete fleet file error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
