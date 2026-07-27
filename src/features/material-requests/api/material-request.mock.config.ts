/**
 * Material request mock API (visible in browser Network tab).
 *
 * When `true`:
 *   - Material-request calls use `http://localhost:<port>/api/v1/material-requests/...`
 *     (same-origin), even if NEXT_PUBLIC_API_URL points at the remote backend.
 *   - Next.js route handlers in `src/app/api/v1/material-requests/` return mock JSON.
 *   - Mock data is stored in server memory (resets when dev server restarts).
 *   - Open DevTools → Network → filter "material-requests" to copy payload/response.
 *
 * When `false`:
 *   - Client calls hit `NEXT_PUBLIC_API_URL` directly (`material-requests/...`).
 */
export const MATERIAL_REQUEST_USE_MOCK = false;
