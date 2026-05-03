import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';

import {
  decrementBalance,
  getBalance,
  incrementBalance,
  LEGACY_WEEKLY_FIELD_BY_MEALS,
} from '@/lib/plans/balances';
import { toWeeklyPlanId } from '@/lib/plans/service';
import { logAuditEvent } from '@/lib/security/audit';
import Transaction, { type ITransaction } from '@/models/Transaction';
import User from '@/models/User';

export const BALANCE_MUTATION_FIELDS = [
  'credits',
  'twoDishVoucher',
  'threeDishVoucher',
  ...Object.values(LEGACY_WEEKLY_FIELD_BY_MEALS),
] as const;

export type BalanceMutationField = (typeof BALANCE_MUTATION_FIELDS)[number];
export type BalanceMutationOperation = 'add' | 'deduct';

type UserLike = Record<string, any>;

type AuditActor = {
  user?: { _id?: unknown; email?: string };
  role?: 'user' | 'admin';
} | null;

const WEEKLY_FIELD_TO_PLAN_ID = Object.fromEntries(
  Object.entries(LEGACY_WEEKLY_FIELD_BY_MEALS).map(([mealsPerWeek, field]) => [
    field,
    toWeeklyPlanId(Number(mealsPerWeek), 1),
  ])
) as Partial<Record<BalanceMutationField, string>>;

const PLAN_ID_TO_WEEKLY_FIELD = Object.fromEntries(
  Object.entries(WEEKLY_FIELD_TO_PLAN_ID).map(([field, planId]) => [planId, field])
) as Partial<Record<string, BalanceMutationField>>;

export class BalanceMutationError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      details?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'BalanceMutationError';
    this.status = options?.status ?? 400;
    this.code = options?.code ?? 'BALANCE_MUTATION_ERROR';
    this.details = options?.details;
  }
}

export interface BalanceMutationEntry {
  field: BalanceMutationField;
  amount: number;
  operation: BalanceMutationOperation;
}

export interface ApplyBalanceMutationsOptions {
  user: UserLike;
  mutations: BalanceMutationEntry[];
  description?: string;
  transactionType?: 'Add' | 'Deduct' | 'refund' | 'debit';
  createTransaction?: boolean;
  session?: mongoose.ClientSession;
  actor?: AuditActor;
  request?: Request | NextRequest;
  auditAction?: string;
  auditTargetType?: string;
  auditTargetId?: string;
  auditMetadata?: Record<string, unknown>;
}

export interface ApplyBalanceMutationsResult {
  user: UserLike;
  transaction: ITransaction | null;
  balances: Record<BalanceMutationField, { before: number; after: number }>;
}

export function isBalanceMutationField(value: unknown): value is BalanceMutationField {
  return typeof value === 'string' && BALANCE_MUTATION_FIELDS.includes(value as BalanceMutationField);
}

export function getBalanceMutationFieldForPlanId(planId: string): BalanceMutationField | null {
  return PLAN_ID_TO_WEEKLY_FIELD[planId] ?? null;
}

export async function findBalanceMutationUser(
  identifier: string,
  session?: mongoose.ClientSession
) {
  const query =
    mongoose.Types.ObjectId.isValid(identifier)
      ? { $or: [{ _id: identifier }, { userID: identifier }] }
      : { userID: identifier };

  let dbQuery = User.findOne(query);
  if (session) {
    dbQuery = dbQuery.session(session);
  }
  return dbQuery;
}

export function toSafeUserBalanceResponse(user: UserLike) {
  const userResponse = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete userResponse.password;
  delete userResponse.salt;
  delete userResponse.verificationCode;
  delete userResponse.verificationExpires;
  delete userResponse.resetPasswordCode;
  delete userResponse.resetPasswordExpires;
  delete userResponse.adminMfaCodeHash;
  delete userResponse.adminMfaCodeExpires;
  delete userResponse.adminMfaCodeSentAt;
  return userResponse;
}

function getFieldBalance(user: UserLike, field: BalanceMutationField): number {
  const weeklyPlanId = WEEKLY_FIELD_TO_PLAN_ID[field];
  if (weeklyPlanId) {
    return getBalance(user, weeklyPlanId);
  }
  return Number(user[field]) || 0;
}

function inferTransactionType(
  mutations: BalanceMutationEntry[],
  explicitType?: 'Add' | 'Deduct' | 'refund' | 'debit'
) {
  if (explicitType) {
    return explicitType;
  }

  const uniqueOperations = Array.from(new Set(mutations.map((mutation) => mutation.operation)));
  if (uniqueOperations.length !== 1) {
    throw new BalanceMutationError('Mixed add/deduct mutations require an explicit transaction type', {
      status: 400,
      code: 'MIXED_MUTATION_OPERATIONS',
    });
  }

  return uniqueOperations[0] === 'add' ? 'Add' : 'Deduct';
}

