import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

async function runMigration() {
  try {
    const migrationSQL = readFileSync(join(__dirname, '008-create-messages-tables.sql'), 'utf8')
    
    console.log('Running messages migration...')
    await sql.unsafe(migrationSQL)
    console.log('Migration completed successfully!')
    
    const conversations = await sql`SELECT channel, COUNT(*) as count FROM conversations GROUP BY channel`
    console.log('Conversations by channel:', conversations)
    
    const messages = await sql`SELECT COUNT(*) as count FROM customer_messages`
    console.log('Total messages:', messages)
    
    const channels = await sql`SELECT * FROM channel_connections`
    console.log('Channels:', channels)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration()
