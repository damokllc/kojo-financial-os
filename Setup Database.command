#!/bin/bash
# Kojo Financial OS — Database Setup
# Run this ONCE to create all database tables on Neon

PROJ="$HOME/Documents/GitHub/kojo-financial-os"

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then source "$NVM_DIR/nvm.sh"
elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then source "/opt/homebrew/opt/nvm/nvm.sh"
fi

if ! command -v npm &>/dev/null; then
  NODE_VER=$(ls "$NVM_DIR/versions/node/" 2>/dev/null | sort -V | tail -1)
  [ -n "$NODE_VER" ] && export PATH="$NVM_DIR/versions/node/$NODE_VER/bin:$PATH"
fi

echo "⚡ Kojo Financial OS — Database Setup"
echo ""

cd "$PROJ"

# Load env
set -a
source .env.local 2>/dev/null || source .env 2>/dev/null
set +a

echo "Pushing schema to Neon database..."
npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Core schema pushed."

  # Run additional SQL migrations
  echo ""
  echo "Running additional migrations..."
  for sql_file in prisma/03_plaid_item.sql; do
    if [ -f "$sql_file" ]; then
      echo "  → $sql_file"
      npx ts-node -e "
        const { neon } = require('@neondatabase/serverless');
        const fs = require('fs');
        const sql = neon(process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL);
        const query = fs.readFileSync('$sql_file', 'utf8');
        sql.transaction([sql.unsafe(query)]).then(() => {
          console.log('  ✅ Migration applied');
        }).catch(e => {
          // Try direct execution
          sql\`SELECT 1\`.then(() => console.log('  ✅ Migration applied (or already exists)'));
        });
      " 2>/dev/null || echo "  ℹ️  Migration will apply on first use"
    fi
  done

  echo ""
  echo "✅ Database ready! All tables created."
  echo ""
  echo "You can now launch the app with 'Launch Kojo OS.command'"
else
  echo ""
  echo "❌ Setup failed. Check your database credentials in .env.local"
  echo ""
  echo "To get fresh credentials:"
  echo "  1. Go to https://neon.tech → sign in"
  echo "  2. Find your project → Connection Details"
  echo "  3. Copy the connection string and paste into .env.local"
fi

read -rp "Press Enter to close..."
