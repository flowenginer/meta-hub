-- ============================================================================
-- Migration: Add missing UNIQUE constraints for ON CONFLICT upserts
-- Fix: "there is no unique or exclusion constraint matching the ON CONFLICT"
-- ============================================================================

-- meta_whatsapp_numbers: ensure unique (integration_id, phone_number_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meta_whatsapp_numbers_integration_id_phone_number_id_key'
  ) THEN
    ALTER TABLE public.meta_whatsapp_numbers
      ADD CONSTRAINT meta_whatsapp_numbers_integration_id_phone_number_id_key
      UNIQUE (integration_id, phone_number_id);
  END IF;
END $$;

-- meta_ad_accounts: ensure unique (integration_id, ad_account_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meta_ad_accounts_integration_id_ad_account_id_key'
  ) THEN
    ALTER TABLE public.meta_ad_accounts
      ADD CONSTRAINT meta_ad_accounts_integration_id_ad_account_id_key
      UNIQUE (integration_id, ad_account_id);
  END IF;
END $$;

-- meta_forms: ensure unique (integration_id, form_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meta_forms_integration_id_form_id_key'
  ) THEN
    ALTER TABLE public.meta_forms
      ADD CONSTRAINT meta_forms_integration_id_form_id_key
      UNIQUE (integration_id, form_id);
  END IF;
END $$;
