import mongoose from 'mongoose';

const fleetSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  description: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileSize: { type: Number },
  fileType: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Fleet = mongoose.model('Fleet', fleetSchema);

export default Fleet;
