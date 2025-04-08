-- Add is_consumable column to categories table
ALTER TABLE categories
ADD COLUMN is_consumable BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing categories to mark Consumables and Puja Consumables as consumable
UPDATE categories
SET is_consumable = TRUE
WHERE name IN ('Consumables', 'Puja Consumables'); 