# Semantic Solana — Optimization Report

## Critical Issues

### 1. N+1 Domain Resolution in Search API (HIGH)
**File:** `app/api/search/route.ts` — `resolveDomains()`

The AllDomains fallback creates a **new `Connection` object per address** inside the loop. Each `Connection` opens a new WebSocket/HTTP session to Helius RPC.

```typescript
// BEFORE: new Connection per address (inside Promise.allSettled loop)
const connection = new Connection(HELIUS_RPC_URL);
const parser = new TldParser(connection);
```

```typescript
// AFTER: hoist outside the loop
const connection = new Connection(HELIUS_RPC_URL);
const parser = new TldParser(connection);

const unresolved = unique.filter(a => !domains[a]).slice(0, 5);
await Promise.allSettled(
  unresolved.map(async (addr) => {
    // reuse connection & parser
  })
);
```

Same issue in `resolveDomainToAddress()` — creates new Connection for each TLD attempt in the `commonTlds` loop (up to 6 connections for a single lookup).

### 2. Sequential TLD Brute-Force (HIGH)
**File:** `app/api/search/route.ts` — `resolveDomainToAddress()`

When input has no dot, it tries `.sol` then loops through 6 TLDs **sequentially**, each creating a new Connection:

```typescript
// BEFORE: sequential loop, new connection each time
for (const tld of commonTlds) {
  const connection = new Connection(HELIUS_RPC_URL);
  const parser = new TldParser(connection);
  const owner = await parser.getOwnerFromDomainTld(cleaned + tld);
}
```

```typescript
// AFTER: parallel with shared connection, race for first result
const connection = new Connection(HELIUS_RPC_URL);
const parser = new TldParser(connection);
const results = await Promise.allSettled(
  commonTlds.filter(t => t !== ".sol").map(async (tld) => {
    const owner = await parser.getOwnerFromDomainTld(cleaned + tld);
    if (owner) return typeof owner === "string" ? owner : owner.toBase58();
    throw new Error("not found");
  })
);
const found = results.find(r => r.status === "fulfilled");
if (found && found.status === "fulfilled") return found.value;
```

### 3. No API Response Caching (HIGH)
**File:** `app/api/search/route.ts`

The Helius API call uses `next: { revalidate: 30 }` but domain resolution has **zero caching**. Bonfida and AllDomains calls happen on every request.

```typescript
// Add in-memory LRU cache for domain resolution
const domainCache = new Map<string, { value: string | null; expires: number }>();
const DOMAIN_CACHE_TTL = 300_000; // 5 minutes

function getCachedDomain(key: string): string | null | undefined {
  const entry = domainCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) { domainCache.delete(key); return undefined; }
  return entry.value;
}

function setCachedDomain(key: string, value: string | null) {
  // Cap cache size
  if (domainCache.size > 1000) {
    const firstKey = domainCache.keys().next().value;
    if (firstKey) domainCache.delete(firstKey);
  }
  domainCache.set(key, { value, expires: Date.now() + DOMAIN_CACHE_TTL });
}
```

Add cache checks in `resolveDomains()` and `resolveDomainToAddress()`.

### 4. Helius Response Caching with Headers (MEDIUM)
**File:** `app/api/search/route.ts`

Add proper HTTP cache headers so the browser/CDN can cache:

```typescript
return NextResponse.json(responseData, {
  headers: {
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  },
});
```

---

## Bundle Size

### 5. `@solana/web3.js` is Massive (~400KB min) (HIGH)
**File:** `app/api/search/route.ts`, `app/api/resolve/route.ts`

Only used for `Connection` and `PublicKey`. Since these are server-side route handlers, this doesn't affect client bundle, but it **does affect cold start time** on serverless (Vercel).

Options:
- For `PublicKey` validation, use a simple base58 check (already have `BASE58_REGEX`)
- For `Connection`, consider direct `fetch()` to RPC endpoint instead of the full SDK
- If `@onsol/tldparser` requires `Connection`, keep it but ensure it's only imported server-side (already the case with route handlers)

### 6. Client Bundle is Clean
`page.tsx` and `results/page.tsx` only import React/Next.js primitives. No heavy client-side dependencies. ✅

---

## React Rendering

### 7. Filter/Sort Recomputation on Every Render (MEDIUM)
**File:** `app/results/page.tsx`

