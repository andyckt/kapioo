import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendEmail } from '@/lib/services/email';

// Define the route params interface
interface RouteParams {
  params: {
    id: string;
  };
}

// POST handler - update user balance (credits or vouchers)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    // No authentication check for simplicity
    // In a production environment, you would want to add proper authentication

    const { id } = params;
    const { field, amount, operation, description } = await request.json();
    
    // Validate input
    if (!field || !amount || !operation || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }
    
    // Make sure field is one of the allowed fields
    const allowedFields = [
      'credits', 
      'twoDishVoucher', 
      'threeDishVoucher', 
      'weeklySIXmeals', 
      'weeklyEIGHTmeals', 
      'weeklyTENmeals', 
      'weeklyTWELVEmeals'
    ];
    
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { success: false, error: 'Invalid field' },
        { status: 400 }
      );
    }
    
    // Make sure operation is either add or deduct
    if (operation !== 'add' && operation !== 'deduct') {
      return NextResponse.json(
        { success: false, error: 'Invalid operation' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find user
    const user = await User.findOne({ 
      $or: [{ _id: id }, { userID: id }] 
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has enough balance for deduction
    if (operation === 'deduct' && user[field] < amount) {
      return NextResponse.json(
        { success: false, error: `Insufficient ${field} balance` },
        { status: 400 }
      );
    }
    
    // Calculate the new balance
    const currentBalance = user[field] || 0;
    const newBalance = operation === 'add' 
      ? currentBalance + amount 
      : currentBalance - amount;
    
    // Update the user's balance
    user[field] = newBalance;
    await user.save();
    
    // Create a transaction record for all balance operations
    // Get voucher type display name for the description
    let voucherTypeName = '';
    let shortVoucherName = '';
    switch (field) {
      case 'credits':
        voucherTypeName = 'Credits';
        shortVoucherName = 'Credits';
        break;
      case 'twoDishVoucher':
        voucherTypeName = '2-Dish Vouchers';
        shortVoucherName = '2dish';
        break;
      case 'threeDishVoucher':
        voucherTypeName = '3-Dish Vouchers';
        shortVoucherName = '3dish';
        break;
      case 'weeklySIXmeals':
        voucherTypeName = '6-Meal Weekly Subscription';
        shortVoucherName = '6weekly';
        break;
      case 'weeklyEIGHTmeals':
        voucherTypeName = '8-Meal Weekly Subscription';
        shortVoucherName = '8weekly';
        break;
      case 'weeklyTENmeals':
        voucherTypeName = '10-Meal Weekly Subscription';
        shortVoucherName = '10weekly';
        break;
      case 'weeklyTWELVEmeals':
        voucherTypeName = '12-Meal Weekly Subscription';
        shortVoucherName = '12weekly';
        break;
      default:
        voucherTypeName = field;
        shortVoucherName = field;
    }
    
    const transaction = new Transaction({
      userId: user._id,
      type: operation === 'add' ? 'Add' : 'Deduct',
      amount: amount,
      description: description || `${operation === 'add' ? 'Added' : 'Deducted'} ${amount} ${shortVoucherName}`,
      status: 'completed',
      transactionId: `${operation === 'add' ? 'CR' : 'DB'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    });
    
    await transaction.save();
    
    // Send email notification when vouchers are added (not when deducted)
    if (operation === 'add' && field !== 'credits') {
      try {
        // Get voucher type display name
        let voucherTypeName = '';
        switch (field) {
          case 'twoDishVoucher':
            voucherTypeName = '2-Dish Vouchers';
            break;
          case 'threeDishVoucher':
            voucherTypeName = '3-Dish Vouchers';
            break;
          case 'weeklySIXmeals':
            voucherTypeName = '6-Meal Weekly Subscription';
            break;
          case 'weeklyEIGHTmeals':
            voucherTypeName = '8-Meal Weekly Subscription';
            break;
          case 'weeklyTENmeals':
            voucherTypeName = '10-Meal Weekly Subscription';
            break;
          case 'weeklyTWELVEmeals':
            voucherTypeName = '12-Meal Weekly Subscription';
            break;
          default:
            voucherTypeName = 'Vouchers';
        }
        
        const LOGO_URL = 'https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/src/Kapioo.png';
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        // Get Chinese voucher type name
        let chineseVoucherName = '';
        switch (field) {
          case 'twoDishVoucher':
            chineseVoucherName = '2菜餐券';
            break;
          case 'threeDishVoucher':
            chineseVoucherName = '3菜餐券';
            break;
          case 'weeklySIXmeals':
            chineseVoucherName = '6餐一周';
            break;
          case 'weeklyEIGHTmeals':
            chineseVoucherName = '8餐一周';
            break;
          case 'weeklyTENmeals':
            chineseVoucherName = '10餐一周';
            break;
          case 'weeklyTWELVEmeals':
            chineseVoucherName = '12餐一周';
            break;
          default:
            chineseVoucherName = '餐券';
        }

        // Send email notification
        const subject = `${chineseVoucherName}已添加 - Kapioo`;
        
        const html = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
            </div>
            <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${chineseVoucherName}已添加到您的账户</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              亲爱的 ${user.name}，${chineseVoucherName}已成功添加到您的账户。
            </p>
            
            <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <div style="margin-bottom: 15px;">
                <h3 style="color: #C2884E; margin: 0 0 5px 0;">交易确认</h3>
                <p style="color: #666; margin: 0;">${chineseVoucherName}已添加到您的账户</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">日期:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${new Date().toLocaleDateString('zh-CN')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">添加数量:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; color: #4CAF50; font-weight: bold;">+${amount}张 ${chineseVoucherName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">新${chineseVoucherName}余额:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; font-weight: bold;">${newBalance}张 ${chineseVoucherName}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px; text-align: center;">
              您可以在您的 <a href="${BASE_URL}/dashboard" style="color: #C2884E; text-decoration: none; font-weight: bold;">Kapioo 账户</a> 中使用这些餐券订购餐点。
            </p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
              <p style="color: #999; font-size: 14px;">
                如有任何问题，请随时联系我们: <a href="mailto:kapioomeal@gmail.com" style="color: #C2884E;">kapioomeal@gmail.com</a>
              </p>
              <p style="color: #999; font-size: 13px;">&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
            </div>
          </div>
        `;
        
        await sendEmail({
          to: user.email,
          subject,
          html
        });
        
        console.log(`${chineseVoucherName}添加通知已发送至 ${user.email}`);
      } catch (emailError) {
        console.error('Error sending voucher added notification:', emailError);
        // Continue even if email fails
      }
    }
    
    // Return the updated user without sensitive information
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.salt;
    delete userResponse.verificationCode;
    delete userResponse.verificationExpires;
    delete userResponse.resetPasswordCode;
    delete userResponse.resetPasswordExpires;
    
    return NextResponse.json({ 
      success: true, 
      data: userResponse,
      message: `${operation === 'add' ? 'Added' : 'Deducted'} ${amount} ${field} ${operation === 'add' ? 'to' : 'from'} user's account`
    });
  } catch (error) {
    console.error(`Error updating user balance:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user balance' },
      { status: 500 }
    );
  }
}