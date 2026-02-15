"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  {
    label: "Solana Foundation",
    query: "GK2zqSsXhC64MFmzVJqFKxrFMQMFmptR7LGKMkNxNejr",
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

export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/results?q=${encodeURIComponent(query.trim())}`);
  };

  const handleExample = (q: string) => {
    router.push(`/results?q=${encodeURIComponent(q)}`);
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
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Wallet address or domain (e.g. name.sol, name.abc)..."
              className="flex-1 bg-surface border border-border rounded-lg px-5 py-4 text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 font-mono text-sm"
              autoFocus
            />
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
