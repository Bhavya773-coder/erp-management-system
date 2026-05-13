import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  srNo: { type: Number },
  classification: { type: String },
  name: { type: String, required: true, unique: true },
  regNo: { type: String },
  buildYear: { type: Number },
  length: { type: String }, // Using string as some might be '46.4' or have units
  breadth: { type: String },
  depth: { type: String },
  irs_iv: { type: String },
  location: { type: String },
  remark: { type: String },
  status: { type: String, default: 'IDLE', enum: ['IDLE', 'ON_HIRE', 'MAINTENANCE', 'UNKNOWN'] },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
