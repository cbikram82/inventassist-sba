-- Add exclude_from_low_stock column to items table
ALTER TABLE items
ADD COLUMN exclude_from_low_stock BOOLEAN NOT NULL DEFAULT FALSE; 