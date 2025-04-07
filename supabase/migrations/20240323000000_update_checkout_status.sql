-- First, remove the default value
ALTER TABLE checkout_items ALTER COLUMN status DROP DEFAULT;

-- Create a new enum type with the additional status
CREATE TYPE checkout_item_status_new AS ENUM ('pending', 'checked', 'checked_in', 'cancelled');

-- Update the column to use the new type
ALTER TABLE checkout_items 
  ALTER COLUMN status TYPE checkout_item_status_new 
  USING status::text::checkout_item_status_new;

-- Drop the old enum type
DROP TYPE checkout_item_status;

-- Rename the new enum type to the original name
ALTER TYPE checkout_item_status_new RENAME TO checkout_item_status;

-- Add back the default value
ALTER TABLE checkout_items ALTER COLUMN status SET DEFAULT 'pending'; 