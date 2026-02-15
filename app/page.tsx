"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  {
    label: "toly.sol",
    query: "toly.sol",
  },
  {
    label: "Jupiter Aggregator",
    query: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  },
  {
    label: "Magic Eden",
    query: "1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix",
  },
];

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface ResolveResult {
  resolved: boolean;
  domain?: string;
  address?: string;
  truncated?: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  // Debounced domain resolution
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResolveResult(null);

    const trimmed = query.trim();
    // Only resolve if it looks like a domain (has a dot, not a base58 address)
    if (!trimmed || BASE58_REGEX.test(trimmed) || !trimmed.includes(".")) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setResolving(true);
      try {
        const r = await fetch(`/api/resolve?domain=${encodeURIComponent(trimmed)}`);
        const data = await r.json();
        if (data.resolved) {
          setResolveResult(data);
        } else {
          setResolveResult({ resolved: false });
        }
      } catch {
        setResolveResult(null);
      } finally {
        setResolving(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/wallet?q=${encodeURIComponent(query.trim())}`);
  };

  const handleExample = (q: string) => {
    router.push(`/wallet?q=${encodeURIComponent(q)}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="font-heading text-5xl md:text-6xl font-black text-text mb-3 tracking-tight">
          Semantic Solana
        </h1>
        <div className="w-16 h-1 bg-accent mx-auto mb-6 rounded-full" />
        <p className="text-text-dim text-lg md:text-xl mb-12 max-w-lg mx-auto leading-relaxed">
          Paste a wallet address. Get human-readable transaction history. No
          jargon, no hex dumps.
        </p>

        <form onSubmit={handleSearch} className="mb-12">
          <div className="flex flex-col sm:flex-row gap-3 relative">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Wallet address or domain (e.g. name.sol, name.abc)..."
                className="w-full bg-surface border border-border rounded-lg px-5 py-4 text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 font-mono text-sm"
                autoFocus
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 200)}
              />
              {/* Domain resolution dropdown */}
              {inputFocused && query.trim().includes(".") && !BASE58_REGEX.test(query.trim()) && (resolving || resolveResult) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg overflow-hidden shadow-lg z-50">
                  {resolving ? (
                    <div className="px-5 py-3 text-text-muted text-sm flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Resolving {query.trim()}...
                    </div>
                  ) : resolveResult?.resolved ? (
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/wallet?q=${encodeURIComponent(query.trim())}`);
                      }}
                      className="w-full px-5 py-3 text-left hover:bg-accent/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-accent font-medium">{resolveResult.domain}</span>
                          <span className="text-text-muted mx-2">resolves to</span>
                        </div>
                        <span className="font-mono text-text-dim text-sm">{resolveResult.truncated}</span>
                      </div>
                      <div className="font-mono text-text-muted text-xs mt-1 truncate">
                        {resolveResult.address}
                      </div>
                    </button>
                  ) : resolveResult && !resolveResult.resolved ? (
                    <div className="px-5 py-3 text-text-muted text-sm">
                      No wallet found for {query.trim()}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="bg-accent hover:bg-accent-dim text-base font-semibold px-8 py-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-accent-glow active:scale-[0.98]"
            >
              Search
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <p className="text-text-muted text-sm uppercase tracking-wider font-medium">
            Try an example
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => handleExample(ex.query)}
                className="bg-surface border border-border hover:border-accent text-text-dim hover:text-accent px-4 py-2 rounded-lg text-sm cursor-pointer transition-all duration-200"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-text-muted text-xs">
        Powered by Helius API
      </footer>
    </main>
  );
}
