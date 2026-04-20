-- Inventory Table for Dr.Oat SkinCare
-- Tracks stock levels for each product

CREATE TABLE IF NOT EXISTS public.products_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_price DECIMAL(10,2) NOT NULL,
  product_category TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 100,
  low_stock_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.products_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.products_inventory(product_category);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON public.products_inventory(stock_quantity);

-- Enable RLS
ALTER TABLE public.products_inventory ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public dashboard)
CREATE POLICY "Allow all on products_inventory" ON public.products_inventory FOR ALL USING (true) WITH CHECK (true);

-- Insert all Dr.Oat SkinCare products with initial stock
INSERT INTO public.products_inventory (product_id, product_name, product_description, product_price, product_category, stock_quantity) VALUES
  ('radiance-serum', 'Radiance Serum', 'Vitamin C brightening formula', 68.00, 'serums', 45),
  ('hydrating-serum', 'Hydrating Serum', 'Hyaluronic acid moisture boost', 62.00, 'serums', 32),
  ('age-defense-serum', 'Age Defense Serum', 'Retinol & peptide complex', 78.00, 'serums', 28),
  ('glow-serum', 'Glow Serum', 'Niacinamide brightening boost', 58.00, 'serums', 67),
  ('hydra-cream', 'Hydra Cream', 'Deep moisture with hyaluronic acid', 54.00, 'moisturizers', 53),
  ('gentle-cleanser', 'Gentle Cleanser', 'Soothing botanical wash', 38.00, 'cleansers', 89),
  ('night-cream', 'Night Cream', 'Restorative overnight treatment', 64.00, 'moisturizers', 41),
  ('day-cream-spf', 'Day Cream SPF 30', 'Protection & hydration', 58.00, 'moisturizers', 36),
  ('renewal-oil', 'Renewal Oil', 'Nourishing facial oil blend', 72.00, 'oils', 24),
  ('rosehip-oil', 'Rosehip Oil', 'Pure organic rosehip extract', 48.00, 'oils', 58),
  ('jojoba-oil', 'Jojoba Oil', 'Balancing & lightweight', 42.00, 'oils', 72),
  ('argan-oil', 'Argan Oil', 'Moroccan beauty elixir', 56.00, 'oils', 47),
  ('glow-mask', 'Glow Mask', 'Weekly brightening treatment', 45.00, 'masks', 63),
  ('balance-toner', 'Balance Toner', 'pH restoring mist', 32.00, 'toners', 81)
ON CONFLICT (product_id) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  product_description = EXCLUDED.product_description,
  product_price = EXCLUDED.product_price,
  product_category = EXCLUDED.product_category,
  updated_at = NOW();
