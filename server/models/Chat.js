import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false },
  name: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isAdmin: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

chatSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Virtual for id
chatSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtuals are serialized
chatSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
