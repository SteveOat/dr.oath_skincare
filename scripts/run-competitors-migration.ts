import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigration() {
  console.log('Creating competitors table...')
  
  // Create competitors table
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
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
    `
  })

  if (tableError) {
    console.log('Table might already exist or RPC not available, trying direct insert...')
  }

  // Insert competitor data directly
  const { error: insertError } = await supabase
    .from('competitors')
    .upsert([
      { name: 'GlowNaturals', logo: 'GN', status: 'active', avg_price: 72.50, price_change_7d: -5.2, products_count: 24, market_share: 18, threat_level: 'medium', recent_activity: 'Launched new vitamin C serum at $65' },
      { name: 'PureSkin Co.', logo: 'PS', status: 'active', avg_price: 85.00, price_change_7d: 2.1, products_count: 31, market_share: 22, threat_level: 'high', recent_activity: 'Running 20% off promotion on moisturizers' },
      { name: 'Botanica Beauty', logo: 'BB', status: 'active', avg_price: 68.25, price_change_7d: 0, products_count: 18, market_share: 12, threat_level: 'low', recent_activity: 'No significant changes detected' },
      { name: 'Derma Essentials', logo: 'DE', status: 'active', avg_price: 92.00, price_change_7d: 8.5, products_count: 42, market_share: 28, threat_level: 'high', recent_activity: 'Added 5 new anti-aging products' },
      { name: 'NatureGlow Labs', logo: 'NL', status: 'monitoring', avg_price: 55.75, price_change_7d: -12.3, products_count: 15, market_share: 8, threat_level: 'medium', recent_activity: 'Aggressive price cuts across all serums' }
    ], { onConflict: 'name' })

  if (insertError) {
    console.error('Insert error:', insertError)
  } else {
    console.log('Competitors data inserted successfully!')
  }
}

runMigration()
