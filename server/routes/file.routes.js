import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// @route   POST /api/files/upload
// @desc    Upload a file
// @access  Private
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const relativePath = req.file.path.replace(/\\/g, '/');
    const fileUrl = `/${relativePath}`;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading file'
    });
  }
});

// @route   POST /api/files/upload-aadhaar
// @desc    Upload Aadhaar images
// @access  Public
router.post('/upload-aadhaar', upload.fields([
  { name: 'aadhaarFront', maxCount: 1 },
  { name: 'aadhaarBack', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files || (!files.aadhaarFront && !files.aadhaarBack)) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar images required'
      });
    }

    const result = {};

    if (files.aadhaarFront) {
      result.aadhaarFrontImage = `/uploads/aadhaar/${files.aadhaarFront[0].filename}`;
    }

    if (files.aadhaarBack) {
      result.aadhaarBackImage = `/uploads/aadhaar/${files.aadhaarBack[0].filename}`;
    }

    res.json({
      success: true,
      message: 'Aadhaar images uploaded successfully',
      data: result
    });
  } catch (error) {
    console.error('Aadhaar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading Aadhaar images'
    });
  }
});

// @route   GET /api/files/download/:filename
// @desc    Download a file
// @access  Private
router.get('/download/*', authenticate, async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(process.cwd(), 'uploads', filePath);

    // Security check: ensure file is within uploads directory
    const resolvedPath = path.resolve(fullPath);
    const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads'));
    
    if (!resolvedPath.startsWith(uploadsDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.download(fullPath);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while downloading file'
    });
  }
});

// @route   GET /api/files/preview/:filename
// @desc    Preview a file (for images)
// @access  Private
router.get('/preview/*', authenticate, async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(process.cwd(), 'uploads', filePath);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads'));
    
    if (!resolvedPath.startsWith(uploadsDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.sendFile(fullPath);
  } catch (error) {
    console.error('File preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while previewing file'
    });
  }
});

export default router;
