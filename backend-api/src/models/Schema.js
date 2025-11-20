import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  authSalt: {
    type: String,
    required: true,
  },
  authHash: {
    type: String,
    required: true,
  },
  encryptedEncryptionKey: {
    type: String,
    required: true,
  },
  encryptedVault: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update 'updatedAt' before saving
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for performance and uniqueness

const users = mongoose.models.users || mongoose.model('users', userSchema);

export default users;