# Database Migration Scripts

This directory contains scripts for database migrations and data seeding.

## Weekly Subscription Migration

The `migrate-weekly-subscription.ts` script populates the database with initial data for the weekly subscription feature.

### What it does:

1. Creates meal options for both current and next week's Sunday and Tuesday deliveries
2. Creates delivery day entries with references to the meal options
3. Sets up the proper relationships between delivery days and meal options

### How to run:

Make sure you have a `.env.local` file in the root directory with your MongoDB connection string:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kapioo?retryWrites=true&w=majority
MONGODB_DB=kapioo
```

Then run the migration script:

```bash
pnpm migrate:weekly
```

### Expected output:

```
Connected to MongoDB
Clearing existing data...
Inserting meal options...
12 meal options inserted
Inserting delivery days...
4 delivery days inserted
Migration completed successfully
MongoDB connection closed
```

## Troubleshooting

If you encounter any issues:

1. Make sure your MongoDB connection string is correct
2. Check that you have the necessary permissions to access the database
3. Ensure the collections don't have any conflicting unique indexes

For any errors, check the console output for detailed information.
