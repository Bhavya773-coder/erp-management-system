import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  content: { type: String },
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  messageType: { type: String, enum: ['TEXT', 'FILE', 'IMAGE'], default: 'TEXT' },
  status: { type: String, enum: ['SENT', 'DELIVERED', 'SEEN'], default: 'SENT' },
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
