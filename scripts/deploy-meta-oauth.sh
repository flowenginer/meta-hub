#!/usr/bin/env bash
# ============================================================================
# Deploy meta-oauth Edge Function to Supabase
# ============================================================================
#
# Prerequisites:
#   1. Supabase CLI installed (npx supabase or brew install supabase/tap/supabase)
#   2. Access token set: export SUPABASE_ACCESS_TOKEN=sbp_...
#
# Usage:
#   chmod +x scripts/deploy-meta-oauth.sh
#   ./scripts/deploy-meta-oauth.sh
#
# ============================================================================

set -euo pipefail

PROJECT_REF="wpredsntrdkmqlyfqkz"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== MetaHub: Deploy meta-oauth Edge Function ===${NC}"
echo ""

# Check for access token
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo -e "${RED}Error: SUPABASE_ACCESS_TOKEN not set.${NC}"
  echo ""
  echo "Generate a token at: https://supabase.com/dashboard/account/tokens"
  echo "Then run: export SUPABASE_ACCESS_TOKEN=sbp_your_token_here"
  exit 1
fi

# Step 1: Link project (if not already linked)
echo -e "${YELLOW}[1/3] Linking to project ${PROJECT_REF}...${NC}"
npx supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true
echo -e "${GREEN}  ✓ Project linked${NC}"

# Step 2: Deploy the function
echo -e "${YELLOW}[2/3] Deploying meta-oauth Edge Function...${NC}"
npx supabase functions deploy meta-oauth --project-ref "$PROJECT_REF" --no-verify-jwt
echo -e "${GREEN}  ✓ Function deployed${NC}"

# Step 3: Set secrets (prompt user)
echo ""
echo -e "${YELLOW}[3/3] Configure secrets${NC}"
echo ""
echo "The following secrets must be set in Supabase Dashboard > Edge Functions > Secrets:"
echo ""
echo "  META_APP_ID          = 894040356776149"
echo "  META_APP_SECRET      = (your Meta App Secret)"
echo "  APP_URL              = (your frontend URL, e.g. https://metahub.app)"
echo ""
echo "Or set via CLI:"
echo ""
echo "  npx supabase secrets set \\"
echo "    META_APP_ID=894040356776149 \\"
echo "    META_APP_SECRET=your_secret \\"
echo "    APP_URL=https://your-app-url.com \\"
echo "    --project-ref ${PROJECT_REF}"
echo ""
echo -e "${GREEN}=== Deploy complete! ===${NC}"
echo ""
echo "Edge Function URL:"
echo "  https://${PROJECT_REF}.supabase.co/functions/v1/meta-oauth"
echo ""
echo "Callback URL (should match Meta App settings):"
echo "  https://${PROJECT_REF}.supabase.co/functions/v1/meta-oauth/callback"
