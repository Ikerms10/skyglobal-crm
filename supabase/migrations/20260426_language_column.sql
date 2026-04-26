-- Add language preference to business_settings for cross-device sync
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';
