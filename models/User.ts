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

// Define Address schema
const AddressSchema: Schema = new Schema({
  unitNumber: { type: String },
  streetAddress: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  province: { type: String, required: true },
  country: { type: String, required: true },
  buzzCode: { type: String }
});

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
  comparePassword: (candidatePassword: string) => Promise<boolean>;
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
    address: AddressSchema
  },
  { 
    timestamps: true,
  }
);

// Method to hash password
UserSchema.methods.setPassword = async function(password: string) {
  // Generate a random salt
  this.salt = crypto.randomBytes(16).toString('hex');
  
  // Hash the password with the salt
  this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

// Method to verify password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const hash = crypto.pbkdf2Sync(candidatePassword, this.salt, 1000, 64, 'sha512').toString('hex');
  return this.password === hash;
};

// Create model if it doesn't exist already (for Next.js hot reloading)
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 