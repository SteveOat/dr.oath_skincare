import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' })

async function runMigration() {
  try {
    const migrationSQL = readFileSync(join(__dirname, '001_create_analytics_tables.sql'), 'utf8')
    
    // Split by semicolons and run each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.length > 0) {
        await sql.unsafe(statement)
        console.log('Executed statement successfully')
      }
    }
    
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await sql.end()
  }
}

runMigration()
