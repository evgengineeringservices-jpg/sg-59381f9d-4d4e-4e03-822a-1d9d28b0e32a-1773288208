-- Create notifications table for system-wide alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'price_change',
    'task_assigned',
    'billing_ready',
    'milestone_complete',
    'document_uploaded',
    'drawing_analyzed',
    'budget_alert',
    'timeline_delay',
    'approval_needed',
    'system_alert'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'success')) DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Function to create notification for user
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, severity, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_severity, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify users about price changes (using correct column name: price)
CREATE OR REPLACE FUNCTION notify_price_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
  v_old_price NUMERIC;
  v_new_price NUMERIC;
  v_change_percent NUMERIC;
BEGIN
  v_old_price := OLD.price;
  v_new_price := NEW.price;
  v_change_percent := ROUND(((v_new_price - v_old_price) / v_old_price * 100), 2);
  
  -- Only notify if change is significant (>5%)
  IF ABS(v_change_percent) > 5 THEN
    -- Notify all contractors, admins, and owners
    FOR v_user IN 
      SELECT id FROM profiles 
      WHERE role IN ('super_admin', 'owner', 'contractor_admin', 'office_admin')
      AND is_active = TRUE
    LOOP
      PERFORM create_notification(
        v_user.id,
        'price_change',
        'Market Price Change Alert',
        format('%s price changed by %s%% (₱%s → ₱%s)',
          NEW.item_name,
          v_change_percent,
          v_old_price,
          v_new_price
        ),
        CASE 
          WHEN v_change_percent > 0 THEN 'warning'
          ELSE 'info'
        END,
        '/crm/admin/market-prices',
        jsonb_build_object(
          'item_name', NEW.item_name,
          'old_price', v_old_price,
          'new_price', v_new_price,
          'change_percent', v_change_percent,
          'category', NEW.category
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for price change notifications
DROP TRIGGER IF EXISTS trigger_notify_price_changes ON market_prices;
CREATE TRIGGER trigger_notify_price_changes
  AFTER UPDATE OF price ON market_prices
  FOR EACH ROW
  EXECUTE FUNCTION notify_price_changes();

-- Function to notify about task assignments
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'task_assigned',
      'New Task Assigned',
      format('You have been assigned: %s', NEW.title),
      CASE NEW.priority
        WHEN 'critical' THEN 'error'
        WHEN 'high' THEN 'warning'
        ELSE 'info'
      END,
      '/crm/tasks',
      jsonb_build_object(
        'task_id', NEW.id,
        'priority', NEW.priority,
        'due_date', NEW.due_date,
        'project_id', NEW.project_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task assignment notifications
DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON tasks;
CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT OR UPDATE OF assigned_to ON tasks
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION notify_task_assignment();

-- Function to notify about billing readiness (using correct column name: amount)
CREATE OR REPLACE FUNCTION notify_billing_ready()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    -- Notify billing staff and admins
    FOR v_user IN
      SELECT id FROM profiles
      WHERE role IN ('super_admin', 'owner', 'contractor_admin', 'secretary')
      AND is_active = TRUE
    LOOP
      PERFORM create_notification(
        v_user.id,
        'billing_ready',
        'Billing Ready for Review',
        format('Invoice #%s is ready for review (₱%s)',
          NEW.invoice_no,
          NEW.amount
        ),
        'success',
        '/crm/billing',
        jsonb_build_object(
          'billing_id', NEW.id,
          'invoice_no', NEW.invoice_no,
          'amount', NEW.amount,
          'project_id', NEW.project_id
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for billing notifications
DROP TRIGGER IF EXISTS trigger_notify_billing_ready ON billing_items;
CREATE TRIGGER trigger_notify_billing_ready
  AFTER UPDATE OF status ON billing_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_billing_ready();