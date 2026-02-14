"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { ParsedTransaction } from "../api/search/route";

const TYPE_COLORS: Record<string, string> = {
  SWAP: "bg-teal/20 text-teal-light border-teal/30",
  TRANSFER: "bg-blue-400/20 text-blue-400 border-blue-400/30",
  NFT_SALE: "bg-purple-400/20 text-purple-400 border-purple-400/30",
  NFT_LISTING: "bg-purple-400/20 text-purple-400 border-purple-400/30",
  NFT_MINT: "bg-green-400/20 text-green-400 border-green-400/30",
  COMPRESSED_NFT_MINT: "bg-green-400/20 text-green-400 border-green-400/30",
  TOKEN_MINT: "bg-green-400/20 text-green-400 border-green-400/30",
  STAKE_SOL: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
  UNSTAKE_SOL: "bg-orange-400/20 text-orange-400 border-orange-400/30",
  BURN: "bg-red-400/20 text-red-400 border-red-400/30",
  UNKNOWN: "bg-gray-400/20 text-gray-400 border-gray-400/30",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS.UNKNOWN;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || "--";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function TransactionBadge({ type, label }: { type: string; label: string }) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-md text-xs font-medium border ${getTypeColor(type)}`}
    >
      {label}
    </span>
  );
}

function TransactionRow({ tx }: { tx: ParsedTransaction }) {
  const solscanUrl = `https://solscan.io/tx/${tx.signature}`;

  return (
    <a
      href={solscanUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block cursor-pointer"
    >
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[100px_120px_1fr_140px_200px] gap-4 items-center px-5 py-4 border-b border-navy-lighter hover:bg-navy-light/50 transition-colors duration-150">
        <span className="text-gray-400 text-sm">{formatTime(tx.timestamp)}</span>
        <TransactionBadge type={tx.type} label={tx.typeLabel} />
        <span className="text-sand text-sm truncate">{tx.description}</span>
        <span className="text-sand-light text-sm font-mono text-right">
          {tx.amount || "--"}
        </span>
        <div className="text-xs font-mono text-gray-400 truncate">
          {truncateAddress(tx.from)}
          {tx.to && (
            <>
              <span className="text-gray-500 mx-1">&rarr;</span>
              {truncateAddress(tx.to)}
            </>
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div className="md:hidden px-4 py-4 border-b border-navy-lighter hover:bg-navy-light/50 transition-colors duration-150 space-y-2">
        <div className="flex items-center justify-between">
          <TransactionBadge type={tx.type} label={tx.typeLabel} />
          <span className="text-gray-400 text-xs">{formatTime(tx.timestamp)}</span>
        </div>
        <p className="text-sand text-sm">{tx.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-sand-light text-sm font-mono">
            {tx.amount || "--"}
          </span>
          <span className="text-xs font-mono text-gray-400">
            {truncateAddress(tx.from)}
          </span>
        </div>
      </div>
    </a>
  );
}

interface SearchResponse {
  query: string;
  isAddress: boolean;
  address?: string;
  demo?: boolean;
  message?: string;
  transactions: ParsedTransaction[];
  error?: string;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newQuery, setNewQuery] = useState(query);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError("");

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Failed to fetch results. Please try again."))
      .finally(() => setLoading(false));
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim()) return;
    router.push(`/results?q=${encodeURIComponent(newQuery.trim())}`);
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-navy-lighter bg-navy/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="font-heading text-xl font-bold text-sand hover:text-teal transition-colors duration-200 cursor-pointer shrink-0"
          >
            Semantic Solana
          </button>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              className="flex-1 bg-navy-light border border-navy-lighter rounded-lg px-4 py-2.5 text-sand placeholder-gray-500 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-all duration-200 font-mono text-sm"
              placeholder="Wallet address..."
            />
            <button
              type="submit"
              className="bg-teal hover:bg-teal-dark text-navy font-semibold px-6 py-2.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-[0.98]"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Fetching transactions...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-400/10 border border-red-400/30 rounded-lg px-5 py-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Summary bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                {data.address && (
                  <p className="font-mono text-xs text-gray-400 break-all">
                    {data.address}
                  </p>
                )}
                {data.demo && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 rounded text-xs">
                    Demo mode -- add HELIUS_API_KEY for live data
                  </span>
                )}
                {data.message && !data.isAddress && (
                  <p className="text-sand-dark text-sm mt-1">{data.message}</p>
                )}
              </div>
              <p className="text-gray-400 text-sm">
                {data.transactions.length} transaction
                {data.transactions.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Table header (desktop) */}
            {data.transactions.length > 0 && (
              <div className="hidden md:grid grid-cols-[100px_120px_1fr_140px_200px] gap-4 px-5 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium border-b border-navy-lighter">
                <span>Time</span>
                <span>Type</span>
                <span>Description</span>
                <span className="text-right">Amount</span>
                <span>From / To</span>
              </div>
            )}

            {/* Transactions */}
            <div className="bg-navy-light/30 rounded-lg overflow-hidden border border-navy-lighter">
              {data.transactions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-lg mb-1">No transactions found</p>
                  <p className="text-sm">
                    This wallet may be empty or inactive
                  </p>
                </div>
              ) : (
                data.transactions.map((tx) => (
                  <TransactionRow key={tx.signature} tx={tx} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
