-- Create competitors table for competitor analysis
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_scan_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  avg_price NUMERIC DEFAULT 0,
  price_change_7d NUMERIC DEFAULT 0,
  products_count INTEGER DEFAULT 0,
  market_share NUMERIC DEFAULT 0,
  threat_level TEXT DEFAULT 'low',
  recent_activity TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitor price tracking table
CREATE TABLE IF NOT EXISTS competitor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  our_price NUMERIC NOT NULL,
  competitor_price NUMERIC NOT NULL,
  price_difference NUMERIC GENERATED ALWAYS AS (competitor_price - our_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitor alerts table
CREATE TABLE IF NOT EXISTS competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for admin access
CREATE POLICY "Allow all on competitors" ON competitors FOR ALL USING (true);
CREATE POLICY "Allow all on competitor_prices" ON competitor_prices FOR ALL USING (true);
CREATE POLICY "Allow all on competitor_alerts" ON competitor_alerts FOR ALL USING (true);

-- Insert mock competitor data
INSERT INTO competitors (name, logo, status, avg_price, price_change_7d, products_count, market_share, threat_level, recent_activity) VALUES
('GlowNaturals', 'GN', 'active', 72.50, -5.2, 24, 18, 'medium', 'Launched new vitamin C serum at $65'),
('PureSkin Co.', 'PS', 'active', 85.00, 2.1, 31, 22, 'high', 'Running 20% off promotion on moisturizers'),
('Botanica Beauty', 'BB', 'active', 68.25, 0, 18, 12, 'low', 'No significant changes detected'),
('Derma Essentials', 'DE', 'active', 92.00, 8.5, 42, 28, 'high', 'Added 5 new anti-aging products'),
('NatureGlow Labs', 'NL', 'monitoring', 55.75, -12.3, 15, 8, 'medium', 'Aggressive price cuts across all serums');

-- Insert mock price comparison data
INSERT INTO competitor_prices (competitor_id, product_name, our_price, competitor_price)
SELECT c.id, p.product_name, p.our_price, p.competitor_price
FROM competitors c
CROSS JOIN (VALUES
  ('GlowNaturals', 'Vitamin C Serum', 78, 65),
  ('GlowNaturals', 'Hydrating Moisturizer', 67, 72),
  ('GlowNaturals', 'Gentle Cleanser', 45, 48),
  ('PureSkin Co.', 'Vitamin C Serum', 78, 82),
  ('PureSkin Co.', 'Hydrating Moisturizer', 67, 68),
  ('PureSkin Co.', 'Gentle Cleanser', 45, 52),
  ('Botanica Beauty', 'Vitamin C Serum', 78, 70),
  ('Botanica Beauty', 'Hydrating Moisturizer', 67, 65),
  ('Botanica Beauty', 'Gentle Cleanser', 45, 42),
  ('Derma Essentials', 'Vitamin C Serum', 78, 95),
  ('Derma Essentials', 'Hydrating Moisturizer', 67, 85),
  ('Derma Essentials', 'Gentle Cleanser', 45, 55)
) AS p(competitor_name, product_name, our_price, competitor_price)
WHERE c.name = p.competitor_name;

-- Insert mock alerts
INSERT INTO competitor_alerts (competitor_id, alert_type, message, severity, created_at)
SELECT c.id, a.alert_type, a.message, a.severity, NOW() - (a.hours_ago || ' hours')::interval
FROM competitors c
CROSS JOIN (VALUES
  ('NatureGlow Labs', 'price', 'NatureGlow Labs dropped serum prices by 12%', 'warning', 0),
  ('PureSkin Co.', 'product', 'PureSkin Co. launched new moisturizer line', 'info', 2),
  ('Derma Essentials', 'promo', 'Derma Essentials started 25% off sale', 'warning', 5),
  ('GlowNaturals', 'stock', 'GlowNaturals vitamin C serum out of stock', 'success', 24)
) AS a(competitor_name, alert_type, message, severity, hours_ago)
WHERE c.name = a.competitor_name;