function buildDefaultDescription(
  mutations: BalanceMutationEntry[],
  transactionType: 'Add' | 'Deduct' | 'refund' | 'debit'
) {
  const verb =
    transactionType === 'Add'
      ? 'Added'
      : transactionType === 'Deduct'
        ? 'Deducted'
        : transactionType === 'refund'
          ? 'Refunded'
          : 'Adjusted';

  return mutations
    .map((mutation) => `${verb} ${mutation.amount} ${mutation.field}`)
    .join('; ');
}

function validateMutationEntry(mutation: BalanceMutationEntry) {
  if (!isBalanceMutationField(mutation.field)) {
    throw new BalanceMutationError(`Unsupported balance field: ${String(mutation.field)}`, {
      status: 400,
      code: 'INVALID_BALANCE_FIELD',
    });
  }

  if (!Number.isInteger(mutation.amount) || mutation.amount <= 0) {
    throw new BalanceMutationError('Balance mutation amounts must be positive integers', {
      status: 400,
      code: 'INVALID_BALANCE_AMOUNT',
      details: { field: mutation.field, amount: mutation.amount },
    });
  }

  if (mutation.operation !== 'add' && mutation.operation !== 'deduct') {
    throw new BalanceMutationError(`Unsupported balance operation: ${String(mutation.operation)}`, {
      status: 400,
      code: 'INVALID_BALANCE_OPERATION',
    });
  }
}

function applyMutation(user: UserLike, mutation: BalanceMutationEntry) {
  validateMutationEntry(mutation);

  const before = getFieldBalance(user, mutation.field);

  if (mutation.operation === 'deduct' && before < mutation.amount) {
    throw new BalanceMutationError(`Insufficient ${mutation.field} balance`, {
      status: 400,
      code: 'INSUFFICIENT_BALANCE',
      details: {
        field: mutation.field,
        required: mutation.amount,
        available: before,
      },
    });
  }

  const weeklyPlanId = WEEKLY_FIELD_TO_PLAN_ID[mutation.field];
  if (weeklyPlanId) {
    if (mutation.operation === 'add') {
      incrementBalance(user, weeklyPlanId, mutation.amount);
    } else {
      decrementBalance(user, weeklyPlanId, mutation.amount);
    }
  } else {
    const delta = mutation.operation === 'add' ? mutation.amount : -mutation.amount;
    user[mutation.field] = before + delta;
  }

  const after = getFieldBalance(user, mutation.field);
  return { before, after };
}

export async function applyBalanceMutations(
  options: ApplyBalanceMutationsOptions
): Promise<ApplyBalanceMutationsResult> {
  if (!options.user) {
    throw new BalanceMutationError('User is required for balance mutation', {
      status: 500,
      code: 'MISSING_USER_DOCUMENT',
    });
  }

  if (!Array.isArray(options.mutations) || options.mutations.length === 0) {
    throw new BalanceMutationError('At least one balance mutation is required', {
      status: 400,
      code: 'MISSING_BALANCE_MUTATIONS',
    });
  }

  const transactionType = inferTransactionType(options.mutations, options.transactionType);
  const balances = {} as Record<BalanceMutationField, { before: number; after: number }>;

  for (const mutation of options.mutations) {
    balances[mutation.field] = applyMutation(options.user, mutation);
  }

  const saveOptions = options.session ? { session: options.session } : undefined;
  await options.user.save(saveOptions);

  let transaction: ITransaction | null = null;
  if (options.createTransaction !== false) {
    const transactionId = await Transaction.generateTransactionId(transactionType);
    const transactionDescription =
      options.description || buildDefaultDescription(options.mutations, transactionType);

    transaction = new Transaction({
      transactionId,
      userId: options.user._id,
      type: transactionType,
      amount: options.mutations.reduce((sum, mutation) => sum + mutation.amount, 0),
      description: transactionDescription,
    });
    await transaction.save(saveOptions);
  }

  if (options.auditAction) {
    await logAuditEvent({
      actor: options.actor,
      action: options.auditAction,
      targetType: options.auditTargetType || 'user-balance',
      targetId: options.auditTargetId || String(options.user._id),
      metadata: {
        mutations: options.mutations,
        transactionId: transaction?.transactionId || null,
        description: options.description || null,
        ...(options.auditMetadata || {}),
      },
      request: options.request,
      session: options.session,
    });
  }

  return {
    user: options.user,
    transaction,
    balances,
  };
}
