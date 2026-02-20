import mongoose, { Document, Model, Schema } from 'mongoose';

export type NextWeekEmailJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type NextWeekEmailJobCriteriaType = 'all' | 'selected';

export interface INextWeekMenuEmailJob extends Document {
  status: NextWeekEmailJobStatus;
  criteriaType: NextWeekEmailJobCriteriaType;
  userIds: string[];
  totalUsers: number;
  cursor: number;
  sentCount: number;
  failedCount: number;
  failedEmails: Array<{
    userId?: string;
    email?: string;
    name?: string;
    error: string;
    occurredAt: Date;
  }>;
  lockOwner?: string | null;
  lockExpiresAt?: Date | null;
  createdBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  lastProcessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INextWeekMenuEmailJobModel
  extends Model<INextWeekMenuEmailJob> {}

const NextWeekMenuEmailJobSchema = new Schema<INextWeekMenuEmailJob>(
  {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      required: true
    },
    criteriaType: {
      type: String,
      enum: ['all', 'selected'],
      required: true
    },
    userIds: {
      type: [String],
      default: []
    },
    totalUsers: {
      type: Number,
      required: true,
      default: 0
    },
    cursor: {
      type: Number,
      required: true,
      default: 0
    },
    sentCount: {
      type: Number,
      required: true,
      default: 0
    },
    failedCount: {
      type: Number,
      required: true,
      default: 0
    },
    failedEmails: {
      type: [
        {
          _id: false,
          userId: { type: String },
          email: { type: String },
          name: { type: String },
          error: { type: String, required: true },
          occurredAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    lockOwner: {
      type: String,
      default: null
    },
    lockExpiresAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: String
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    lastProcessedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

NextWeekMenuEmailJobSchema.index({ status: 1, createdAt: 1 });
NextWeekMenuEmailJobSchema.index({ lockExpiresAt: 1 });

const NextWeekMenuEmailJob: INextWeekMenuEmailJobModel =
  (mongoose.models.NextWeekMenuEmailJob as INextWeekMenuEmailJobModel) ||
  mongoose.model<INextWeekMenuEmailJob, INextWeekMenuEmailJobModel>(
    'NextWeekMenuEmailJob',
    NextWeekMenuEmailJobSchema
  );

export default NextWeekMenuEmailJob;
