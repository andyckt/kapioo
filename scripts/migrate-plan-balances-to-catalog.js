/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

function toWeeklyPlanId(meals, weeks) {
  return `weekly-${meals}x${weeks}`;
}

function toDailyPlanId(type, qty) {
  return `daily-${type === 'twoDish' ? '2dish' : '3dish'}-${qty}`;
}

function deriveWeeklyPlanId(request) {
  if (request.planId) return request.planId;
  const qty = Number(request.mealPlanQuantity || 0);
  const mealsFromType = Number(String(request.mealPlanType || '').replace('aweek', ''));
  if (Number.isFinite(mealsFromType) && Number.isFinite(qty) && qty > 0) {
    return toWeeklyPlanId(mealsFromType, qty);
  }
  return null;
}

function deriveDailyPlanId(request) {
  if (request.planId) return request.planId;
  if (!request.type || !request.quantity) return null;
  return toDailyPlanId(request.type, Number(request.quantity));
}

async function run() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI');
  }

  console.log(`[PlanMigration] mode=${apply ? 'APPLY' : 'DRY_RUN'}`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');
  const weeklyCollection = db.collection('creditpurchaserequests');
  const dailyCollection = db.collection('voucherpurchaserequests');

  const users = await usersCollection.find({}).toArray();
  let usersUpdated = 0;
  for (const user of users) {
    const planBalances = user.planBalances || {};

    const updates = [
      [toWeeklyPlanId(6, 1), Number(user.weeklySIXmeals || 0)],
      [toWeeklyPlanId(8, 1), Number(user.weeklyEIGHTmeals || 0)],
      [toWeeklyPlanId(10, 1), Number(user.weeklyTENmeals || 0)],
      [toWeeklyPlanId(12, 1), Number(user.weeklyTWELVEmeals || 0)],
      [toWeeklyPlanId(16, 1), Number(user.weeklySIXTEENmeals || 0)]
    ];

    let changed = false;
    updates.forEach(([planId, amount]) => {
      if (amount > 0 && (!Number.isFinite(Number(planBalances[planId])) || Number(planBalances[planId]) < amount)) {
        planBalances[planId] = amount;
        changed = true;
      }
    });

    if (changed) {
      usersUpdated += 1;
      if (apply) {
        // eslint-disable-next-line no-await-in-loop
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { planBalances } }
        );
      }
    }
  }

  const weeklyRequests = await weeklyCollection.find({}).toArray();
  let weeklyUpdated = 0;
  for (const req of weeklyRequests) {
    const planId = deriveWeeklyPlanId(req);
    if (planId && req.planId !== planId) {
      weeklyUpdated += 1;
      if (apply) {
        // eslint-disable-next-line no-await-in-loop
        await weeklyCollection.updateOne(
          { _id: req._id },
          { $set: { planId } }
        );
      }
    }
  }

  const dailyRequests = await dailyCollection.find({}).toArray();
  let dailyUpdated = 0;
  for (const req of dailyRequests) {
    const planId = deriveDailyPlanId(req);
    if (planId && req.planId !== planId) {
      dailyUpdated += 1;
      if (apply) {
        // eslint-disable-next-line no-await-in-loop
        await dailyCollection.updateOne(
          { _id: req._id },
          { $set: { planId } }
        );
      }
    }
  }

  console.log('[PlanMigration] summary', {
    usersScanned: users.length,
    usersWouldUpdate: usersUpdated,
    weeklyRequestsScanned: weeklyRequests.length,
    weeklyRequestsWouldUpdate: weeklyUpdated,
    dailyRequestsScanned: dailyRequests.length,
    dailyRequestsWouldUpdate: dailyUpdated,
    applied: apply
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('[PlanMigration] failed', error);
  await mongoose.disconnect();
  process.exit(1);
});

