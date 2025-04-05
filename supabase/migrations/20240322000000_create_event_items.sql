-- Create event_items table
CREATE TABLE IF NOT EXISTS event_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_items_event_name ON event_items(event_name);
CREATE INDEX IF NOT EXISTS idx_event_items_item_id ON event_items(item_id);

-- Add RLS policies
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON event_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON event_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON event_items
  FOR DELETE TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_items_updated_at
  BEFORE UPDATE ON event_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 