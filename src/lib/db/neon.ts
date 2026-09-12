// Neon HTTP client — use DIRECT URL (not pooler) for neon's HTTP API
// The pooler hostname (-pooler suffix) is not compatible with neon HTTP
import { neon } from '@neondatabase/serverless'

const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL!

export const sql = neon(connectionString)