The filter pills, type counts, filtering, and sorting all happen inside render via an IIFE. This recomputes on every state change (even unrelated ones like `inputFocused`).

```typescript
// AFTER: memoize filtered/sorted transactions
import { useMemo, useCallback } from "react";

// Inside ResultsContent:
const typeCounts = useMemo(() => {
  if (!data) return {};
  const counts: Record<string, number> = {};
  for (const tx of data.transactions) {
    const cat = getFilterCategory(tx.type);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}, [data]);

const filteredTransactions = useMemo(() => {
  if (!data) return [];
  let filtered = data.transactions;
  if (activeFilter !== "ALL") {
    filtered = filtered.filter(tx => getFilterCategory(tx.type) === activeFilter);
  }
  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "oldest": return a.timestamp - b.timestamp;
      case "amount-high": return parseAmount(b.amount) - parseAmount(a.amount);
      case "amount-low": return parseAmount(a.amount) - parseAmount(b.amount);
      default: return b.timestamp - a.timestamp;
    }
  });
}, [data, activeFilter, sortBy]);
```

### 8. `TransactionRow` Should Be Memoized (MEDIUM)
```typescript
import { memo } from "react";

const TransactionRow = memo(function TransactionRow({ tx }: { tx: ParsedTransaction }) {
  // ... existing implementation
});
```

### 9. Inline Functions in `onBlur` Create New References (LOW)
```typescript
onBlur={() => setTimeout(() => setInputFocused(false), 200)}
```
Minor — not worth fixing unless profiling shows issues.

---

## Network Waterfall

### 10. Double Domain Resolution (MEDIUM)
**Flow:** User types `name.sol` → homepage calls `/api/resolve` (debounced preview) → user hits search → `/api/search` resolves the **same domain again**.

Fix: Pass the already-resolved address to the results page:

```typescript
// In page.tsx handleSearch or resolve dropdown click:
router.push(`/results?q=${encodeURIComponent(query.trim())}&addr=${resolvedAddress}`);

// In results/page.tsx, use pre-resolved address if available:
const preResolved = searchParams.get("addr");
const searchUrl = preResolved
  ? `/api/search?q=${encodeURIComponent(preResolved)}`
  : `/api/search?q=${encodeURIComponent(query)}`;
```

### 11. Domain Resolution Waterfall in Search API (MEDIUM)
The search API does: Helius fetch → parse transactions → **then** resolve domains for all addresses. Domain resolution blocks the response.

Option A: Return transactions immediately, resolve domains in a separate endpoint (client fetches domains after rendering transactions).

Option B: Use `Promise.all` to start domain resolution while parsing:

```typescript
const rawTransactions: HeliusTransaction[] = await response.json();
const transactions = rawTransactions.map(tx => classifyTransaction(tx, resolvedAddress));
const filtered = filterSpamTransactions(transactions, resolvedAddress, rawTransactions);

// Start domain resolution in parallel with response preparation
const addressSet = new Set<string>([resolvedAddress]);
for (const tx of filtered) {
  if (tx.from && tx.from !== resolvedAddress) addressSet.add(tx.from);
  if (tx.to && tx.to !== resolvedAddress) addressSet.add(tx.to);
}

// This is already sequential — can't parallelize further without restructuring
// But with caching (item #3), subsequent requests are instant
```

---

## Core Web Vitals

### 12. Sticky Header Causes Layout Shift (LOW)
**File:** `app/results/page.tsx`

The sticky header with `backdrop-blur-sm` is fine, but ensure `min-height` is set to prevent CLS when content loads.

### 13. Add `loading.tsx` for Instant Navigation Feedback (LOW)
```typescript
// app/results/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

### 14. Font Loading (LOW)
If using custom fonts via `font-heading`, ensure they use `font-display: swap` and are preloaded.

---

## Summary by Priority

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | N+1 Connection objects in domain resolution | High | Low |
| 2 | Sequential TLD brute-force | High | Low |
| 3 | No domain resolution caching | High | Medium |
| 10 | Double domain resolution (homepage → search) | Medium | Low |
| 7 | useMemo for filter/sort | Medium | Low |
| 8 | memo() on TransactionRow | Medium | Low |
| 4 | HTTP cache headers on API response | Medium | Low |
| 11 | Domain resolution waterfall | Medium | Medium |
| 5 | @solana/web3.js cold start impact | Medium | High |
| 13 | Add loading.tsx | Low | Low |
