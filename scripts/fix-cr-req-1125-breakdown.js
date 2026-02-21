require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

const REQUEST_ID = 'CR-REQ-1125';

const mealPriceMap = {
  1: { 6: 112, 8: 148, 10: 183, 12: 217, 16: 286 },
  2: { 6: 219, 8: 290, 10: 359, 12: 428, 16: 562 },
  4: { 6: 398, 8: 525, 10: 648, 12: 765, 16: 998 },
  8: { 6: 744, 8: 979, 10: 1210, 12: 1428, 16: 1870 }
};

const mealTypeToCount = {
  '6aweek': 6,
  '8aweek': 8,
  '10aweek': 10,
  '12aweek': 12,
  '16aweek': 16
};

const toMoney = (value) => Number(Number(value).toFixed(2));

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(mongoUri);

  const creditCollection = mongoose.connection.collection('creditpurchaserequests');
  const userCollection = mongoose.connection.collection('users');

  const request = await creditCollection.findOne({ requestId: REQUEST_ID });
  if (!request) {
    console.log(`[fix-cr-req-1125] request not found: ${REQUEST_ID}`);
    return;
  }

  const duration = Number(request.mealPlanQuantity || 0);
  const mealsPerWeek = mealTypeToCount[request.mealPlanType] || 0;
  const mealSubtotal = mealPriceMap[duration]?.[mealsPerWeek];
  if (!mealSubtotal) {
    throw new Error(
      `[fix-cr-req-1125] invalid plan combination for ${REQUEST_ID}: duration=${duration}, meals=${mealsPerWeek}`
    );
  }

  const user = await userCollection.findOne(
    { _id: request.userId },
    { projection: { 'address.province': 1 } }
  );
  const province = user?.address?.province || '';
  const deliveryFeePerWeek = province === 'Hamilton' || province === 'Burlington' ? 15.99 : 11.99;
  const deliveryFeeTotal = toMoney(deliveryFeePerWeek * duration);
  const combinedSubtotal = toMoney(mealSubtotal + deliveryFeeTotal);

  const paymentMethod = request.paymentMethod;
  let promoDiscountAmount = toMoney(Number(request.promoDiscountAmount || 0));
  let taxAmount = 0;
  let finalTotal = combinedSubtotal;

  if (paymentMethod === 'wechat') {
    promoDiscountAmount = toMoney(combinedSubtotal * 0.1);
    finalTotal = toMoney(combinedSubtotal - promoDiscountAmount);
    taxAmount = 0;
  } else {
    const discountedSubtotal = toMoney(Math.max(0, combinedSubtotal - promoDiscountAmount));
    taxAmount = toMoney(discountedSubtotal * 0.13);
    finalTotal = toMoney(discountedSubtotal + taxAmount);
  }

  const updatePayload = {
    originalPrice: combinedSubtotal,
    originalSubtotal: combinedSubtotal,
    mealSubtotal: toMoney(mealSubtotal),
    deliveryFeePerWeek: toMoney(deliveryFeePerWeek),
    deliveryFeeTotal,
    promoDiscountAmount,
    taxAmount,
    finalTotal,
    amount: finalTotal,
    updatedAt: new Date()
  };

  await creditCollection.updateOne({ _id: request._id }, { $set: updatePayload });

  console.log('[fix-cr-req-1125] updated request:', REQUEST_ID);
  console.log(updatePayload);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
