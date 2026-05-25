import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema(
  {
    themeId: { type: String, required: true },
    imageData: { type: String, required: true },
    playerName: { type: String, default: 'Guest' },
  },
  { timestamps: true }
);

export default mongoose.model('Photo', photoSchema);
