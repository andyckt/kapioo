# Fix Weekly Orders Multi-Week Bug

## Problem Description

Due to a bug in the weekly mealbox ordering system, some orders were created with incorrect delivery dates. This happened when users selected meals from different weeks (e.g., Week 1 instead of Week 0).

**Symptoms:**
- Orders showing wrong delivery dates (e.g., Jan 11 instead of Jan 18)
- Multiple delivery dates merged into a single order
- Missing orders for some delivery dates
- Vouchers already deducted but orders incorrect

## Solution Overview

We've created two scripts to fix this issue:

1. **`fix-weekly-orders-multi-week-bug.js`** - Identifies affected orders and generates a report
2. **`apply-weekly-orders-fix.js`** - Applies the fixes to the database

## Step-by-Step Instructions

### Prerequisites

1. Make sure you have Node.js installed
2. Have your MongoDB connection string ready
3. **BACKUP YOUR DATABASE BEFORE RUNNING ANY SCRIPTS!**

### Step 1: Set MongoDB Connection String

Update the `MONGODB_URI` in both scripts, or set it as an environment variable:

```bash
export MONGODB_URI="your-mongodb-connection-string"
```

### Step 2: Identify Affected Orders

Run the identification script:

```bash
cd /Users/donaldsfolder/Downloads/kapioo-1/scripts
node fix-weekly-orders-multi-week-bug.js
```

This will:
- Scan all orders created after Jan 1, 2026
- Identify orders with multiple delivery dates or wrong dates
- Generate a detailed report
- Create `fix-template.json` file

**Review the output carefully!**

### Step 3: Review and Update Fix Template

Open `fix-template.json` and review each affected order:

```json
{
  "orderId": "WS-83786512",
  "userEmail": "kz_0224@hotmail.com",
  "currentStatus": "pending",
  "action": "SPLIT_ORDER",
  "itemsByDate": [
    {
      "currentDate": "Jan 11",
      "items": [
        {
          "dayId": "sunday",
          "optionName": "Meal Option Name",
          "quantity": 3
        }
      ],
      "suggestedCorrectDate": "MANUAL_REVIEW_NEEDED"  // ← UPDATE THIS!
    },
    {
      "currentDate": "Jan 13",
      "items": [
        {
          "dayId": "tuesday",
          "optionName": "Meal Option Name",
          "quantity": 3
        }
      ],
      "suggestedCorrectDate": "MANUAL_REVIEW_NEEDED"  // ← UPDATE THIS!
    }
  ]
}
```

**For each order:**
1. Contact the customer to confirm correct delivery dates (if possible)
2. Update `"suggestedCorrectDate"` fields with the correct dates (e.g., "Jan 18", "Jan 20")
3. Save the file

**Example of corrected entry:**
```json
{
  "suggestedCorrectDate": "Jan 18"  // ← Corrected!
}
```

### Step 4: Apply the Fixes

Once you've reviewed and updated `fix-template.json`, run the fix script:

```bash
node apply-weekly-orders-fix.js
```

This will:
- Validate that all dates have been reviewed
- Show a summary of changes to be made
- Ask for confirmation
- Split orders with multiple dates into separate orders
- Update delivery dates to correct values
- Generate a detailed results report

### Step 5: Verify the Fixes

After running the script:

1. Check `fix-results-report.json` for detailed results
2. Log into the admin dashboard and verify affected orders
3. Check that delivery dates are now correct
4. Verify that all expected orders exist

### Step 6: Notify Affected Customers

Consider sending emails to affected customers:
- Apologize for the confusion
- Confirm their correct delivery dates
- Provide updated order numbers if orders were split
- Offer compensation if appropriate (e.g., discount on next order)

## What the Scripts Do

### Identification Script (`fix-weekly-orders-multi-week-bug.js`)

**Identifies orders with:**
- Multiple delivery dates in a single order (should be split)
- Dates that match Week 0 when Week 1/2 dates exist (likely wrong)

**Generates:**
- Console report with all affected orders
- `affected-orders-report.txt` - Human-readable report
- `fix-template.json` - Template for applying fixes

### Fix Script (`apply-weekly-orders-fix.js`)

**Actions:**
- **SPLIT_ORDER**: Splits an order with multiple dates into separate orders
  - Keeps original order ID for first delivery date
  - Creates new order IDs for additional delivery dates
  - Preserves all order data (status, address, etc.)
  
- **UPDATE_DATES**: Updates delivery dates in an existing order
  - Keeps same order ID
  - Only updates the `date` field in items

**Preserves:**
- User information
- Order status
- Delivery address
- Special instructions
- All other order metadata

## Safety Features

1. **Dry run first**: Identification script only reads, doesn't modify
2. **Manual review required**: Must update fix-template.json before applying
3. **Confirmation prompt**: Asks for confirmation before making changes
4. **Detailed logging**: Shows exactly what's being changed
5. **Results report**: Generates report of all changes made

## Troubleshooting

### "Order not found"
- Order may have been deleted or ID is incorrect
- Check the database manually

### "MANUAL_REVIEW_NEEDED" error
- You haven't updated all dates in fix-template.json
- Review and update all `suggestedCorrectDate` fields

### Script hangs or times out
- Check MongoDB connection string
- Ensure database is accessible
- Check network connectivity

## Important Notes

1. **ALWAYS backup your database before running these scripts!**
2. Test on a staging environment first if possible
3. Run during low-traffic hours to minimize impact
4. Keep the generated reports for your records
5. The code fix (already applied) prevents this bug from happening again

## Example Workflow

```bash
# 1. Backup database
mongodump --uri="your-connection-string" --out=./backup

# 2. Set connection string
export MONGODB_URI="your-connection-string"

# 3. Identify affected orders
node fix-weekly-orders-multi-week-bug.js

# 4. Review output and update fix-template.json
# (manually edit the file)

# 5. Apply fixes
node apply-weekly-orders-fix.js

# 6. Verify in admin dashboard
# (check that orders are correct)
```

## Support

If you encounter any issues:
1. Check the error messages in the console
2. Review the generated reports
3. Check the MongoDB logs
4. Contact the development team for assistance

## Files Generated

- `affected-orders-report.txt` - Human-readable report of affected orders
- `fix-template.json` - Template for manual review and fixes
- `fix-results-report.json` - Detailed results after applying fixes
