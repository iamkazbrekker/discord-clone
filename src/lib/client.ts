import { treaty } from '@elysiajs/eden'
import type { App } from '@/app/api/[[...slug]]/route'

// .api to enter /api prefix
export const client = treaty<App>
    ('http://localhost:3000').api