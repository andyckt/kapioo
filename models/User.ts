import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// Define Address interface
export interface IAddress {
  unitNumber?: string;
  streetAddress: string;
  city: string;
  postalCode: string;  // This corresponds to "ZIP code" in the UI
  province: string;    // This corresponds to "State" in the UI
  country: string;
  buzzCode?: string;
}

// Define Address schema - make all fields optional to allow for empty addresses during registration
const AddressSchema: Schema = new Schema({
  unitNumber: { type: String },
  streetAddress: { type: String, required: false },
  city: { type: String, required: false },
  postalCode: { type: String, required: false },
  province: { type: String, required: false },
  country: { type: String, required: false },
  buzzCode: { type: String }
}, { _id: false }); // Prevent MongoDB from creating an _id for embedded documents

// Define User interface
export interface IUser extends Document {
  userID: string;
  name: string;       // Added as required
  nickname?: string;  // Added new field
  email: string;
  password: string;   // Will store hashed password
  salt: string;       // For password hashing
  joined: Date;
  status: string;
  credits: number;
  phone?: string;
  address?: IAddress;
  verificationCode?: string;
  verificationExpires?: Date;
  isVerified: boolean;
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  setPassword: (password: string) => Promise<void>;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
  generateVerificationCode: () => { code: string, expires: Date };
  generatePasswordResetCode: () => { code: string, expires: Date };
}

// Define User schema
const UserSchema: Schema = new Schema(
  {
    userID: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    },
    name: {           // Added name field as required
      type: String,
      required: true,
      trim: true
    },
    nickname: {       // Added nickname field
      type: String,
      trim: true
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      lowercase: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    salt: {
      type: String,
      required: true
    },
    joined: { 
      type: Date, 
      default: Date.now 
    },
    status: { 
      type: String, 
      default: 'Active',
      enum: ['Active', 'Inactive', 'Suspended']
    },
    credits: { 
      type: Number, 
      default: 0 
    },
    phone: { 
      type: String 
    },
    address: { 
      type: AddressSchema,
      default: {} // Set a default empty object
    },
    // Email verification fields
    verificationCode: {
      type: String
    },
    verificationExpires: {
      type: Date
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    // Password reset fields
    resetPasswordCode: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    }
  },
  { 
    timestamps: true,
  }
);

// Method to hash password
UserSchema.methods.setPassword = async function(password: string) {
  try {
    console.log('Setting password for user:', this.email);
    console.log('Password received:', password ? 'Password provided' : 'No password provided');
    
    // Generate a random salt
    this.salt = crypto.randomBytes(16).toString('hex');
    console.log('Generated salt:', this.salt);
    
    // Hash the password with the salt
    this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
    console.log('Password hashed successfully');
  } catch (error) {
    console.error('Error in setPassword method:', error);
    throw error;
  }
};

// Method to verify password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    const hash = crypto.pbkdf2Sync(candidatePassword, this.salt, 1000, 64, 'sha512').toString('hex');
    return this.password === hash;
  } catch (error) {
    console.error('Error in comparePassword method:', error);
    throw error;
  }
};

// Method to generate email verification code
UserSchema.methods.generateVerificationCode = function() {
  try {
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Code expires in 24 hours
    
    this.verificationCode = code;
    this.verificationExpires = expires;
    
    console.log('Generated verification code:', code);
    return { code, expires };
  } catch (error) {
    console.error('Error generating verification code:', error);
    throw error;
  }
};

// Method to generate password reset code
UserSchema.methods.generatePasswordResetCode = function() {
  try {
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Code expires in 1 hour
    
    this.resetPasswordCode = code;
    this.resetPasswordExpires = expires;
    
    return { code, expires };
  } catch (error) {
    console.error('Error generating password reset code:', error);
    throw error;
  }
};

// Create model if it doesn't exist already (for Next.js hot reloading)
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
