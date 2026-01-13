# Weekly Meal Box Menu Display Logic
## Complete Understanding Document

---

## 🎯 Overview

This document explains the complete logic behind determining which delivery days are shown in the Weekly Meal Box menu for both **Admin Dashboard** and **User Dashboard**.

---

## 📊 System Architecture

### **1. Database Structure**

**Model:** `WeeklyDeliveryDay` (`models/WeeklyDeliveryDay.ts`)

```typescript
{
  day: 'sunday' | 'tuesday',           // Only 2 delivery days per week
  name: string,                         // e.g., "Sunday Delivery", "Tuesday Delivery"
  date: string,                         // e.g., "Jan 12", "Jan 14"
  active: boolean,                      // Controls visibility to users
  options: ObjectId[],                  // Array of meal option IDs
  weekOffset: 0 | 1 | 2,               // Week number (0=This Week, 1=Next Week, 2=Week 3)
  createdAt: Date,
  updatedAt: Date
}
```

**Key Constraints:**
- ✅ Only 2 days per week: **Sunday** and **Tuesday**
- ✅ Unique compound index: `{ day: 1, weekOffset: 1 }` - prevents duplicate day+week combinations
- ✅ 3 weeks total: Week 0 (This Week), Week 1 (Next Week), Week 2 (Week 3)
- ✅ Total of **6 delivery days** across 3 weeks (2 days × 3 weeks)

---

## 🔧 Admin Dashboard Logic

### **File:** `components/weekly-subscription-management.tsx`

### **How Admin Manages Delivery Days:**

#### **Step 1: Data Fetching**
```typescript
// Fetch ALL delivery days (including inactive ones)
const data = await getAdminWeeklySubscription();
```

**API Endpoint:** `/api/weekly-subscription` (GET)

**What It Returns:**
```javascript
[
  {
    id: "current-sunday",
    title: "This Week Sunday Delivery",
    day: {
      id: "sunday",
      day: "sunday",
      name: "Sunday Delivery",
      date: "Jan 12",         // ← Actual delivery date
      weekOffset: 0,          // ← This Week
      active: true,           // ← Visible to users
      options: [...]          // ← Meal options for this day
    }
  },
  {
    id: "current-tuesday",
    title: "This Week Tuesday Delivery",
    day: {
      id: "tuesday",
      day: "tuesday",
      name: "Tuesday Delivery",
      date: "Jan 14",
      weekOffset: 0,
      active: true,
      options: [...]
    }
  },
  {
    id: "next-sunday",
    title: "Next Week Sunday Delivery",
    day: {
      id: "sunday",
      day: "sunday",
      name: "Sunday Delivery",
      date: "Jan 19",
      weekOffset: 1,          // ← Next Week
      active: true,
      options: [...]
    }
  },
  {
    id: "next-tuesday",
    title: "Next Week Tuesday Delivery",
    day: {
      id: "tuesday",
      day: "tuesday",
      name: "Tuesday Delivery",
      date: "Jan 21",
      weekOffset: 1,
      active: true,
      options: [...]
    }
  },
  {
    id: "week3-sunday",
    title: "Week 3 Sunday Delivery",
    day: {
      id: "sunday",
      day: "sunday",
      name: "Sunday Delivery",
      date: "Jan 26",
      weekOffset: 2,          // ← Week 3
      active: true,
      options: [...]
    }
  },
  {
    id: "week3-tuesday",
    title: "Week 3 Tuesday Delivery",
    day: {
      id: "tuesday",
      day: "tuesday",
      name: "Tuesday Delivery",
      date: "Jan 28",
      weekOffset: 2,
      active: true,
      options: [...]
    }
  }
]
```

#### **Step 2: Display in Admin UI**

**Admin sees ALL 6 delivery days** (3 weeks × 2 days), including:
- ✅ Active days (visible to users)
- ✅ Inactive days (hidden from users)

