import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// Define Address interface
export interface IAddress {
  unitNumber?: string;
  streetAddress: string;
  postalCode: string;  // This corresponds to "ZIP code" in the UI
  province: string;    // This corresponds to "State" in the UI
  country: string;     // Always "Canada" by default, not shown in UI
  buzzCode?: string;
}

// Define Address schema - make all fields optional to allow for empty addresses during registration
const AddressSchema: Schema = new Schema({
  unitNumber: { type: String },
  streetAddress: { type: String, required: false },
  postalCode: { type: String, required: false },
  province: { type: String, required: false },
  country: { type: String, default: 'Canada' },
  buzzCode: { type: String }
}, { _id: false }); // Prevent MongoDB from creating an _id for embedded documents

// Define User interface
export interface IUser extends Document {
  userID: string;
  name: string;       // Added as required
  nickname?: string;  // Added new field
  role: 'user' | 'admin';
  email: string;
  password: string;   // Will store hashed password
  salt: string;       // For password hashing
  passwordIterations?: number;
  joined: Date;
  status: string;
  sessionVersion: number;
  credits: number;    // Legacy field, kept for backward compatibility
  twoDishVoucher: number;  // Voucher for two-dish meals
  threeDishVoucher: number; // Voucher for three-dish meals
  weeklySIXmeals: number;  // Weekly subscription for 6 meals
  weeklyEIGHTmeals: number; // Weekly subscription for 8 meals
  weeklyTENmeals: number;  // Weekly subscription for 10 meals
  weeklyTWELVEmeals: number; // Weekly subscription for 12 meals
  weeklySIXTEENmeals: number; // Weekly subscription for 16 meals
  planBalances?: Record<string, number>;
  phone?: string;
  address?: IAddress;
  verificationCode?: string;
  verificationExpires?: Date;
  isVerified: boolean;
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  adminMfaCodeHash?: string;
  adminMfaCodeExpires?: Date;
  adminMfaCodeSentAt?: Date;
  languagePreference: 'zh' | 'en';
  emailPreferences?: {
    nextWeekMenuUpdates?: boolean;
    weeklyMenuUpdates?: boolean;
    dailyMenuUpdates?: boolean;
    orderUpdates?: boolean;
    marketing?: boolean;
  };
  emailStatus?: 'active' | 'bounced' | 'blocked' | 'invalid';
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
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
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
    passwordIterations: {
      type: Number,
      default: 310000
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
    sessionVersion: {
      type: Number,
      default: 1
    },
    credits: { 
      type: Number, 
      default: 0 
    },
    twoDishVoucher: {
      type: Number,
      default: 0
    },
    threeDishVoucher: {
      type: Number,
      default: 0
    },
    weeklySIXmeals: {
      type: Number,
      default: 0
    },
    weeklyEIGHTmeals: {
      type: Number,
      default: 0
    },
    weeklyTENmeals: {
      type: Number,
      default: 0
    },
    weeklyTWELVEmeals: {
      type: Number,
      default: 0
    },
    weeklySIXTEENmeals: {
      type: Number,
      default: 0
    },
    planBalances: {
      type: Map,
      of: Number,
      default: {}
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
    },
    adminMfaCodeHash: {
      type: String
    },
    adminMfaCodeExpires: {
      type: Date
    },
    adminMfaCodeSentAt: {
      type: Date
    },
    // Language preference
    languagePreference: {
      type: String,
      enum: ['zh', 'en'],
      default: 'zh'
    },
    // Email preferences (for unsubscribe functionality)
    emailPreferences: {
      nextWeekMenuUpdates: {
        type: Boolean,
        default: true
      },
      weeklyMenuUpdates: {
        type: Boolean,
        default: true
      },
      dailyMenuUpdates: {
        type: Boolean,
        default: true
      },
      orderUpdates: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: true
      }
    },
    // Email delivery status (for bounce tracking)
    emailStatus: {
      type: String,
      enum: ['active', 'bounced', 'blocked', 'invalid'],
      default: 'active'
    }
  },
  { 
    timestamps: true,
  }
);

// Method to hash password
UserSchema.methods.setPassword = async function(password: string) {
  try {
    // Generate a random salt
    this.salt = crypto.randomBytes(16).toString('hex');
    this.passwordIterations = 310000;

    // Hash the password with the salt
    this.password = crypto
      .pbkdf2Sync(password, this.salt, this.passwordIterations, 64, 'sha512')
      .toString('hex');
  } catch (error) {
    console.error('Error in setPassword method:', error);
    throw error;
  }
};

// Method to verify password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    const iterations = Number(this.passwordIterations || 1000);
    const hash = crypto
      .pbkdf2Sync(candidatePassword, this.salt, iterations, 64, 'sha512')
      .toString('hex');
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
