# User Province/Area Migration Scripts

These scripts help you check and migrate user province/area values after changing the input field from a free text field to a dropdown with predefined options.

## Prerequisites

Make sure you have installed the required dependencies:

```bash
pnpm install mongoose dotenv
```

Also ensure you have a `.env` file in the root directory with your MongoDB connection string:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

## Scripts

### 1. Check User Provinces

This script checks all users in the database and shows what values they currently have in the province/area field.

```bash
node scripts/check-user-provinces.js
```

The output will show:
- A count of each unique province value
- A list of users with their province values
- A list of users without province values

Use this information to understand your existing data before migration.

### 2. Migrate User Provinces

This script updates user province/area values to match the new dropdown options.

```bash
# Run in dry-run mode (no changes made)
node scripts/migrate-user-provinces.js

# Run in live mode (changes saved to database)
# Edit the script and change the function call at the bottom to:
# migrateUserProvinces(false)
```

The script includes:
- A list of valid areas from the dropdown
- A mapping of common variations to standardized values
- A default area to use if no mapping is found

## How It Works

1. First run the check script to see what values exist in your database
2. Update the `areaMapping` object in the migration script based on your findings
3. Run the migration script in dry-run mode to see what changes would be made
4. When satisfied, run the migration script in live mode to apply the changes

## Notes

- The migration script uses a default area ("Downtown") for unmappable values
- You may need to update the mapping based on your specific data
- Always backup your database before running migrations in live mode