**Admin can:**
1. **Toggle Active/Inactive** for each day
   - `active: true` → Users can see this day
   - `active: false` → Users cannot see this day

2. **Edit Delivery Date** for each day
   - Change "Jan 12" to "Jan 13", etc.

3. **Add/Edit/Delete Meal Options** for each day
   - Add new meal options (Chinese name, English name, tags)
   - Edit existing meal options
   - Delete meal options

4. **Roll Forward Weeks**
   - Archives current week
   - Week 1 becomes Week 0
   - Week 2 becomes Week 1
   - Creates new Week 2 with dates +7 days

---

## 👤 User Dashboard Logic

### **File:** `components/weekly-subscription.tsx`

### **How Users See Delivery Days:**

#### **Step 1: Data Fetching**
```typescript
// Fetch ONLY ACTIVE delivery days
const data = await getUserWeeklySubscription();
```

**API Endpoint:** `/api/weekly-subscription/user` (GET)

**Key Difference from Admin:**
```javascript
// ADMIN API: Returns ALL days (active and inactive)
const deliveryDays = await WeeklyDeliveryDay.find()
  .populate('options')
  .sort({ weekOffset: 1, day: 1 });

// USER API: Returns ONLY ACTIVE days
const deliveryDays = await WeeklyDeliveryDay.find({ active: true }) // ← Filter
  .populate({ 
    path: 'options', 
    match: { active: true }  // ← Also filters inactive meal options
  })
  .sort({ weekOffset: 1, day: 1 });
```

**What Users Receive:**
```javascript
[
  {
    id: "sunday",
    name: "Sunday Delivery",
    date: "Jan 12",
    weekOffset: 0,
    options: [
      { id: "...", name: "宫保鸡丁", nameEn: "Kung Pao Chicken", tags: ["Spicy"] },
      { id: "...", name: "红烧牛肉", nameEn: "Braised Beef", tags: [] },
      // ... only ACTIVE meal options
    ]
  },
  {
    id: "tuesday",
    name: "Tuesday Delivery",
    date: "Jan 14",
    weekOffset: 0,
    options: [...]
  },
  // ... Only days where active: true
]
```

#### **Step 2: Cutoff Time Filtering**

**File:** `components/weekly-subscription.tsx` (lines 84-203)

**The Critical Logic: `isDayUnavailable()` Function**

This function determines if a delivery day should be **disabled** (grayed out) for ordering:

```typescript
const isDayUnavailable = (day: DeliveryDay): { unavailable: boolean, reason: string } => {
  // 1. Get current date/time in Toronto timezone
  const torontoDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  const currentHour = torontoDate.getHours();
  const currentMinute = torontoDate.getMinutes();
  
  // 2. Parse the delivery date (e.g., "Jan 12")
  const mealDate = parseDate(day.date); // Returns Date object
  
  // 3. Create date-only versions (no time) for comparison
  const todayYMD = new Date(torontoDate.getFullYear(), torontoDate.getMonth(), torontoDate.getDate());
  const tomorrowYMD = new Date(todayYMD);
  tomorrowYMD.setDate(tomorrowYMD.getDate() + 1);
  const mealSpecificDate = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate());
  
  // 4. Check if day is in the past
  if (mealSpecificDate < todayYMD) {
    return { unavailable: true, reason: "This date has already passed" };
  }
  
  // 5. Check if it's tomorrow BUT past cutoff time today
  if (mealSpecificDate.getTime() === tomorrowYMD.getTime() && 
      (currentHour > cutoffTime.hour || (currentHour === cutoffTime.hour && currentMinute > cutoffTime.minute))) {
    return { 
      unavailable: true, 
      reason: "订单必须在配送前一天的11:59 AM前下单" 
    };
  }
  
  // 6. Check if it's today (same-day ordering not allowed)
  if (mealSpecificDate.getTime() === todayYMD.getTime()) {
    return { 
      unavailable: true, 
      reason: "订单必须在配送前一天的11:59 AM前下单" 
    };
  }
  
  // 7. If none of the above, the day is available
  return { unavailable: false, reason: "" };
}
```

