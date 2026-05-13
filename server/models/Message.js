import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  forwarded: { type: Boolean, default: false },
  forwardCount: { type: Number, default: 0 },
  content: { type: String },
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  messageType: { type: String, enum: ['TEXT', 'FILE', 'IMAGE', 'SCHEDULE', 'VOUCHER', 'TASK'], default: 'TEXT' },
  voucherData: {
    company: { type: String },
    number: { type: String },
    amount: { type: Number },
    narration: { type: String },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'DENIED'], default: 'PENDING' },
    preparedBy: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date }
  },
  taskData: {
    title: { type: String },
    description: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedToName: { type: String },
    endTime: { type: Date },
    status: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
    completedAt: { type: Date }
  },
  status: { type: String, enum: ['SENT', 'DELIVERED', 'SEEN'], default: 'SENT' },
  scheduleDate: { type: Date },
  isCompleted: { type: Boolean, default: false },
  isNotified: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

messageSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Virtual for id
messageSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtuals are serialized
messageSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

const Message = mongoose.model('Message', messageSchema);
export default Message;
