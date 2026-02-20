-- ============================================================================
-- Migration: Drop idx_delivery_events_dedup unique constraint
--
-- This constraint was incorrectly blocking new delivery events because
-- source_event_id was set to phone_number_id (which is the same for all
-- messages from the same WhatsApp number). Now source_event_id uses the
-- actual message/status ID (wamid.*), so each event is unique.
--
-- Dropping the constraint to unblock webhook processing.
-- ============================================================================

DROP INDEX IF EXISTS idx_delivery_events_dedup;