---

## ⏰ Cutoff Time Logic (11:59 AM)

### **Default Cutoff Time:** 11:59 AM Toronto Time

**File:** `lib/cutoff-time.ts`

### **How It Works:**

#### **Scenario 1: Current Time is BEFORE Cutoff (e.g., 10:00 AM)**
```
Current Date: Thursday, Jan 11, 10:00 AM

Available Days:
✅ Friday Jan 12 (tomorrow, still before cutoff)
✅ Sunday Jan 14 (2 days away)
✅ Tuesday Jan 16 (5 days away)
✅ ... (all future days)
```

#### **Scenario 2: Current Time is AFTER Cutoff (e.g., 12:30 PM)**
```
Current Date: Thursday, Jan 11, 12:30 PM

Available Days:
❌ Friday Jan 12 (tomorrow, but past cutoff)
✅ Sunday Jan 14 (2 days away)
✅ Tuesday Jan 16 (5 days away)
✅ ... (all future days)
```

#### **Scenario 3: It's Saturday Morning (10:00 AM)**
```
Current Date: Saturday, Jan 13, 10:00 AM

Available Days:
✅ Sunday Jan 14 (tomorrow, still before cutoff)
✅ Tuesday Jan 16 (3 days away)
✅ Sunday Jan 21 (8 days away, next week)
✅ ... (all future days)
```

#### **Scenario 4: It's Saturday Afternoon (12:30 PM)**
```
Current Date: Saturday, Jan 13, 12:30 PM

Available Days:
❌ Sunday Jan 14 (tomorrow, but past cutoff)
✅ Tuesday Jan 16 (3 days away)
✅ Sunday Jan 21 (8 days away, next week)
✅ ... (all future days)
```

---

## 📅 Complete Flow Example

### **Timeline: Thursday, Jan 11, 2026**

#### **Admin Dashboard at 10:00 AM:**
```
Weekly Meal Box Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 This Week Sunday Delivery (Jan 12)
   Status: ✅ Active
   Meal Options: 4 options
   [Edit Date] [Toggle Active] [Manage Meals]

📦 This Week Tuesday Delivery (Jan 14)
   Status: ✅ Active
   Meal Options: 5 options
   [Edit Date] [Toggle Active] [Manage Meals]

📦 Next Week Sunday Delivery (Jan 19)
   Status: ✅ Active
   Meal Options: 4 options
   [Edit Date] [Toggle Active] [Manage Meals]

📦 Next Week Tuesday Delivery (Jan 21)
   Status: ✅ Active
   Meal Options: 5 options
   [Edit Date] [Toggle Active] [Manage Meals]

📦 Week 3 Sunday Delivery (Jan 26)
   Status: ✅ Active
   Meal Options: 4 options
   [Edit Date] [Toggle Active] [Manage Meals]

📦 Week 3 Tuesday Delivery (Jan 28)
   Status: ✅ Active
   Meal Options: 5 options
   [Edit Date] [Toggle Active] [Manage Meals]

[Roll Forward Week] [View History]
```

