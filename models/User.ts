import mongoose, { Schema, Document } from 'mongoose';

import {
  PASSWORD_PBKDF2_ITERATIONS,
  createPasswordSalt,
  hashPassword,
  verifyPassword,
} from '@/lib/auth/password';

// Define Address interface
export interface IAddress {
  unitNumber?: string;
  streetAddress: string;
  postalCode: string;  // This corresponds to "ZIP code" in the UI
  province: string;    // This corresponds to "State" in the UI
  country: string;     // Always "Canada" by default, not shown in UI
  buzzCode?: string;
}

export interface IAddressGeo {
  placeId?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  country?: string;
  source?: 'google' | 'manual';
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

const AddressGeoSchema: Schema = new Schema({
  placeId: { type: String },
  formattedAddress: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  streetNumber: { type: String },
  route: { type: String },
  locality: { type: String },
  administrativeArea: { type: String },
  postalCode: { type: String },
  country: { type: String },
  source: { type: String, enum: ['google', 'manual'], default: 'google' },
}, { _id: false });

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
  addressGeo?: IAddressGeo;
  deliveryNotes?: string;
  addressVerified: boolean;
  addressVerifiedAt?: Date;
  legacyAddress?: IAddress;
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
      // Legacy users (seed data) may omit this; verifyPassword falls back to 1k then 310k.
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
    addressGeo: {
      type: AddressGeoSchema,
    },
    deliveryNotes: {
      type: String,
    },
    addressVerified: {
      type: Boolean,
      default: false,
    },
    addressVerifiedAt: {
      type: Date,
    },
    legacyAddress: {
      type: AddressSchema,
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

// Method to hash password (async PBKDF2 — avoids blocking the serverless event loop)
UserSchema.methods.setPassword = async function(password: string) {
  try {
    this.salt = createPasswordSalt();
    this.passwordIterations = PASSWORD_PBKDF2_ITERATIONS;
    this.password = await hashPassword(password, this.salt, PASSWORD_PBKDF2_ITERATIONS);
    this.markModified('password');
    this.markModified('salt');
    this.markModified('passwordIterations');
  } catch (error) {
    console.error('Error in setPassword method:', error);
    throw error;
  }
};

// Method to verify password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return verifyPassword(
      candidatePassword,
      this.salt,
      this.password,
      this.passwordIterations
    );
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
