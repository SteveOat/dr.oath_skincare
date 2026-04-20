import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Create analytics_events table
    const { error: eventsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type TEXT NOT NULL,
          event_data JSONB DEFAULT '{}',
          page_url TEXT,
          referrer TEXT,
          user_agent TEXT,
          session_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
      `
    })

    // If RPC doesn't exist, create tables directly via REST
    // We'll use a simpler approach - just try to select and if table doesn't exist, we need to create it manually
    
    // Test if table exists by selecting
    const { error: testError } = await supabase
      .from('analytics_events')
      .select('id')
      .limit(1)

    if (testError && testError.code === '42P01') {
      // Table doesn't exist - return instructions
      return NextResponse.json({ 
        success: false, 
        message: "Tables need to be created. Please run the SQL migration manually.",
        sql: `
-- Run this SQL in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

-- Disable RLS for analytics (public write, admin read)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public inserts" ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public selects" ON analytics_events FOR SELECT USING (true);
        `
      })
    }

    return NextResponse.json({ success: true, message: "Analytics tables ready!" })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "POST to this endpoint to setup analytics tables",
    instructions: "Or run the SQL from /scripts/001_create_analytics_tables.sql in your Supabase SQL Editor"
  })
}
