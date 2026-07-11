import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/public/health')({
  server: {
    handlers: {
      GET: async () => {
        const timestamp = new Date().toISOString()
        let db: 'ok' | 'error' = 'ok'
        let dbError: string | undefined

        try {
          const url = process.env.SUPABASE_URL
          const key = process.env.SUPABASE_PUBLISHABLE_KEY
          if (!url || !key) {
            db = 'error'
            dbError = 'missing_env'
          } else {
            const supabase = createClient(url, key, {
              auth: { persistSession: false, autoRefreshToken: false },
            })
            // Cheap connectivity probe: HEAD count on a public-readable table.
            const { error } = await supabase
              .from('plants')
              .select('id', { count: 'exact', head: true })
            if (error) {
              db = 'error'
              dbError = error.message
            }
          }
        } catch (err) {
          db = 'error'
          dbError = err instanceof Error ? err.message : 'unknown'
        }

        const status = db === 'ok' ? 'ok' : 'degraded'
        const httpStatus = db === 'ok' ? 200 : 503

        return new Response(
          JSON.stringify({ status, db, timestamp, ...(dbError ? { dbError } : {}) }),
          {
            status: httpStatus,
            headers: {
              'content-type': 'application/json',
              'cache-control': 'no-store',
            },
          },
        )
      },
    },
  },
})
