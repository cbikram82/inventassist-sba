-- Create enum types
CREATE TYPE checkout_task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE checkout_task_type AS ENUM ('checkout', 'checkin');
CREATE TYPE checkout_item_status AS ENUM ('pending', 'checked', 'returned');
CREATE TYPE audit_action_type AS ENUM ('checkout', 'checkin', 'quantity_mismatch');

-- Create checkout_tasks table
CREATE TABLE checkout_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_name TEXT NOT NULL,
    status checkout_task_status NOT NULL DEFAULT 'pending',
    type checkout_task_type NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create checkout_items table
CREATE TABLE checkout_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    checkout_task_id UUID REFERENCES checkout_tasks(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    event_item_id UUID REFERENCES event_items(id) ON DELETE CASCADE,
    original_quantity INTEGER NOT NULL,
    actual_quantity INTEGER NOT NULL,
    status checkout_item_status NOT NULL DEFAULT 'pending',
    reason TEXT,
    checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    checked_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_checked_by FOREIGN KEY (checked_by) REFERENCES users(id)
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action audit_action_type NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    checkout_task_id UUID REFERENCES checkout_tasks(id) ON DELETE SET NULL,
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_item_id FOREIGN KEY (item_id) REFERENCES items(id),
    CONSTRAINT fk_checkout_task_id FOREIGN KEY (checkout_task_id) REFERENCES checkout_tasks(id)
);

-- Add RLS policies
ALTER TABLE checkout_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for checkout_tasks
CREATE POLICY "Users can view their own checkout tasks"
    ON checkout_tasks FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all checkout tasks"
    ON checkout_tasks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'editor')
    ));

CREATE POLICY "Users can create checkout tasks"
    ON checkout_tasks FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update checkout tasks"
    ON checkout_tasks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'editor')
    ));

-- Policies for checkout_items
CREATE POLICY "Users can view their own checkout items"
    ON checkout_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM checkout_tasks
        WHERE checkout_tasks.id = checkout_items.checkout_task_id
        AND checkout_tasks.created_by = auth.uid()
    ));

CREATE POLICY "Admins can view all checkout items"
    ON checkout_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'editor')
    ));

CREATE POLICY "Users can create checkout items"
    ON checkout_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM checkout_tasks
        WHERE checkout_tasks.id = checkout_items.checkout_task_id
        AND checkout_tasks.created_by = auth.uid()
    ));

CREATE POLICY "Admins can update checkout items"
    ON checkout_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'editor')
    ));

-- Policies for audit_logs
CREATE POLICY "Users can view their own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'editor')
    ));

CREATE POLICY "System can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true); 