#### **User Dashboard at 10:00 AM (BEFORE Cutoff):**
```
周次Meal Box
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

订阅须知
每周有两天配送选项：周日和周二。您可以选择一天或两天都配送。
订单截止时间：配送前一天上午11:59前下单。

本周 (This Week)
┌──────────────────────────────────────┐
│ 📅 周日 (Sunday) - Jan 12            │ ← AVAILABLE ✅
│ 4个菜品选项                          │
│ [选择菜品]                           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 📅 周二 (Tuesday) - Jan 14           │ ← AVAILABLE ✅
│ 5个菜品选项                          │
│ [选择菜品]                           │
└──────────────────────────────────────┘

下周 (Next Week)
┌──────────────────────────────────────┐
│ 📅 周日 (Sunday) - Jan 19            │ ← AVAILABLE ✅
│ 4个菜品选项                          │
│ [选择菜品]                           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 📅 周二 (Tuesday) - Jan 21           │ ← AVAILABLE ✅
│ 5个菜品选项                          │
│ [选择菜品]                           │
└──────────────────────────────────────┘

第三周 (Week 3)
┌──────────────────────────────────────┐
│ 📅 周日 (Sunday) - Jan 26            │ ← AVAILABLE ✅
│ 4个菜品选项                          │
│ [选择菜品]                           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 📅 周二 (Tuesday) - Jan 28           │ ← AVAILABLE ✅
│ 5个菜品选项                          │
│ [选择菜品]                           │
└──────────────────────────────────────┘
```

#### **User Dashboard at 12:30 PM (AFTER Cutoff):**
```
周次Meal Box
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

订阅须知
每周有两天配送选项：周日和周二。您可以选择一天或两天都配送。
订单截止时间：配送前一天上午11:59前下单。

本周 (This Week)
┌──────────────────────────────────────┐
│ 📅 周日 (Sunday) - Jan 12            │ ← UNAVAILABLE ❌
│ 🚫 订单必须在配送前一天的11:59 AM前下单│
│ [已截止]                             │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 📅 周二 (Tuesday) - Jan 14           │ ← AVAILABLE ✅
│ 5个菜品选项                          │
│ [选择菜品]                           │
└──────────────────────────────────────┘

下周 (Next Week)
┌──────────────────────────────────────┐
│ 📅 周日 (Sunday) - Jan 19            │ ← AVAILABLE ✅
│ 4个菜品选项                          │
│ [选择菜品]                           │
└──────────────────────────────────────┘

... (same as before)
```

---

## 🔑 Key Logic Summary

### **Admin Dashboard:**
1. ✅ **Shows ALL 6 delivery days** (3 weeks × 2 days)
2. ✅ **Shows inactive days** (grayed out or marked as inactive)
3. ✅ **No cutoff time filtering** - Admin can manage future dates freely
4. ✅ **Can toggle active/inactive status**
5. ✅ **Can edit dates manually**
6. ✅ **Can manage meal options**

### **User Dashboard:**
1. ✅ **Shows ONLY ACTIVE delivery days** (`active: true`)
2. ✅ **Shows ONLY ACTIVE meal options** (`active: true`)
3. ✅ **Applies cutoff time filtering** (11:59 AM)
4. ✅ **Disables past dates**
5. ✅ **Disables today's date**
6. ✅ **Disables tomorrow's date if past cutoff**
7. ✅ **User sees 周日 (Sunday) and 周二 (Tuesday)** in Chinese
8. ✅ **Sorted by weekOffset, then by day**

---

## 📝 Ordering Rules (订阅须知)

### **Chinese:**
```
订阅须知
每周有两天配送选项：周日和周二。您可以选择一天或两天都配送。
订单截止时间：配送前一天上午11:59前下单。
```

### **English:**
```
Subscription Notice
There are two delivery options per week: Sunday and Tuesday. You can choose one day or both days.
Order cutoff time: Orders must be placed by 11:59 AM the day before delivery.
```

### **Rules Breakdown:**

1. **Two Delivery Days Per Week:**
   - ✅ Sunday (周日)
   - ✅ Tuesday (周二)

2. **Flexible Ordering:**
   - ✅ Can order for just Sunday
   - ✅ Can order for just Tuesday
   - ✅ Can order for both days

3. **Cutoff Time:**
   - ⏰ **11:59 AM** the day before delivery
   - 🕐 Toronto timezone (America/Toronto)

4. **Example:**
   ```
   Want to order for Sunday Jan 12?
   → Must order by Saturday Jan 11 at 11:59 AM
   
   Want to order for Tuesday Jan 14?
   → Must order by Monday Jan 13 at 11:59 AM
   ```

