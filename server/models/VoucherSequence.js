import mongoose from 'mongoose';

const voucherSequenceSchema = new mongoose.Schema({
  companyPrefix: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

const VoucherSequence = mongoose.model('VoucherSequence', voucherSequenceSchema);
export default VoucherSequence;
