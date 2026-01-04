# Maintenance Mode Fix Documentation

## Issues Found and Fixed

### 1. **Variable Shadowing Bug** ✅ FIXED
**Location:** `lib/maintenance-context.tsx`

**Problem:** 
- Line 28 had a function named `setMaintenanceMode` that shadowed the state setter of the same name from line 13
- This caused the state updates to not work properly

**Solution:**
- Renamed the function to `updateMaintenanceMode` to avoid shadowing
- Function now properly updates both local state and server state

### 2. **localStorage-Only Persistence** ✅ FIXED
**Problem:**
- Maintenance mode was only stored in browser localStorage
- This meant:
  - Different browsers/devices had different states
  - No central source of truth
  - State was lost when localStorage was cleared
  - Server-side rendering couldn't access the state

**Solution:**
- Created API endpoint `/api/maintenance/status` (GET and POST)
- Stores maintenance state in MongoDB using the existing `Settings` model
- Context now fetches from API on mount and updates API on change
- localStorage is kept as a fallback and for immediate UI updates

### 3. **Limited Scope Display** ✅ FIXED
**Problem:**
- `MaintenanceNotification` component was only imported in `app/page.tsx`
- This meant the notification only showed on the home page
- Users on other pages wouldn't see the maintenance message

**Solution:**
- Moved `MaintenanceNotification` to root layout (`app/layout.tsx`)
- Now displays globally across all pages when maintenance mode is active

### 4. **Poor State Management** ✅ FIXED
**Problem:**
- Notification could show multiple times on the same page visit
- No proper cleanup when maintenance mode was toggled off

**Solution:**
- Added `hasShown` state to track if notification was already displayed
- Proper cleanup when maintenance mode is disabled
- Better conditional rendering logic

## Files Modified

1. **lib/maintenance-context.tsx**
   - Fixed variable shadowing bug
   - Added API integration for fetching and updating maintenance status
   - Added fallback to localStorage if API fails
   - Added loading state management

2. **app/api/maintenance/status/route.ts** (NEW)
   - GET endpoint to fetch current maintenance status from database
   - POST endpoint to update maintenance status
   - Auto-creates setting if it doesn't exist
   - Proper error handling

3. **app/layout.tsx**
   - Added `MaintenanceNotification` import
   - Added component to root layout for global display

4. **app/page.tsx**
   - Removed duplicate `MaintenanceNotification` import and usage

5. **components/maintenance-notification.tsx**
   - Improved state management with `hasShown` flag
   - Better conditional rendering
   - Proper cleanup on maintenance mode toggle

## How It Works Now

### Architecture Flow:

```
┌─────────────────────────────────────────────────────────┐
│                     Root Layout                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         MaintenanceProvider (Context)             │  │
│  │                                                    │  │
│  │  On Mount:                                        │  │
│  │  1. Fetch from API → GET /api/maintenance/status │  │
│  │  2. Fallback to localStorage if API fails        │  │
│  │                                                    │  │
│  │  On Update:                                       │  │
│  │  1. Update local state (immediate UI update)     │  │
│  │  2. POST to API → /api/maintenance/status        │  │
│  │  3. Save to localStorage (backup)                │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │      MaintenanceNotification (Global)             │  │
│  │                                                    │  │
│  │  - Listens to context state                      │  │
│  │  - Shows popup 1.5s after mode is activated      │  │
│  │  - Shows only once per page visit                │  │
│  │  - Displays on ALL pages                         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  MongoDB Database                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Settings Collection                  │  │
│  │                                                    │  │
│  │  {                                                │  │
│  │    key: "maintenanceMode",                       │  │
│  │    value: true/false,                            │  │
│  │    description: "Global maintenance mode flag",  │  │
│  │    updatedAt: Date                               │  │
│  │  }                                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Testing Instructions

### Manual Testing:

1. **Access the Maintenance Control Panel:**
   - Navigate to `/maintain`
   - Enter password: `admin123`
   - You should see the maintenance toggle control

2. **Test Enabling Maintenance Mode:**
   - Toggle maintenance mode ON
   - Open a new tab or refresh any page
   - You should see the maintenance notification popup after 1.5 seconds
   - The notification should appear on ANY page (home, login, dashboard, etc.)

3. **Test Persistence:**
   - Enable maintenance mode
   - Close the browser completely
   - Open a new browser window and visit the site
   - The maintenance notification should still appear (proving database persistence)

4. **Test Cross-Browser:**
   - Enable maintenance mode in Chrome
   - Open Firefox or Safari
   - Visit the site
   - Maintenance notification should appear (proving it's not just localStorage)

5. **Test Disabling:**
   - Go back to `/maintain`
   - Toggle maintenance mode OFF
   - Refresh any page
   - Notification should NOT appear

6. **Test API Directly:**
   ```bash
   # Check current status
   curl http://localhost:3000/api/maintenance/status
   
   # Enable maintenance mode
   curl -X POST http://localhost:3000/api/maintenance/status \
     -H "Content-Type: application/json" \
     -d '{"isMaintenanceMode": true}'
   
   # Disable maintenance mode
   curl -X POST http://localhost:3000/api/maintenance/status \
     -H "Content-Type: application/json" \
     -d '{"isMaintenanceMode": false}'
   ```

### Expected Behavior:

✅ Maintenance mode state persists across:
- Browser refreshes
- Different browsers
- Different devices
- Server restarts (stored in database)

✅ Notification displays:
- On all pages when maintenance mode is active
- Only once per page visit (doesn't spam)
- After a 1.5 second delay (better UX)

✅ Toggle control:
- Updates immediately in UI
- Saves to database
- Accessible only with password

## Database Schema

The maintenance mode is stored in the `Settings` collection:

```typescript
{
  _id: ObjectId,
  key: "maintenanceMode",
  value: boolean,
  description: "Global maintenance mode flag for the website",
  createdAt: Date,
  updatedAt: Date
}
```

## Security Considerations

⚠️ **Important:** The current implementation uses a hardcoded password (`admin123`) in the client-side code. For production:

1. Move password to environment variable
2. Implement proper authentication (check user role from session)
3. Add rate limiting to the API endpoints
4. Add audit logging for maintenance mode changes

## Future Improvements

1. **Admin Dashboard Integration:**
   - Add maintenance toggle to main admin panel
   - Show who enabled/disabled maintenance mode and when

2. **Scheduled Maintenance:**
   - Allow scheduling maintenance windows
   - Auto-enable/disable at specified times

3. **Custom Messages:**
   - Allow customizing the maintenance notification message
   - Support for different messages per language

4. **Partial Maintenance:**
   - Allow maintenance mode for specific features only
   - E.g., "Orders disabled" vs "Entire site down"

5. **Notification History:**
   - Track when maintenance mode was toggled
   - Who made the change
   - Duration of maintenance windows

## Troubleshooting

### Issue: Notification doesn't appear
**Check:**
1. Is maintenance mode actually enabled? Check `/maintain` page
2. Check browser console for errors
3. Verify API endpoint is accessible: `GET /api/maintenance/status`
4. Check database connection

### Issue: State not persisting
**Check:**
1. Database connection in `lib/db.ts`
2. Settings model is properly imported
3. API endpoints are returning 200 status
4. Check MongoDB Atlas connection string

### Issue: Different state in different browsers
**This is now FIXED** - If you still see this:
1. Clear localStorage in all browsers
2. Restart the application
3. Set maintenance mode fresh from `/maintain` page

## Summary

The maintenance mode system is now **stable and reliable** because:

1. ✅ **No more variable shadowing bugs** - proper function naming
2. ✅ **Centralized state management** - database as source of truth
3. ✅ **Global display** - shows on all pages via root layout
4. ✅ **Persistent** - survives browser/server restarts
5. ✅ **Consistent** - same state across all devices/browsers
6. ✅ **Robust error handling** - fallback to localStorage if API fails
7. ✅ **Better UX** - shows once per visit, proper timing, dismissible