---

## 🔄 Week Rollover Logic

### **Admin Function: "Roll Forward Week"**

**File:** `components/weekly-subscription-management.tsx`

**What Happens:**
1. **Archives Week 0** (This Week)
   - Saves current week to history
   - Marks as archived in database

2. **Shifts Weeks Forward:**
   - Week 1 (Next Week) → Week 0 (This Week)
   - Week 2 (Week 3) → Week 1 (Next Week)

3. **Creates New Week 2:**
   - Calculates new dates (+7 days from old Week 2)
   - Copies meal options from old Week 1
   - Creates new delivery days in database

**Example:**
```
BEFORE Roll Forward:
  Week 0: Jan 12, Jan 14
  Week 1: Jan 19, Jan 21
  Week 2: Jan 26, Jan 28

AFTER Roll Forward:
  Week 0: Jan 19, Jan 21  (was Week 1)
  Week 1: Jan 26, Jan 28  (was Week 2)
  Week 2: Feb 2, Feb 4    (NEW, created automatically)
  
  Archived: Jan 12, Jan 14 (was Week 0)
```

---

## 🎯 Database Queries

### **Admin Query:**
```javascript
// Get ALL delivery days
const deliveryDays = await WeeklyDeliveryDay.find()
  .populate('options')
  .sort({ weekOffset: 1, day: 1 });

// Returns: ALL 6 days (including inactive)
```

### **User Query:**
```javascript
// Get ONLY ACTIVE delivery days with ACTIVE meal options
const deliveryDays = await WeeklyDeliveryDay.find({ active: true })
  .populate({
    path: 'options',
    match: { active: true }
  })
  .sort({ weekOffset: 1, day: 1 });

// Returns: Only days where active: true AND options where active: true
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Admin Deactivates Sunday Week 0**
```
Admin Action:
  - Sets "This Week Sunday (Jan 12)" to active: false

User Experience:
  - Sunday Jan 12 no longer appears in user menu
  - Tuesday Jan 14 still appears (still active)
  - User can only order for Tuesday this week
```

### **Scenario 2: It's Saturday 12:30 PM**
```
Current Time: Saturday Jan 13, 12:30 PM (past cutoff)

User Experience:
  - Sunday Jan 14 is DISABLED (tomorrow, but past cutoff)
  - Tuesday Jan 16 is AVAILABLE
  - All future days are AVAILABLE
```

### **Scenario 3: Admin Adds Week 3**
```
Initial State:
  - Week 0: Jan 12, Jan 14
  - Week 1: Jan 19, Jan 21
  - Week 2: (missing)

Admin Action:
  - System auto-creates Week 2 on API call

Result:
  - Week 0: Jan 12, Jan 14
  - Week 1: Jan 19, Jan 21
  - Week 2: Jan 26, Jan 28 (auto-generated)
```

---

## ✅ Summary

**The menu display logic is determined by:**

1. **`active` field in database** - Admin controls visibility
2. **`weekOffset` field** - Determines week grouping (0, 1, or 2)
3. **Current date/time** - Cutoff time filtering (11:59 AM)
4. **Date comparison** - Past dates are disabled
5. **Sorting** - By `weekOffset` first, then by `day` (sunday before tuesday)

**Key Takeaways:**
- ✅ Admin sees ALL days, User sees ONLY ACTIVE days
- ✅ Only 2 days per week: Sunday and Tuesday
- ✅ 3 weeks displayed: Week 0, Week 1, Week 2
- ✅ Cutoff time: 11:59 AM the day before delivery
- ✅ Timezone: America/Toronto
- ✅ Automatic Week 3 creation if missing
- ✅ Roll forward feature for week management

---

**Document Created:** January 13, 2026  
**Status:** ✅ **Complete Understanding Achieved**
