#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Kapioo Transaction Migration Tool${NC}"
echo "This script will update all transaction descriptions from 'Added Credit' to 'Added Credits'"
echo ""

# Check if .env.local file exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    echo "This script requires a .env.local file with a MONGODB_URI variable"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js before running this script"
    exit 1
fi

# Check if dotenv and mongodb packages are installed
if ! node -e "try{require('dotenv')}catch(e){process.exit(1)}" &> /dev/null; then
    echo -e "${YELLOW}Installing dotenv package...${NC}"
    npm install dotenv --no-save
fi

if ! node -e "try{require('mongodb')}catch(e){process.exit(1)}" &> /dev/null; then
    echo -e "${YELLOW}Installing mongodb package...${NC}"
    npm install mongodb --no-save
fi

if ! node -e "try{require('path')}catch(e){process.exit(1)}" &> /dev/null; then
    echo -e "${YELLOW}Installing path package...${NC}"
    npm install path --no-save
fi

# Check if MONGODB_URI is set in .env.local
if ! grep -q "MONGODB_URI" .env.local; then
    echo -e "${RED}Error: MONGODB_URI not found in .env.local${NC}"
    echo "Please ensure your .env.local file contains the MONGODB_URI variable"
    exit 1
fi

# Run the migration script
echo -e "${GREEN}Running migration script...${NC}"
node scripts/update-credit-transactions.js

echo ""
echo -e "${GREEN}Migration process completed!${NC}" 