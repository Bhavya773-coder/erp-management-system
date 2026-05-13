import express from 'express';
import Fleet from '../models/Fleet.js';
import Asset from '../models/Asset.js';
import { authenticate } from '../middleware/auth.js';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

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

// @route   GET /api/fleet/assets
// @desc    Get all assets (Barges/Tugs)
// @access  Private
router.get('/assets', authenticate, async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate('lastUpdatedBy', 'name email')
      .sort({ name: 1 });
    
    res.json({ success: true, data: { assets } });
  } catch (error) {
    console.error('Fetch assets error:', error);
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

// @route   POST /api/fleet/process/:id
// @desc    Process a fleet file and update assets
// @access  Private
router.post('/process/:id', authenticate, async (req, res) => {
  try {
    const fleetFile = await Fleet.findById(req.params.id);
    if (!fleetFile) {
      return res.status(404).json({ success: false, message: 'Fleet file not found' });
    }

    // Convert relative URL to absolute path
    // Assuming fileUrl is like /uploads/filename.xlsx
    const relativePath = fleetFile.fileUrl.startsWith('/') ? fleetFile.fileUrl.substring(1) : fleetFile.fileUrl;
    const filePath = path.join(process.cwd(), relativePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Physical file not found on server' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length < 2) {
      return res.status(400).json({ success: false, message: 'Excel file is empty or invalid format' });
    }

    // Row 0 is the header names as interpreted by xlsx (SR NO, CLASSIFICATION, etc.)
    // But as we saw, Row 0 might be data if headers are not correctly recognized.
    // Based on our analysis, the first object in 'data' is the human-readable header names.
    // So actual data starts from index 1.
    const rows = data.slice(1); 

    const results = { updated: 0, created: 0, errors: 0 };

    for (const row of rows) {
      const assetName = row['__EMPTY_1']?.trim();
      if (!assetName) continue;

      const assetData = {
        srNo: typeof row['EQUIPMENT LIST'] === 'number' ? row['EQUIPMENT LIST'] : undefined,
        classification: row['__EMPTY'],
        name: assetName,
        regNo: row['__EMPTY_2'],
        buildYear: typeof row['__EMPTY_3'] === 'number' ? row['__EMPTY_3'] : undefined,
        length: String(row['__EMPTY_4'] || ''),
        breadth: String(row['__EMPTY_5'] || ''),
        depth: String(row['__EMPTY_6'] || ''),
        irs_iv: row['__EMPTY_7'],
        location: row['__EMPTY_8'],
        remark: row['__EMPTY_9'],
        lastUpdatedBy: req.user.id,
        updatedAt: new Date()
      };

      try {
        // Find by name (case-insensitive)
        const existing = await Asset.findOne({ 
          name: { $regex: new RegExp(`^${assetData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
        });

        if (existing) {
          await Asset.findByIdAndUpdate(existing._id, assetData);
          results.updated++;
        } else {
          await Asset.create(assetData);
          results.created++;
        }
      } catch (err) {
        console.error(`Error processing asset ${assetName}:`, err);
        results.errors++;
      }
    }

    res.json({ 
      success: true, 
      message: 'Fleet processing completed',
      data: results 
    });
  } catch (error) {
    console.error('Process fleet file error:', error);
    res.status(500).json({ success: false, message: 'Server error during processing' });
  }
});

export default router;
