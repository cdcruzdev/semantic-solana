"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import type { ParsedTransaction } from "../api/search/route";

const TYPE_COLORS: Record<string, string> = {
  SWAP: "bg-accent/15 text-accent border-accent/25",
  TRANSFER: "bg-blue/15 text-blue border-blue/25",
  DOMAIN: "bg-pink/15 text-pink border-pink/25",
  NFT_SALE: "bg-purple/15 text-purple border-purple/25",
  NFT_LISTING: "bg-purple/15 text-purple border-purple/25",
  NFT_MINT: "bg-green/15 text-green border-green/25",
  COMPRESSED_NFT_MINT: "bg-green/15 text-green border-green/25",
  TOKEN_MINT: "bg-green/15 text-green border-green/25",
  STAKE_SOL: "bg-yellow/15 text-yellow border-yellow/25",
  UNSTAKE_SOL: "bg-orange/15 text-orange border-orange/25",
  CLOSE_ACCOUNT: "bg-text-muted/15 text-text-dim border-text-muted/25",
  SPAM: "bg-text-muted/10 text-text-muted border-text-muted/20",
  BURN: "bg-red/15 text-red border-red/25",
  ADD_LIQUIDITY: "bg-accent/15 text-accent border-accent/25",
  REMOVE_LIQUIDITY: "bg-orange/15 text-orange border-orange/25",
  UNKNOWN: "bg-text-muted/15 text-text-dim border-text-muted/25",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || TYPE_COLORS.UNKNOWN;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || "";
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

function AddressDisplay({ address, domain }: { address: string; domain?: string }) {
  if (domain) {
    return (
      <span className="text-accent text-xs font-medium" title={address}>
        {domain}
      </span>
    );
  }
  return (
    <span className="text-text-muted text-xs font-mono" title={address}>
      {truncateAddress(address)}
    </span>
  );
}

function TransactionBadge({ type, label }: { type: string; label: string }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide border whitespace-nowrap ${getTypeColor(type)}`}
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
      className="block cursor-pointer group"
    >
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[88px_110px_1fr_140px_180px] gap-3 items-center px-4 py-3.5 border-b border-border group-hover:bg-surface/80 transition-colors duration-150">
        <span className="text-text-dim text-xs">{formatTime(tx.timestamp)}</span>
        <TransactionBadge type={tx.type} label={tx.typeLabel} />
        <span className="text-text text-sm truncate pr-2">{tx.description}</span>
        <span className="text-text text-sm font-mono text-right truncate">
          {tx.amount || ""}
        </span>
        <div className="flex items-center gap-1 min-w-0">
          <AddressDisplay address={tx.from} domain={tx.fromDomain} />
          {tx.to && (
            <>
              <span className="text-text-muted text-[10px] shrink-0">&rarr;</span>
              <AddressDisplay address={tx.to} domain={tx.toDomain} />
            </>
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div className="md:hidden px-4 py-3.5 border-b border-border group-hover:bg-surface/80 transition-colors duration-150">
        <div className="flex items-center justify-between mb-2">
          <TransactionBadge type={tx.type} label={tx.typeLabel} />
          <span className="text-text-muted text-[11px]">{formatTime(tx.timestamp)}</span>
        </div>
        <p className="text-text text-sm leading-snug mb-2">{tx.description}</p>
        <div className="flex items-center justify-between">
          {tx.amount && (
            <span className="text-text font-mono text-xs font-medium">
              {tx.amount}
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto min-w-0">
            <AddressDisplay address={tx.from} domain={tx.fromDomain} />
            {tx.to && (
              <>
                <span className="text-text-muted text-[10px]">&rarr;</span>
                <AddressDisplay address={tx.to} domain={tx.toDomain} />
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

interface SearchResponse {
  query: string;
  isAddress: boolean;
  address?: string;
  addressDomain?: string | null;
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
      <header className="border-b border-border bg-base/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push("/")}
            className="font-heading text-lg font-bold text-text hover:text-accent transition-colors duration-200 cursor-pointer shrink-0"
          >
            Semantic Solana
          </button>
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 font-mono text-xs sm:text-sm"
              placeholder="Wallet address..."
            />
            <button
              type="submit"
              className="bg-accent hover:bg-accent-dim text-base font-semibold px-4 sm:px-6 py-2 rounded-lg cursor-pointer transition-all duration-200 active:scale-[0.98] text-sm"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-text-dim text-sm">Fetching transactions...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red/10 border border-red/30 rounded-lg px-4 py-3 text-red text-sm">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Summary bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="min-w-0">
                {data.address && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {data.addressDomain && (
                      <span className="text-accent font-medium text-sm">
                        {data.addressDomain}
                      </span>
                    )}
                    <p className="font-mono text-[11px] text-text-muted break-all">
                      {data.address}
                    </p>
                  </div>
                )}
                {data.demo && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-yellow/10 text-yellow border border-yellow/30 rounded text-xs">
                    Demo mode
                  </span>
                )}
                {data.message && !data.isAddress && (
                  <p className="text-text-dim text-sm mt-1">{data.message}</p>
                )}
              </div>
              <p className="text-text-muted text-xs shrink-0">
                {data.transactions.length} transaction
                {data.transactions.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Table header (desktop) */}
            {data.transactions.length > 0 && (
              <div className="hidden md:grid grid-cols-[88px_110px_1fr_140px_180px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-text-muted font-semibold border-b border-border">
                <span>Time</span>
                <span>Type</span>
                <span>Description</span>
                <span className="text-right">Amount</span>
                <span>From / To</span>
              </div>
            )}

            {/* Transactions */}
            <div className="bg-surface/30 rounded-lg overflow-hidden border border-border">
              {data.transactions.length === 0 ? (
                <div className="text-center py-16 text-text-dim">
                  <p className="text-lg mb-1">No transactions found</p>
                  <p className="text-sm text-text-muted">
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
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
