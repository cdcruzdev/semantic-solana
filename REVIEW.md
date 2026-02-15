# Semantic Solana — Code Review

Reviewed: 2025-02-15

## Critical

### 1. API Key Leaked in Client-Fetchable URL
**File:** `app/api/search/route.ts:497`
```ts
const url = `https://api.helius.xyz/v0/addresses/${resolvedAddress}/transactions?api-key=${HELIUS_API_KEY}`;
```
The Helius API key is interpolated into the URL. While this runs server-side (safe from direct client exposure), if error logging ever includes the URL, the key leaks. The `resolvedAddress` is also interpolated without validation beyond the regex — a malformed value that passes `BASE58_REGEX` could cause unexpected behavior.

**Fix:** Use headers or POST body for the API key. Validate `resolvedAddress` with `new PublicKey(resolvedAddress)` before using it in the URL.

### 2. No Rate Limiting on API Routes
**Files:** `app/api/search/route.ts`, `app/api/resolve/route.ts`
Both routes are unauthenticated and have no rate limiting. An attacker can spam `/api/search` to burn through the Helius API quota or `/api/resolve` to DoS the RPC endpoint.

**Fix:** Add rate limiting middleware (e.g., `next-rate-limit`, Vercel's edge rate limiting, or a simple in-memory token bucket).

### 3. Unbounded RPC Connections in Resolve
**File:** `app/api/resolve/route.ts:24`, `app/api/search/route.ts:392,406`
A new `Connection` object is created on every request. Under load, this creates unbounded WebSocket/HTTP connections to the RPC.

**Fix:** Create a single shared `Connection` instance at module level (already done for `HELIUS_RPC_URL` but not for the `Connection` object).

## High

### 4. User Input Passed Directly to External API Without Sanitization
**File:** `app/api/search/route.ts:497`
```ts
const url = `https://api.helius.xyz/v0/addresses/${resolvedAddress}/transactions?api-key=...`;
```
`resolvedAddress` comes from user input (validated only by regex). Path traversal isn't a real risk for Helius, but it's a bad pattern. Same issue in `resolve/route.ts:17` where `domain` is passed to Bonfida.

**Fix:** Use `encodeURIComponent()` on all user-provided URL segments.

### 5. Silent Error Swallowing Throughout
**Files:** `app/api/search/route.ts` (lines 370, 380, 395, 410, 425, 439, 450), `app/api/resolve/route.ts:19,30`
Every `catch` block is empty (`catch {}`). Domain resolution failures, RPC errors, and network issues are completely invisible.

**Fix:** Add `console.warn` or structured logging in catch blocks. At minimum, track failure counts for observability.

### 6. `useSearchParams()` Without Suspense Boundary (Already Fixed)
**File:** `app/results/page.tsx`
Correctly wrapped in `<Suspense>` — good. But `ResultsContent` doesn't handle the case where `query` is empty string (it returns early from the `useEffect` but renders an empty page with no guidance).

**Fix:** Add an empty-state UI when `query` is falsy.

## Medium

### 7. XSS via `tx.description`
**File:** `app/results/page.tsx:172`
```tsx
<span className="text-text text-sm truncate pr-2">{tx.description}</span>
```
`tx.description` can come from `tx.description` in Helius API response (line ~270 in search route: `description = tx.description`). React auto-escapes JSX interpolation, so this is **safe** — but if anyone switches to `dangerouslySetInnerHTML`, it becomes XSS. Worth noting.

**Risk:** Low (React escapes by default). No action needed unless rendering changes.

### 8. Race Condition in Domain Resolution Debounce
**Files:** `app/page.tsx:38-56`, `app/results/page.tsx:117-130`
The debounce clears previous timeouts but doesn't abort in-flight `fetch` requests. If a user types `foo.sol`, then quickly types `bar.sol`, the response for `foo.sol` might arrive after `bar.sol`'s request fires, showing stale results.

**Fix:** Use `AbortController` to cancel previous fetch when the query changes:
```ts
const abortRef = useRef<AbortController | null>(null);
// In the effect:
abortRef.current?.abort();
abortRef.current = new AbortController();
fetch(url, { signal: abortRef.current.signal })
```

### 9. `navigator.clipboard` Not Available in All Contexts
**File:** `app/results/page.tsx:105`
`navigator.clipboard.writeText()` throws in insecure contexts (HTTP, not HTTPS) and some browsers. No error handling.

**Fix:** Wrap in try/catch:
```ts
try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* fallback or ignore */ }
```

### 10. Imported Type Used at Runtime
**File:** `app/results/page.tsx:4`
```ts
import type { ParsedTransaction } from "../api/search/route";
```
This is correct usage (`import type`), but `ParsedTransaction` is exported from a server-side route file. If the export ever includes runtime values, this coupling could cause bundling issues.

**Fix:** Move shared types to a `types.ts` or `lib/types.ts` file.

### 11. Potential Crash: `searchParams.get("q")` Returns `null`
**File:** `app/results/page.tsx:92`
```ts
const query = searchParams.get("q") || "";
```
Handled with `|| ""`, but the `useEffect` at line 132 doesn't show any UI feedback when query is empty. User lands on blank page.

## Low

### 12. Dead Code: `truncateAddr` in search route
**File:** `app/api/search/route.ts:116`
`truncateAddr()` is defined but never called anywhere in the file. `truncateAddress()` in results page is the one actually used.

**Fix:** Remove `truncateAddr`.

### 13. Duplicated `BASE58_REGEX`
**Files:** `app/api/search/route.ts:9`, `app/page.tsx:16`, `app/results/page.tsx:5`
Same regex defined three times.

**Fix:** Move to a shared `lib/constants.ts`.

### 14. Duplicated `ResolveResult` Interface
**Files:** `app/page.tsx:18-23`, `app/results/page.tsx:7-12`
Identical interface defined twice.

**Fix:** Move to shared types file.

### 15. Hardcoded 10-Address Cap for Domain Resolution
**File:** `app/api/search/route.ts:385` (`.slice(0, 10)`)
Silently drops addresses beyond 10. For wallets with many counterparties, some addresses won't get domain resolution.

**Fix:** Document this limitation or make it configurable.

### 16. Mock Data Signature Format Mismatch
**File:** `app/api/search/route.ts:467-470`
Mock signatures like `"5xGh8K...mock1"` don't match real Solana signature format. The Solscan links in results page will 404.

**Fix:** Use realistic-looking base58 signatures for demo mode, or disable links in demo mode.

### 17. Missing `key` Stability for Spam Summary
**File:** `app/api/search/route.ts:448`
```ts
signature: `dust-summary-${Date.now()}`
```
Using `Date.now()` means the key changes on every render/re-fetch, preventing React reconciliation.

**Fix:** Use a stable key like `"dust-summary"`.

### 18. No Loading/Error States for Domain Resolution Dropdown
**File:** `app/page.tsx:78`
If the resolve API returns a non-JSON response (e.g., 500 HTML error page), `r.json()` will throw and the catch sets `resolveResult` to `null`, silently failing.

**Fix:** Check `r.ok` before parsing JSON.

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 3 |
| Medium | 5 |
| Low | 7 |

**Top 3 actions:**
1. Add rate limiting to API routes
2. Share a single `Connection` instance; don't create per-request
3. Use `AbortController` for debounced fetches to prevent race conditions
