#!/bin/bash
# Usage: ./set-paystack-keys.sh "sk_test_YOUR_KEY" "pk_test_YOUR_KEY"

SECRET_KEY="$1"
PUBLIC_KEY="$2"

if [[ -z "$SECRET_KEY" || -z "$PUBLIC_KEY" ]]; then
  echo "Usage: bash set-paystack-keys.sh \"sk_test_...\" \"pk_test_...\""
  exit 1
fi

ENV_FILE="$(dirname "$0")/.env.local"

# Replace placeholders with real keys
sed -i '' "s|PAYSTACK_SECRET_KEY=\".*\"|PAYSTACK_SECRET_KEY=\"$SECRET_KEY\"|" "$ENV_FILE"
sed -i '' "s|NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=\".*\"|NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=\"$PUBLIC_KEY\"|" "$ENV_FILE"

echo "✅ Paystack keys written to .env.local"
grep "PAYSTACK" "$ENV_FILE"
