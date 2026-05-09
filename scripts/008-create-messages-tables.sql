-- Customer Communication Center: Multi-channel messaging tables

-- Conversations table - one conversation per customer per channel
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('facebook', 'line', 'instagram', 'email', 'web')),
  customer_external_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  assigned_to UUID,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel, customer_external_id)
);

-- Messages table - individual messages within conversations
CREATE TABLE IF NOT EXISTS customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'bot', 'system')),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  external_message_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channel connections - tracks which social channels are connected
CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL UNIQUE CHECK (channel IN ('facebook', 'line', 'instagram', 'email', 'web')),
  display_name TEXT NOT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  account_handle TEXT,
  webhook_url TEXT,
  last_sync_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON customer_messages(conversation_id, created_at);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage all (admin scope)
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON conversations;
CREATE POLICY "Authenticated users can view conversations" ON conversations FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage conversations" ON conversations;
CREATE POLICY "Authenticated users can manage conversations" ON conversations FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view messages" ON customer_messages;
CREATE POLICY "Authenticated users can view messages" ON customer_messages FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage messages" ON customer_messages;
CREATE POLICY "Authenticated users can manage messages" ON customer_messages FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view channels" ON channel_connections;
CREATE POLICY "Authenticated users can view channels" ON channel_connections FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage channels" ON channel_connections;
CREATE POLICY "Authenticated users can manage channels" ON channel_connections FOR ALL USING (auth.role() = 'authenticated');

-- Seed channel connections
INSERT INTO channel_connections (channel, display_name, is_connected, account_handle, last_sync_at) VALUES
  ('facebook', 'Facebook Page', TRUE, '@DrOatSkinCare', NOW()),
  ('line', 'LINE Official', TRUE, '@droat', NOW()),
  ('instagram', 'Instagram', TRUE, '@droat.skincare', NOW()),
  ('email', 'Email Support', TRUE, 'support@droat.com', NOW()),
  ('web', 'Website Chat', FALSE, NULL, NULL)
ON CONFLICT (channel) DO NOTHING;

-- Seed sample conversations
INSERT INTO conversations (channel, customer_external_id, customer_name, status, priority, last_message_at, last_message_preview, unread_count, tags) VALUES
  ('facebook', 'fb_user_001', 'Sarah Chen', 'open', 'high', NOW() - INTERVAL '5 minutes', 'Is the Radiance Serum back in stock?', 2, ARRAY['product-inquiry']),
  ('line', 'line_user_002', 'Tanaka Yuki', 'open', 'normal', NOW() - INTERVAL '12 minutes', 'Order #1234 shipping update?', 1, ARRAY['order-status']),
  ('instagram', 'ig_user_003', 'Maria Santos', 'pending', 'normal', NOW() - INTERVAL '32 minutes', 'Love the new packaging!', 0, ARRAY['feedback']),
  ('facebook', 'fb_user_004', 'James Park', 'open', 'urgent', NOW() - INTERVAL '2 minutes', 'Received damaged product', 3, ARRAY['complaint','priority']),
  ('line', 'line_user_005', 'Pim Suksai', 'open', 'normal', NOW() - INTERVAL '18 minutes', 'How long does shipping to Bangkok take?', 1, ARRAY['shipping']),
  ('instagram', 'ig_user_006', 'Emma Wilson', 'open', 'normal', NOW() - INTERVAL '45 minutes', 'Are your products cruelty-free?', 1, ARRAY['product-inquiry']),
  ('facebook', 'fb_user_007', 'Liu Wei', 'resolved', 'low', NOW() - INTERVAL '2 hours', 'Thanks for the quick response!', 0, ARRAY['resolved']),
  ('email', 'email_008', 'David Kim', 'open', 'normal', NOW() - INTERVAL '1 hour', 'Wholesale inquiry', 1, ARRAY['business']),
  ('instagram', 'ig_user_009', 'Aisha Rahman', 'open', 'high', NOW() - INTERVAL '8 minutes', 'Allergic reaction question', 2, ARRAY['urgent','health']),
  ('line', 'line_user_010', 'Somchai R.', 'pending', 'normal', NOW() - INTERVAL '25 minutes', 'Promotion code not working', 1, ARRAY['support'])
ON CONFLICT (channel, customer_external_id) DO NOTHING;

-- Seed sample messages for first 3 conversations
DO $$
DECLARE
  conv_sarah UUID;
  conv_tanaka UUID;
  conv_james UUID;
BEGIN
  SELECT id INTO conv_sarah FROM conversations WHERE customer_external_id = 'fb_user_001';
  SELECT id INTO conv_tanaka FROM conversations WHERE customer_external_id = 'line_user_002';
  SELECT id INTO conv_james FROM conversations WHERE customer_external_id = 'fb_user_004';

  IF conv_sarah IS NOT NULL THEN
    INSERT INTO customer_messages (conversation_id, direction, sender_type, sender_name, content, created_at) VALUES
      (conv_sarah, 'inbound', 'customer', 'Sarah Chen', 'Hi! I love your products', NOW() - INTERVAL '20 minutes'),
      (conv_sarah, 'outbound', 'agent', 'Support Team', 'Thank you Sarah! How can we help today?', NOW() - INTERVAL '15 minutes'),
      (conv_sarah, 'inbound', 'customer', 'Sarah Chen', 'Is the Radiance Serum back in stock?', NOW() - INTERVAL '5 minutes'),
      (conv_sarah, 'inbound', 'customer', 'Sarah Chen', 'I really need it before my trip next week', NOW() - INTERVAL '4 minutes')
    ON CONFLICT DO NOTHING;
  END IF;

  IF conv_tanaka IS NOT NULL THEN
    INSERT INTO customer_messages (conversation_id, direction, sender_type, sender_name, content, created_at) VALUES
      (conv_tanaka, 'inbound', 'customer', 'Tanaka Yuki', 'こんにちは!', NOW() - INTERVAL '30 minutes'),
      (conv_tanaka, 'inbound', 'customer', 'Tanaka Yuki', 'Order #1234 shipping update?', NOW() - INTERVAL '12 minutes')
    ON CONFLICT DO NOTHING;
  END IF;

  IF conv_james IS NOT NULL THEN
    INSERT INTO customer_messages (conversation_id, direction, sender_type, sender_name, content, created_at) VALUES
      (conv_james, 'inbound', 'customer', 'James Park', 'Hello, I have a problem', NOW() - INTERVAL '15 minutes'),
      (conv_james, 'inbound', 'customer', 'James Park', 'My order arrived but the bottle was broken', NOW() - INTERVAL '10 minutes'),
      (conv_james, 'inbound', 'customer', 'James Park', 'Received damaged product', NOW() - INTERVAL '2 minutes')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
