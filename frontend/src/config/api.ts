/**
 * Centralized API base URL configuration.
 *
 * - In production (Cloudflare Pages): set VITE_API_BASE_URL to your deployed Worker URL.
 * - In local development: defaults to http://localhost:8789 (Wrangler dev port).
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8789';
