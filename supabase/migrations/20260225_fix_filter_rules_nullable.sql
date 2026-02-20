-- ============================================================================
-- Fix: Make filter_rules nullable so null = "accept all events"
-- Previously: NOT NULL DEFAULT '[]' — empty array was indistinguishable from
-- "no filter configured", causing the edge function to bypass filtering.
-- ============================================================================

-- 1. Allow NULL values (null = no filter = accept all events)
ALTER TABLE public.routes ALTER COLUMN filter_rules DROP NOT NULL;

-- 2. Change default from empty array to null
ALTER TABLE public.routes ALTER COLUMN filter_rules SET DEFAULT NULL;

-- 3. Convert existing empty arrays to null
UPDATE public.routes SET filter_rules = NULL WHERE filter_rules = '[]'::jsonb;
