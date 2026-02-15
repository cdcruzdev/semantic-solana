"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo, memo, Suspense } from "react";
import type { ParsedTransaction } from "../api/search/route";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface ResolveResult {
  resolved: boolean;
  domain?: string;
  address?: string;
  truncated?: string;
}

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
  OPEN_POSITION: "bg-accent/15 text-accent border-accent/25",
  CLOSE_POSITION: "bg-orange/15 text-orange border-orange/25",
  DEPOSIT: "bg-accent/15 text-accent border-accent/25",
  LP_DEPOSIT: "bg-accent/15 text-accent border-accent/25",
  LP_WITHDRAW: "bg-orange/15 text-orange border-orange/25",
  PERPS: "bg-purple/15 text-purple border-purple/25",
  DCA: "bg-blue/15 text-blue border-blue/25",
  MULTISIG: "bg-yellow/15 text-yellow border-yellow/25",
  CLAIM: "bg-accent/15 text-accent border-accent/25",
  INITIALIZE_ACCOUNT: "bg-text-muted/15 text-text-dim border-text-muted/25",
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

function getFilterCategory(type: string): string {
  switch (type) {
    case "SWAP": return "Swap";
    case "TRANSFER": return "Transfer";
    case "LP_DEPOSIT":
    case "LP_WITHDRAW":
    case "DEPOSIT":
    case "CLAIM":
    case "ADD_LIQUIDITY":
    case "REMOVE_LIQUIDITY":
    case "OPEN_POSITION":
    case "CLOSE_POSITION":
    case "PERPS":
    case "DCA":
    case "STAKE_SOL":
    case "UNSTAKE_SOL":
    case "MULTISIG":
      return "DeFi";
    case "NFT_SALE":
    case "NFT_LISTING":
    case "NFT_MINT":
    case "COMPRESSED_NFT_MINT":
    case "NFT_BID":
    case "NFT_CANCEL_LISTING":
      return "NFT";
    case "DOMAIN": return "Domain";
    case "SPAM": return "Spam";
    default: return "Other";
  }
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const match = amountStr.match(/([\d.,]+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(/,/g, "")) || 0;
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-surface-light cursor-pointer transition-colors duration-150 shrink-0"
      title="Copy address"
    >
      {copied ? (
        <svg className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function AddressDisplay({ address, domain, showCopy }: { address: string; domain?: string; showCopy?: boolean }) {
  if (domain) {
    return (
      <span className="inline-flex items-center gap-0.5 min-w-0">
        <span className="text-accent text-xs font-medium truncate max-w-[120px] sm:max-w-[180px]" title={`${domain} (${address})`}>
          {domain}
        </span>
        {showCopy && <CopyButton text={address} />}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 min-w-0">
      <span className="text-text-muted text-xs font-mono truncate" title={address}>
        {truncateAddress(address)}
      </span>
      {showCopy && <CopyButton text={address} />}
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

const TransactionRow = memo(function TransactionRow({ tx }: { tx: ParsedTransaction }) {
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
});

interface SearchResponse {
  query: string;
  isAddress: boolean;
  address?: string;
  inputDomain?: string | null;
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
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount-high" | "amount-low">("newest");
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced domain resolution for the search bar
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setResolveResult(null);
    const trimmed = newQuery.trim();
    if (!trimmed || BASE58_REGEX.test(trimmed) || !trimmed.includes(".")) return;
    debounceRef.current = setTimeout(async () => {
      setResolving(true);
      try {
        const r = await fetch(`/api/resolve?domain=${encodeURIComponent(trimmed)}`);
        const d = await r.json();
        setResolveResult(d.resolved ? d : { resolved: false });
      } catch { setResolveResult(null); }
      finally { setResolving(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [newQuery]);

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
    router.push(`/wallet?q=${encodeURIComponent(newQuery.trim())}`);
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
          <form onSubmit={handleSearch} className="flex-1 flex gap-2 relative">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200 font-mono text-xs sm:text-sm"
                placeholder="Wallet address or domain..."
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 200)}
              />
              {inputFocused && newQuery.trim().includes(".") && !BASE58_REGEX.test(newQuery.trim()) && (resolving || resolveResult) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg overflow-hidden shadow-lg z-50">
                  {resolving ? (
                    <div className="px-4 py-2 text-text-muted text-xs flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Resolving...
                    </div>
                  ) : resolveResult?.resolved ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/wallet?q=${encodeURIComponent(newQuery.trim())}`)}
                      className="w-full px-4 py-2 text-left hover:bg-accent/10 transition-colors cursor-pointer"
                    >
                      <span className="text-accent font-medium text-sm">{resolveResult.domain}</span>
                      <span className="text-text-muted text-xs mx-2">→</span>
                      <span className="font-mono text-text-dim text-xs">{resolveResult.truncated}</span>
                    </button>
                  ) : resolveResult && !resolveResult.resolved ? (
                    <div className="px-4 py-2 text-text-muted text-xs">Domain not found</div>
                  ) : null}
                </div>
              )}
            </div>
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
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-[11px] text-text-muted break-all">
                        {data.address}
                      </p>
                      <CopyButton text={data.address} />
                    </div>
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

            {/* Filter & Sort controls */}
            {data.transactions.length > 0 && (() => {
              // Compute type counts for filter pills
              const typeCounts: Record<string, number> = {};
              for (const tx of data.transactions) {
                const category = getFilterCategory(tx.type);
                typeCounts[category] = (typeCounts[category] || 0) + 1;
              }
              const filterOptions = [
                { key: "ALL", label: "All" },
                ...(typeCounts["Swap"] ? [{ key: "Swap", label: `Swaps (${typeCounts["Swap"]})` }] : []),
                ...(typeCounts["Transfer"] ? [{ key: "Transfer", label: `Transfers (${typeCounts["Transfer"]})` }] : []),
                ...(typeCounts["DeFi"] ? [{ key: "DeFi", label: `DeFi (${typeCounts["DeFi"]})` }] : []),
                ...(typeCounts["NFT"] ? [{ key: "NFT", label: `NFTs (${typeCounts["NFT"]})` }] : []),
                ...(typeCounts["Domain"] ? [{ key: "Domain", label: `Domains (${typeCounts["Domain"]})` }] : []),
                ...(typeCounts["Spam"] ? [{ key: "Spam", label: `Spam (${typeCounts["Spam"]})` }] : []),
                ...(typeCounts["Other"] ? [{ key: "Other", label: `Other (${typeCounts["Other"]})` }] : []),
              ];

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  {/* Filter pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setActiveFilter(opt.key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 border ${
                          activeFilter === opt.key
                            ? "bg-accent/20 text-accent border-accent/40"
                            : "bg-surface text-text-muted border-border hover:border-text-muted hover:text-text-dim"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {/* Sort dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-dim cursor-pointer focus:outline-none focus:border-accent shrink-0"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="amount-high">Largest amount</option>
                    <option value="amount-low">Smallest amount</option>
                  </select>
                </div>
              );
            })()}

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
              {(() => {
                let filtered = data.transactions;
                if (activeFilter !== "ALL") {
                  filtered = filtered.filter(tx => getFilterCategory(tx.type) === activeFilter);
                }
                // Sort
                filtered = [...filtered].sort((a, b) => {
                  switch (sortBy) {
                    case "oldest": return a.timestamp - b.timestamp;
                    case "amount-high": return parseAmount(b.amount) - parseAmount(a.amount);
                    case "amount-low": return parseAmount(a.amount) - parseAmount(b.amount);
                    default: return b.timestamp - a.timestamp;
                  }
                });
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-16 text-text-dim">
                      <p className="text-lg mb-1">No matching transactions</p>
                      <p className="text-sm text-text-muted">
                        Try a different filter
                      </p>
                    </div>
                  );
                }
                return filtered.map((tx) => (
                  <TransactionRow key={tx.signature} tx={tx} />
                ));
              })()}
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
