-- Analytics Tables for Dr.Oat SkinCare
-- Tracks: page views, product views, cart events, purchases, clicks, sessions

-- Sessions table (tracks unique visitors)
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  referrer TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  page_views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Page views table
CREATE TABLE IF NOT EXISTS public.analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  time_on_page INTEGER, -- seconds
  scroll_depth INTEGER, -- percentage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product views table
CREATE TABLE IF NOT EXISTS public.analytics_product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2),
  product_category TEXT,
  source_page TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart events table (add, remove, update quantity)
CREATE TABLE IF NOT EXISTS public.analytics_cart_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'add', 'remove', 'update_quantity'
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2),
  quantity INTEGER DEFAULT 1,
  cart_total DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase events table
CREATE TABLE IF NOT EXISTS public.analytics_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  order_total DECIMAL(10,2) NOT NULL,
  item_count INTEGER NOT NULL,
  items JSONB NOT NULL, -- array of {product_id, name, price, quantity}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Click events table (button clicks, link clicks)
CREATE TABLE IF NOT EXISTS public.analytics_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  element_type TEXT NOT NULL, -- 'button', 'link', 'cta'
  element_text TEXT,
  element_id TEXT,
  page_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON public.analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.analytics_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON public.analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.analytics_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON public.analytics_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_product_views_session_id ON public.analytics_product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.analytics_product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created_at ON public.analytics_product_views(created_at);
CREATE INDEX IF NOT EXISTS idx_cart_events_session_id ON public.analytics_cart_events(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_events_created_at ON public.analytics_cart_events(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_session_id ON public.analytics_purchases(session_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.analytics_purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_session_id ON public.analytics_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON public.analytics_clicks(created_at);

-- Disable RLS for analytics tables (public dashboard, no auth required)
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cart_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_clicks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for analytics (no auth required for this use case)
CREATE POLICY "Allow all inserts on analytics_sessions" ON public.analytics_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects on analytics_sessions" ON public.analytics_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all updates on analytics_sessions" ON public.analytics_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow all inserts on analytics_page_views" ON public.analytics_page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects on analytics_page_views" ON public.analytics_page_views FOR SELECT USING (true);

CREATE POLICY "Allow all inserts on analytics_product_views" ON public.analytics_product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects on analytics_product_views" ON public.analytics_product_views FOR SELECT USING (true);

CREATE POLICY "Allow all inserts on analytics_cart_events" ON public.analytics_cart_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects on analytics_cart_events" ON public.analytics_cart_events FOR SELECT USING (true);

CREATE POLICY "Allow all inserts on analytics_purchases" ON public.analytics_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects on analytics_purchases" ON public.analytics_purchases FOR SELECT USING (true);

CREATE POLICY "Allow all inserts on analytics_clicks" ON public.analytics_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects on analytics_clicks" ON public.analytics_clicks FOR SELECT USING (true);
