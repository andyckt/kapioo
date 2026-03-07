import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import connectToDatabase from '../lib/db';
import User from '../models/User';

type Scope = 'admins' | 'all-users';

function getScopeArg(): Scope {
  const scopeArg = process.argv.find((arg) => arg.startsWith('--scope='));
  const scope = scopeArg?.split('=')[1];

  if (!scope || scope === 'admins') {
    return 'admins';
  }

  if (scope === 'all-users') {
    return 'all-users';
  }

  throw new Error('Invalid --scope value. Use --scope=admins or --scope=all-users.');
}

async function main() {
  const scope = getScopeArg();
  const confirm = process.argv.includes('--confirm');
  const filter = scope === 'all-users' ? {} : { role: 'admin' };

  await connectToDatabase();

  const matchingUsers = await User.find(filter)
    .select('_id userID role sessionVersion email')
    .sort({ role: 1, userID: 1 })
    .lean();

  console.log(`[invalidate-sessions] scope=${scope}`);
  console.log(`[invalidate-sessions] matchedUsers=${matchingUsers.length}`);

  if (!matchingUsers.length) {
    console.log('[invalidate-sessions] No matching users found. Nothing to do.');
    return;
  }

  if (!confirm) {
    console.log('[invalidate-sessions] Dry run only. No changes were written.');
    console.log('[invalidate-sessions] Re-run with --confirm to bump sessionVersion and revoke existing sessions.');
    return;
  }

  const result = await User.updateMany(filter, { $inc: { sessionVersion: 1 } });

  console.log(
    `[invalidate-sessions] completed matched=${result.matchedCount} modified=${result.modifiedCount}`
  );
  console.log('[invalidate-sessions] Existing sessions for the selected scope should now be invalid.');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('[invalidate-sessions] failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
