import 'dotenv/config';
import app from './app.js';

/**
 * Vercel serverless entry point. Exports the Express app directly without
 * app.listen() or interval schedulers — Vercel functions are stateless and
 * short-lived, so background intervals never fire reliably here. Local dev
 * and any always-on host should use src/index.ts instead.
 */
export default app;
