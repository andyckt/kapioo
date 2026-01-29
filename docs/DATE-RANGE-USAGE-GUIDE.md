# Date Range Selection - User Guide

**For:** Admin Portal Users  
**Pages:** All Daily Delivery Orders & All Weekly Meal Box Orders

---

## 📍 Where to Find It

1. Navigate to **Admin Portal**
2. Go to either:
   - **"All Daily Delivery Orders"** tab, OR
   - **"All Weekly Meal Box Orders"** tab
3. Click **"Advanced Filters"** to expand the filter section
4. Look for **"Delivery Date Range"** filter

---

## 🎯 How to Use

### **Option 1: Filter by Single Date**

1. Select a **Start date** only
2. Leave **End date** empty
3. Orders will be filtered to show only that specific date

**Example:**
```
Start date: Jan 27, 2026
End date: (empty)
Result: Shows orders for Jan 27 only
```

---

### **Option 2: Filter by Date Range**

1. Select a **Start date**
2. Select an **End date**
3. Helper text will appear showing your selected range
4. Orders will be filtered to show all dates within the range (inclusive)

**Example:**
```
Start date: Jan 20, 2026
End date: Jan 27, 2026
Helper text: "Showing orders from Jan 20 to Jan 27"
Result: Shows orders for Jan 20, 21, 22, 23, 24, 25, 26, and 27
```

---

### **Option 3: View All Orders (No Date Filter)**

1. Clear both date fields (or leave them empty)
2. All orders will be displayed regardless of delivery date

---

## 💡 Tips

### **Tip 1: Quick Week View**
To view all orders for a week:
- Start date: First day of the week (e.g., Sunday)
- End date: Last day of the week (e.g., Saturday)

### **Tip 2: Monthly Reports**
To view all orders for a month:
- Start date: First day of the month (e.g., Feb 1)
- End date: Last day of the month (e.g., Feb 28)

### **Tip 3: Export Filtered Data**
The "Export to CSV" button respects your date range filter:
1. Set your date range
2. Click "Export to CSV"
3. The exported file will contain only orders in your selected date range

### **Tip 4: Combine with Other Filters**
You can combine date range with other filters:
- **Status:** Show only "confirmed" orders in date range
- **Area:** Show only "Downtown" orders in date range
- **Search:** Search for specific customer within date range
- **Combo Name:** (Daily orders only) Filter by specific combo

---

## 🖼️ Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│ Advanced Filters                                   [▼]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Delivery Date Range                                     │
│ ┌──────────────────────┐  ┌──────────────────────┐    │
│ │ 📅 Start date        │  │ 📅 End date          │    │
│ │ [2026-01-20]         │  │ [2026-01-27]         │    │
│ └──────────────────────┘  └──────────────────────┘    │
│                                                         │
│ Showing orders from Jan 20 to Jan 27                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ❓ FAQ

### **Q: What happens if I only select an end date?**
A: The system will ignore the end date and show all orders (no date filter applied). You must select a start date for the filter to work.

### **Q: Can I select an end date before the start date?**
A: While the system won't prevent you, it won't return any results since the date range would be invalid. Always ensure end date is on or after start date.

### **Q: Does this affect the actual order data?**
A: No, this is only a filter for viewing orders. It doesn't modify any order data.

### **Q: Will my date range filter persist when I navigate away?**
A: No, filters are reset when you navigate to a different page or refresh. This is by design to avoid confusion.

### **Q: Can I filter by time (hours/minutes)?**
A: No, the filter works on dates only (day level). All orders for a given date will be included regardless of the time they were placed.

### **Q: What date format should I use?**
A: The date picker uses your browser's native date format. The system will automatically convert it to the correct format for filtering.

---

## 🔧 Troubleshooting

### **Issue: No orders showing up**
**Solutions:**
- Check if your date range is correct (end date should be after start date)
- Verify there are actually orders for those dates
- Try clearing all filters and starting fresh
- Check if other filters (status, area) are too restrictive

### **Issue: Helper text not appearing**
**Cause:** Helper text only appears when BOTH start and end dates are selected.
**Solution:** Make sure you've selected both dates.

### **Issue: Export includes wrong dates**
**Cause:** Filters are applied to export.
**Solution:** This is correct behavior. Clear the date filter if you want to export all orders.

---

## 📞 Need Help?

If you encounter any issues with the date range filter, please contact the development team with:
- Screenshot of the filter settings
- Expected behavior
- Actual behavior
- Any error messages

---

**Last Updated:** January 27, 2026
