import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { TldParser } from "@onsol/tldparser";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "https://api.mainnet-beta.solana.com";
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Known program IDs for better labeling
const KNOWN_PROGRAMS: Record<string, string> = {
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcPX73": "Jupiter v4",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium",
  "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K": "Magic Eden",
  "MEisE1HzehtrDpAAT8PnLHjpSSkRYakotTuJRPjTpo8": "Magic Eden v2",
  "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN": "Tensor",
  "hadeK9DLv9eA7ya5KnNHgLVtKttYhGZSQi3R4kzGZw3": "Hades Swap",
  "So11111111111111111111111111111111111111112": "Wrapped SOL",
  "11111111111111111111111111111111": "System Program",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": "Associated Token",
  "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX": "AllDomains",
  "jCebN34bUfdeUhR6mzCPgdBRD7LgATaimMjKRGS6hXS": "AllDomains Registrar",
  "BNSN4vYdwKBC6DUxyuagjTExzwRpSKbPZKB23X1VNFWX": "AllDomains (ANS)",
  "2H2XwRCDEJsvc8sFo1ciU7sbGfJRkLGfm1CuqBjFhN4F": "AllDomains (.abc)",
  "Fv5hf1Fg58htfC7YEXKNEfkpuogUUQDDTLgjGWxxv48H": "AllDomains Name Router",
  "85iDfUvr3HJyLM2zcq5BXSiDvUWfw6cSE1FfNBo8Ap29": "Bonfida SNS",
  "jCebN34bUfdeUhR6mzCPgdBRD7LgATaimMjKRGS6hXe": "Bonfida Name Service",
  "58PwtjSDuFHuUkYjH9BYod9SZBfMwirRm6KjxMvsSR22": ".skr Domains",
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX": "Serum",
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": "Serum v3",
  "MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky": "Mercurial",
  "SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ": "Saber",
  "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1": "Orca (Whirlpool)",
  "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY": "Phoenix",
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo": "Meteora",
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB": "Meteora (Pools)",
  "stake11111111111111111111111111111111111111": "Stake Program",
  "ComputeBudget111111111111111111111111111111": "Compute Budget",
  // DeFi protocols
  "div5eMqGmAFLGLi3eUHuFnHYkeGaphKiGat5Mn2YP1Uo": "DiversiFi",
  "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD": "Marinade",
  "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "Orca (Legacy)",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium CLMM",
  "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS": "Raydium Route",
  "FLUXubRmkEi2q6K3Y5o2jQKJ2AGonzPEtxhBs5PuFRGo": "FluxBeam",
  "SSwapUtytk1dRPkyasFeqH2bAKSGqL5nnVz8JXaEhUR": "Saros",
  "Dooar9JkhdZ7J3LHN3A7YCuoGRUggXhQaG4kijfLGU2j": "Stepn Dex",
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun",
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA": "Pump.fun AMM",
  // Jupiter ecosystem
  "PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu": "Jupiter Perpetuals",
  "DoVEsk76QybCEHQGzkvYPWLQu9gzNoZZZt3TPiL597e": "Jupiter DCA",
  "proVF4pMXVaYqmy4NjniPh4pqKNfMmsihgd4wdkCX3u": "Okx Dex",
  "DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH": "DFlow",
  // Multisig / governance
  "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf": "Squads",
  // DiversiFi
  "61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH": "DiversiFi",
  // AllDomains TLD programs
  "TLDHkysf5pCnKsVA4gXpNvmy7psXLPEu4LAdDJthT9S": "AllDomains",
  "TCSVHqadS2swhap43BnZtmeEAPNXfpc3w2HLBredVaR": "AllDomains",
  "ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK": "AllDomains",
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95": "AllDomains",
  "3vyr9DRfMZb2KvUQdnps7YG3PY38XdguLBQaJ2DFkSxk": "AllDomains",
  // Compressed NFT
  "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY": "Bubblegum",
  // Poseidon
  "HLsgAVzjjBaBR9QCLqV3vjC9LTnR2xtmtB77j1EJQBsZ": "Poseidon",
  // Memo
  "MemoSq4gqABAXKb96qnH8Tys": "Memo",
};

// Known token mints
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "So11111111111111111111111111111111111111112": { symbol: "SOL", decimals: 9 },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", decimals: 6 },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { symbol: "USDT", decimals: 6 },
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": { symbol: "mSOL", decimals: 9 },
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": { symbol: "stSOL", decimals: 9 },
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn": { symbol: "JitoSOL", decimals: 9 },
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": { symbol: "BONK", decimals: 5 },
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": { symbol: "JUP", decimals: 6 },
  "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof": { symbol: "RENDER", decimals: 8 },
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": { symbol: "PYTH", decimals: 6 },
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": { symbol: "ETH (Wormhole)", decimals: 8 },
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": { symbol: "WIF", decimals: 6 },
  "CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu": { symbol: "CLOUD", decimals: 9 },
};

interface HeliusTransaction {
  signature: string;
  type: string;
  source: string;
  description: string;
  fee: number;
  feePayer: string;
  timestamp: number;
  slot: number;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard?: string;
  }>;
  events?: {
    swap?: {
      nativeInput?: { account: string; amount: string };
      nativeOutput?: { account: string; amount: string };
      tokenInputs?: Array<{
        mint: string;
        tokenAmount: number;
        userAccount: string;
      }>;
      tokenOutputs?: Array<{
        mint: string;
        tokenAmount: number;
        userAccount: string;
      }>;
    };
    nft?: {
      description: string;
      type: string;
      buyer?: string;
      seller?: string;
      amount?: number;
      nfts?: Array<{ mint: string; tokenStandard: string }>;
    };
  };
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: { tokenAmount: string; decimals: number };
      userAccount: string;
    }>;
  }>;
  instructions?: Array<{
    programId: string;
    accounts: string[];
    data: string;
    innerInstructions?: Array<{
      programId: string;
      accounts: string[];
      data: string;
    }>;
  }>;
}

export interface ParsedTransaction {
  signature: string;
  timestamp: number;
  type: string;
  typeLabel: string;
  description: string;
  amount: string;
  from: string;
  to: string;
  fromDomain?: string;
  toDomain?: string;
  fee: number;
  source: string;
}

function getTokenSymbol(mint: string): string {
  return KNOWN_TOKENS[mint]?.symbol || mint.slice(0, 4) + "..." + mint.slice(-4);
}

function getProgramName(programId: string): string {
  return KNOWN_PROGRAMS[programId] || "";
}

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr || "";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function floorTo4(n: number): string {
  // Floor to 4 decimal places, no scientific notation
  const floored = Math.floor(n * 10000) / 10000;
  if (floored === 0 && n > 0) return "< 0.0001";
  return floored.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol === 0) return "0 SOL";
  return `${floorTo4(sol)} SOL`;
}

function formatTokenAmount(amount: number | undefined | null, mint: string): string {
  const token = KNOWN_TOKENS[mint];
  const symbol = token?.symbol || "tokens";
  if (!amount || amount === 0) return `0 ${symbol}`;
  return `${floorTo4(amount)} ${symbol}`;
}

// Check if a transaction involves domain services
function detectDomainProgram(tx: HeliusTransaction): string | null {
  const allProgramIds = new Set<string>();

  // Check instructions
  if (tx.instructions) {
    for (const ix of tx.instructions) {
      allProgramIds.add(ix.programId);
      if (ix.innerInstructions) {
        for (const inner of ix.innerInstructions) {
          allProgramIds.add(inner.programId);
        }
      }
    }
  }

  // Check source
  const source = (tx.source || "").toUpperCase();

  // AllDomains
  const alldomainsPrograms = [
    "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
    "jCebN34bUfdeUhR6mzCPgdBRD7LgATaimMjKRGS6hXS",
    "BNSN4vYdwKBC6DUxyuagjTExzwRpSKbPZKB23X1VNFWX",
    "2H2XwRCDEJsvc8sFo1ciU7sbGfJRkLGfm1CuqBjFhN4F",
    "Fv5hf1Fg58htfC7YEXKNEfkpuogUUQDDTLgjGWxxv48H",
  ];
  for (const p of alldomainsPrograms) {
    if (allProgramIds.has(p)) return "AllDomains";
  }
  if (source.includes("ALLDOMAINS") || source.includes("ANS")) return "AllDomains";

  // Bonfida SNS
  const bonfidaPrograms = [
    "85iDfUvr3HJyLM2zcq5BXSiDvUWfw6cSE1FfNBo8Ap29",
    "jCebN34bUfdeUhR6mzCPgdBRD7LgATaimMjKRGS6hXe",
  ];
  for (const p of bonfidaPrograms) {
    if (allProgramIds.has(p)) return "Bonfida SNS";
  }
  if (source.includes("BONFIDA") || source.includes("SNS")) return "Bonfida SNS";

  // .skr domains (Solana Mobile)
  if (allProgramIds.has("58PwtjSDuFHuUkYjH9BYod9SZBfMwirRm6KjxMvsSR22")) return ".skr Domains";
  if (source.includes("SKR") || source.includes("SAGADOMAIN")) return ".skr Domains";

  return null;
}

// Detect the main DeFi/app protocol from instructions
function detectProtocol(tx: HeliusTransaction): string | null {
  const skipPrograms = new Set([
    "11111111111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "ComputeBudget111111111111111111111111111111",
    "So11111111111111111111111111111111111111112",
  ]);

  if (tx.instructions) {
    for (const ix of tx.instructions) {
      if (!skipPrograms.has(ix.programId)) {
        const name = getProgramName(ix.programId);
        if (name) return name;
      }
      if (ix.innerInstructions) {
        for (const inner of ix.innerInstructions) {
          if (!skipPrograms.has(inner.programId)) {
            const name = getProgramName(inner.programId);
            if (name) return name;
          }
        }
      }
    }
  }
  return null;
}

// Try to extract domain name from Helius description
function extractDomainName(description: string): string | null {
  // Helius descriptions often contain things like "cdcruz.abc registered" or "registered cdcruz.abc"
  const domainPattern = /\b([a-zA-Z0-9-]+\.(sol|abc|bonk|poor|id|solana|skr|com|io|dev))\b/i;
  const match = description.match(domainPattern);
  return match ? match[1] : null;
}

// Get token symbol from balance changes as fallback
function getTokensFromBalanceChanges(tx: HeliusTransaction, walletAddress: string): { sent: {symbol: string; amount: number}[]; received: {symbol: string; amount: number}[] } {
  const sent: {symbol: string; amount: number}[] = [];
  const received: {symbol: string; amount: number}[] = [];

  if (!tx.accountData) return { sent, received };

  for (const acct of tx.accountData) {
    if (acct.account !== walletAddress) continue;
    for (const change of acct.tokenBalanceChanges || []) {
      const rawAmt = Number(change.rawTokenAmount.tokenAmount);
      const decimals = change.rawTokenAmount.decimals;
      const amount = Math.abs(rawAmt) / Math.pow(10, decimals);
      const symbol = getTokenSymbol(change.mint);
      if (rawAmt < 0) {
        sent.push({ symbol, amount });
      } else if (rawAmt > 0) {
        received.push({ symbol, amount });
      }
    }
  }

  return { sent, received };
}

function classifyTransaction(tx: HeliusTransaction, walletAddress: string): ParsedTransaction {
  const type = (tx.type || "UNKNOWN").toUpperCase();

  const typeLabels: Record<string, string> = {
    TRANSFER: "Transfer",
    SWAP: "Swap",
    NFT_SALE: "NFT Sale",
    NFT_LISTING: "NFT Listing",
    NFT_BID: "NFT Bid",
    NFT_CANCEL_LISTING: "NFT Delist",
    NFT_MINT: "NFT Mint",
    COMPRESSED_NFT_MINT: "cNFT Mint",
    TOKEN_MINT: "Token Mint",
    BURN: "Burn",
    BURN_NFT: "NFT Burn",
    STAKE_SOL: "Stake",
    UNSTAKE_SOL: "Unstake",
    INIT_STAKE: "Init Stake",
    MERGE_STAKE: "Merge Stake",
    SPLIT_STAKE: "Split Stake",
    CREATE_ORDER: "Create Order",
    CANCEL_ORDER: "Cancel Order",
    FILL_ORDER: "Fill Order",
    CLOSE_POSITION: "Close Position",
    CLOSE_ACCOUNT: "Close Account",
    LOAN: "Loan",
    REPAY_LOAN: "Repay Loan",
    ADD_LIQUIDITY: "Add LP",
    REMOVE_LIQUIDITY: "Remove LP",
    UNKNOWN: "Transaction",
  };

  let typeLabel = typeLabels[type] || type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  // Detect domain programs
  const domainService = detectDomainProgram(tx);

  // Build a smart description by looking at all transfers holistically
  let description = "";
  let amount = "";
  let from = tx.feePayer || "";
  let to = "";

  // Aggregate all native transfers for this wallet
  const totalNativeSent = (tx.nativeTransfers || [])
    .filter(t => t.fromUserAccount === walletAddress && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalNativeReceived = (tx.nativeTransfers || [])
    .filter(t => t.toUserAccount === walletAddress && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  // Find the main counterparty
  const nativeDests = (tx.nativeTransfers || [])
    .filter(t => t.fromUserAccount === walletAddress && t.toUserAccount !== walletAddress)
    .map(t => t.toUserAccount);
  const nativeSources = (tx.nativeTransfers || [])
    .filter(t => t.toUserAccount === walletAddress && t.fromUserAccount !== walletAddress)
    .map(t => t.fromUserAccount);

  // Aggregate token transfers
  const tokensSent: { mint: string; amount: number; to: string }[] = [];
  const tokensReceived: { mint: string; amount: number; from: string }[] = [];

  for (const t of tx.tokenTransfers || []) {
    const amt = t.tokenAmount ?? 0;
    if (t.fromUserAccount === walletAddress && amt > 0) {
      tokensSent.push({ mint: t.mint, amount: amt, to: t.toUserAccount });
    }
    if (t.toUserAccount === walletAddress && amt > 0) {
      tokensReceived.push({ mint: t.mint, amount: amt, from: t.fromUserAccount });
    }
  }

  // Source label - clean up raw program names
  let sourceName = getProgramName(tx.source) || "";
  if (!sourceName && tx.source) {
    // Clean up raw source names like "OKX_DEX_ROUTER" -> "OKX DEX"
    sourceName = tx.source
      .replace(/_/g, " ")
      .replace(/\b(ROUTER|PROGRAM|CONTRACT|V\d+)\b/gi, "")
      .trim()
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
      .trim();
  }

  // Build description based on type
  switch (type) {
    case "SWAP": {
      typeLabel = "Swap";
      const swap = tx.events?.swap;
      let inputStr = "";
      let outputStr = "";

      if (swap) {
        if (swap.nativeInput) {
          inputStr = formatSol(Number(swap.nativeInput.amount));
        } else if (swap.tokenInputs && swap.tokenInputs.length > 0) {
          const inp = swap.tokenInputs[0];
          inputStr = formatTokenAmount(inp.tokenAmount, inp.mint);
        }

        if (swap.nativeOutput) {
          outputStr = formatSol(Number(swap.nativeOutput.amount));
        } else if (swap.tokenOutputs && swap.tokenOutputs.length > 0) {
          const out = swap.tokenOutputs[0];
          outputStr = formatTokenAmount(out.tokenAmount, out.mint);
        }
      }

      // Fallback: use tokenTransfers if swap events are sparse
      if (!inputStr && !outputStr) {
        if (tokensSent.length > 0) {
          inputStr = formatTokenAmount(tokensSent[0].amount, tokensSent[0].mint);
        } else if (totalNativeSent > 0) {
          inputStr = formatSol(totalNativeSent);
        }
        if (tokensReceived.length > 0) {
          outputStr = formatTokenAmount(tokensReceived[0].amount, tokensReceived[0].mint);
        } else if (totalNativeReceived > 0) {
          outputStr = formatSol(totalNativeReceived);
        }
      }

      // Last resort: balance changes
      if (!inputStr && !outputStr) {
        const balChanges = getTokensFromBalanceChanges(tx, walletAddress);
        if (balChanges.sent.length > 0) {
          inputStr = `${floorTo4(balChanges.sent[0].amount)} ${balChanges.sent[0].symbol}`;
        }
        if (balChanges.received.length > 0) {
          outputStr = `${floorTo4(balChanges.received[0].amount)} ${balChanges.received[0].symbol}`;
        }
      }

      // Filter out zero amounts
      if (inputStr.startsWith("0 ")) inputStr = "";
      if (outputStr.startsWith("0 ")) outputStr = "";

      if (inputStr && outputStr) {
        description = `Swapped ${inputStr} for ${outputStr}`;
        amount = inputStr;
      } else if (inputStr) {
        description = `Swapped ${inputStr}`;
        amount = inputStr;
      } else if (outputStr) {
        description = `Received ${outputStr} from swap`;
        amount = outputStr;
      } else if (tx.description && tx.description.length > 10) {
        description = tx.description;
      } else {
        description = "Swapped tokens";
      }
      if (sourceName) description += ` on ${sourceName}`;
      break;
    }

    case "TRANSFER": {
      // Detect LP deposits disguised as transfers (e.g. Meteora)
      const transferProtocol = detectProtocol(tx);
      const lpLikeProtocols = ["Meteora", "Meteora (Pools)", "Orca", "Raydium CLMM", "Raydium"];
      // Squads multisig
      if ((tx.source || "").toUpperCase().includes("SQUADS") || transferProtocol === "Squads") {
        typeLabel = "Multisig";
        if (tokensReceived.length > 0) {
          const t = tokensReceived[0];
          const amtStr = formatTokenAmount(t.amount, t.mint);
          description = `Received ${amtStr} via Squads multisig`;
          amount = amtStr;
        } else if (totalNativeReceived > 0) {
          description = `Received ${formatSol(totalNativeReceived)} via Squads multisig`;
          amount = formatSol(totalNativeReceived);
        } else {
          description = "Squads multisig transaction";
        }
        from = walletAddress;
        break;
      }
      if (transferProtocol && lpLikeProtocols.includes(transferProtocol) && tokensSent.length > 0 && totalNativeSent > 0) {
        typeLabel = "LP Deposit";
        const parts: string[] = [];
        if (totalNativeSent > 0) parts.push(formatSol(totalNativeSent));
        for (const t of tokensSent) parts.push(formatTokenAmount(t.amount, t.mint));
        description = `Deposited ${parts.join(" + ")} into ${transferProtocol} LP`;
        amount = parts[0] || "";
        from = walletAddress;
        break;
      }
      if (domainService) {
        // Domain purchase - try to extract domain name from Helius description
        typeLabel = "Domain";
        const domainName = extractDomainName(tx.description || "");
        const cost = totalNativeSent > 0 ? formatSol(totalNativeSent) : "";
        if (domainName && cost) {
          description = `Bought ${domainName} for ${cost}`;
        } else if (domainName) {
          description = `Registered ${domainName}`;
        } else if (cost) {
          description = `Bought a domain on ${domainService} for ${cost}`;
        } else {
          description = `Registered a domain on ${domainService}`;
        }
        amount = cost;
        from = walletAddress;
        to = nativeDests[0] || "";
      } else if (totalNativeSent > 0 && tokensSent.length === 0 && tokensReceived.length === 0) {
        // Pure SOL transfer
        const solAmt = formatSol(totalNativeSent);
        const dest = nativeDests[0] || "";
        const destName = getProgramName(dest);
        description = destName
          ? `Sent ${solAmt} to ${destName}`
          : `Sent ${solAmt}`;
        amount = solAmt;
        from = walletAddress;
        to = dest;
      } else if (totalNativeReceived > 0 && totalNativeSent === 0 && tokensSent.length === 0) {
        const solAmt = formatSol(totalNativeReceived);
        const src = nativeSources[0] || "";
        const srcName = getProgramName(src);
        description = srcName
          ? `Received ${solAmt} from ${srcName}`
          : `Received ${solAmt}`;
        amount = solAmt;
        from = src;
        to = walletAddress;
      } else if (tokensSent.length > 0) {
        const t = tokensSent[0];
        const amtStr = formatTokenAmount(t.amount, t.mint);
        description = `Sent ${amtStr}`;
        amount = amtStr;
        from = walletAddress;
        to = t.to;
      } else if (tokensReceived.length > 0) {
        const t = tokensReceived[0];
        const amtStr = formatTokenAmount(t.amount, t.mint);
        description = `Received ${amtStr}`;
        amount = amtStr;
        from = t.from;
        to = walletAddress;
      } else {
        description = tx.description || "Transferred funds";
        if (totalNativeSent > 0) amount = formatSol(totalNativeSent);
      }
      break;
    }

    case "NFT_SALE": {
      const nft = tx.events?.nft;
      if (nft) {
        const isbuyer = nft.buyer === walletAddress;
        const solAmt = nft.amount ? formatSol(nft.amount) : "";
        description = isbuyer
          ? `Bought an NFT${solAmt ? ` for ${solAmt}` : ""}`
          : `Sold an NFT${solAmt ? ` for ${solAmt}` : ""}`;
        if (sourceName) description += ` on ${sourceName}`;
        amount = solAmt;
        from = nft.seller || "";
        to = nft.buyer || "";
      } else {
        description = tx.description || "NFT sale";
      }
      break;
    }

    case "CLOSE_ACCOUNT": {
      const protocol = detectProtocol(tx);
      // Detect LP operations: if wallet sends tokens to a pool via Raydium CLMM / Orca / Meteora,
      // this is actually an LP deposit or withdrawal, not just "closing an account"
      const lpProtocols = ["Raydium CLMM", "Orca", "Meteora", "Meteora (Pools)"];
      if (protocol && lpProtocols.includes(protocol)) {
        // Wallet sends tokens to pool = depositing into LP
        if (tokensSent.length > 0) {
          typeLabel = "LP Deposit";
          const parts: string[] = [];
          for (const t of tokensSent) {
            if (t.mint === "So11111111111111111111111111111111111111112") {
              parts.push(formatSol(Math.round(t.amount * 1e9)));
            } else {
              parts.push(formatTokenAmount(t.amount, t.mint));
            }
          }
          description = `Deposited ${parts.join(" + ")} into ${protocol} LP`;
          amount = parts[0] || "";
        } else if (tokensReceived.length > 0) {
          typeLabel = "LP Withdraw";
          const parts: string[] = [];
          for (const t of tokensReceived) {
            parts.push(formatTokenAmount(t.amount, t.mint));
          }
          description = `Withdrew ${parts.join(" + ")} from ${protocol} LP`;
          amount = parts[0] || "";
        } else {
          typeLabel = "LP Close";
          description = `Closed LP position on ${protocol}`;
        }
      } else {
        // Regular account close
        const reclaimedSol = totalNativeReceived > 0 ? formatSol(totalNativeReceived) : "";
        description = `Closed account${reclaimedSol ? `, reclaimed ${reclaimedSol}` : ""}`;
        amount = reclaimedSol;
      }
      from = walletAddress;
      break;
    }

    case "STAKE_SOL":
    case "INIT_STAKE": {
      const solAmt = totalNativeSent > 0 ? formatSol(totalNativeSent) : "";
      description = solAmt ? `Staked ${solAmt}` : "Staked SOL";
      amount = solAmt;
      from = walletAddress;
      break;
    }

    case "UNSTAKE_SOL": {
      const solAmt = totalNativeReceived > 0 ? formatSol(totalNativeReceived) : "";
      description = solAmt ? `Unstaked ${solAmt}` : "Unstaked SOL";
      amount = solAmt;
      to = walletAddress;
      break;
    }

    case "ADD_LIQUIDITY": {
      const parts: string[] = [];
      if (totalNativeSent > 0) parts.push(formatSol(totalNativeSent));
      for (const t of tokensSent) parts.push(formatTokenAmount(t.amount, t.mint));
      description = parts.length > 0
        ? `Added liquidity: ${parts.join(" + ")}`
        : "Added liquidity";
      if (sourceName) description += ` on ${sourceName}`;
      amount = parts[0] || "";
      from = walletAddress;
      break;
    }

    case "REMOVE_LIQUIDITY": {
      const parts: string[] = [];
      if (totalNativeReceived > 0) parts.push(formatSol(totalNativeReceived));
      for (const t of tokensReceived) parts.push(formatTokenAmount(t.amount, t.mint));
      description = parts.length > 0
        ? `Removed liquidity: ${parts.join(" + ")}`
        : "Removed liquidity";
      if (sourceName) description += ` on ${sourceName}`;
      amount = parts[0] || "";
      to = walletAddress;
      break;
    }

    case "OPEN_POSITION": {
      typeLabel = "Open LP";
      const parts: string[] = [];
      if (totalNativeSent > 0) parts.push(formatSol(totalNativeSent));
      for (const t of tokensSent) parts.push(formatTokenAmount(t.amount, t.mint));
      description = parts.length > 0
        ? `Opened LP position with ${parts.join(" + ")}`
        : "Opened a liquidity position";
      if (sourceName) description += ` on ${sourceName}`;
      amount = parts[0] || "";
      from = walletAddress;
      break;
    }

    case "CLOSE_POSITION": {
      typeLabel = "Close LP";
      const parts: string[] = [];
      if (totalNativeReceived > 0) parts.push(formatSol(totalNativeReceived));
      for (const t of tokensReceived) parts.push(formatTokenAmount(t.amount, t.mint));
      description = parts.length > 0
        ? `Closed LP position, received ${parts.join(" + ")}`
        : "Closed a liquidity position";
      if (sourceName) description += ` on ${sourceName}`;
      amount = parts[0] || "";
      to = walletAddress;
      break;
    }

    case "INITIALIZE_ACCOUNT": {
      const protocol = detectProtocol(tx) || sourceName;
      const solAmt = totalNativeSent > 0 ? formatSol(totalNativeSent) : "";

      // Check token flows to determine what happened
      if (tokensReceived.length > 0 && protocol) {
        // Received tokens while initializing = claiming/withdrawing from protocol
        typeLabel = "Claim";
        const tokenAmt = formatTokenAmount(tokensReceived[0].amount, tokensReceived[0].mint);
        description = `Claimed ${tokenAmt} from ${protocol}`;
        if (solAmt) description += ` (${solAmt} rent for new account)`;
        amount = tokenAmt;
      } else if (tokensSent.length > 0 && protocol) {
        typeLabel = "Deposit";
        const tokenAmt = formatTokenAmount(tokensSent[0].amount, tokensSent[0].mint);
        description = `Deposited ${tokenAmt} into ${protocol}`;
        if (solAmt) description += ` (${solAmt} rent)`;
        amount = tokenAmt;
      } else if (protocol && protocol !== "Associated Token") {
        typeLabel = "Setup";
        description = solAmt
          ? `Set up account on ${protocol} (${solAmt} rent)`
          : `Set up account on ${protocol}`;
        amount = solAmt;
      } else {
        typeLabel = "Init Account";
        description = solAmt
          ? `Initialized token account (${solAmt} rent)`
          : "Initialized a new token account";
      }
      from = walletAddress;
      break;
    }

    case "NFT_MINT":
    case "COMPRESSED_NFT_MINT": {
      typeLabel = type === "COMPRESSED_NFT_MINT" ? "cNFT Mint" : "NFT Mint";
      const mintCost = totalNativeSent > 0 ? formatSol(totalNativeSent) : "";
      description = mintCost ? `Minted an NFT for ${mintCost}` : "Minted an NFT";
      if (sourceName && sourceName !== "Unknown") description += ` via ${sourceName}`;
      if (mintCost) amount = mintCost;
      from = walletAddress;
      break;
    }

    case "CREATE": {
      // Domain registration
      if (domainService || (tx.source || "").toUpperCase().includes("ALLDOMAINS")) {
        typeLabel = "Domain";
        const domainName = extractDomainName(tx.description || "");
        const cost = totalNativeSent > 0 ? formatSol(totalNativeSent) : "";
        const tokenCost = tokensSent.length > 0 ? formatTokenAmount(tokensSent[0].amount, tokensSent[0].mint) : "";
        const costStr = tokenCost || cost;
        if (domainName && costStr) {
          description = `Registered ${domainName} for ${costStr}`;
        } else if (domainName) {
          description = `Registered ${domainName}`;
        } else if (costStr) {
          description = `Registered a domain for ${costStr}`;
        } else {
          description = "Registered a domain";
        }
        amount = costStr;
      } else {
        const proto = detectProtocol(tx);
        description = proto ? `Created account on ${proto}` : "Created account";
      }
      from = walletAddress;
      break;
    }

    case "CLOSE": {
      if (domainService || (tx.source || "").toUpperCase().includes("ALLDOMAINS")) {
        typeLabel = "Domain";
        const domainName = extractDomainName(tx.description || "");
        description = domainName ? `Transferred domain ${domainName}` : "Domain transfer/close";
      } else {
        const proto = detectProtocol(tx);
        description = proto ? `Closed account on ${proto}` : "Closed account";
      }
      from = walletAddress;
      break;
    }

    case "UPDATE": {
      if (domainService || (tx.source || "").toUpperCase().includes("ALLDOMAINS")) {
        typeLabel = "Domain";
        const domainName = extractDomainName(tx.description || "");
        description = domainName ? `Updated domain ${domainName}` : "Updated domain settings";
      } else {
        const proto = detectProtocol(tx);
        description = proto ? `Updated settings on ${proto}` : "Updated account";
      }
      from = walletAddress;
      break;
    }

    default: {
      // Check if domain related even with UNKNOWN type
      if (domainService) {
        typeLabel = "Domain";
        const domainName = extractDomainName(tx.description || "");
        const cost = totalNativeSent > 0 ? formatSol(totalNativeSent) : "";
        if (domainName && cost) {
          description = `Bought ${domainName} for ${cost}`;
        } else if (domainName) {
          description = `Registered ${domainName}`;
        } else {
          description = cost
            ? `Domain transaction on ${domainService} for ${cost}`
            : `Domain transaction on ${domainService}`;
        }
        amount = cost;
      } else {
        const protocol = detectProtocol(tx) || sourceName;

        // Smart classification based on detected protocol
        if (protocol === "Jupiter Perpetuals") {
          typeLabel = "Perps";
          if (tokensSent.length > 0) {
            const t = tokensSent[0];
            const amtStr = formatTokenAmount(t.amount, t.mint);
            description = `Opened perp position with ${amtStr} on Jupiter`;
            amount = amtStr;
          } else if (tokensReceived.length > 0) {
            const t = tokensReceived[0];
            const amtStr = formatTokenAmount(t.amount, t.mint);
            description = `Closed perp position, received ${amtStr} from Jupiter`;
            amount = amtStr;
          } else if (totalNativeReceived > totalNativeSent) {
            const net = formatSol(totalNativeReceived - totalNativeSent);
            description = `Closed perp position on Jupiter (reclaimed ${net})`;
            amount = net;
          } else {
            description = "Jupiter Perpetuals trade";
          }
        } else if (protocol === "Jupiter DCA") {
          typeLabel = "DCA";
          if (tokensSent.length > 0) {
            const t = tokensSent[0];
            const amtStr = formatTokenAmount(t.amount, t.mint);
            description = `Set up DCA order for ${amtStr} on Jupiter`;
            amount = amtStr;
          } else if (tokensReceived.length > 0) {
            const t = tokensReceived[0];
            const amtStr = formatTokenAmount(t.amount, t.mint);
            description = `DCA order filled, received ${amtStr}`;
            amount = amtStr;
          } else {
            description = "Jupiter DCA order";
          }
        } else if (protocol === "DFlow") {
          // DFlow is a swap router
          typeLabel = "Swap";
          if (tokensSent.length > 0 && tokensReceived.length > 0) {
            const inStr = formatTokenAmount(tokensSent[0].amount, tokensSent[0].mint);
            const outStr = formatTokenAmount(tokensReceived[tokensReceived.length - 1].amount, tokensReceived[tokensReceived.length - 1].mint);
            description = `Swapped ${inStr} for ${outStr} via DFlow`;
            amount = inStr;
          } else {
            description = "Swapped tokens via DFlow";
          }
        } else if (protocol === "Squads") {
          typeLabel = "Multisig";
          if (tokensSent.length > 0) {
            const t = tokensSent[0];
            description = `Multisig payout: ${formatTokenAmount(t.amount, t.mint)}`;
            amount = formatTokenAmount(t.amount, t.mint);
          } else if (totalNativeSent > 0) {
            description = `Multisig payout: ${formatSol(totalNativeSent)}`;
            amount = formatSol(totalNativeSent);
          } else {
            description = "Squads multisig transaction";
          }
        } else {
          // Generic fallback with protocol context
          if (totalNativeSent > 0 && totalNativeReceived === 0) {
            description = `Sent ${formatSol(totalNativeSent)}`;
            amount = formatSol(totalNativeSent);
            if (protocol) description += ` to ${protocol}`;
          } else if (totalNativeReceived > 0 && totalNativeSent === 0) {
            description = `Received ${formatSol(totalNativeReceived)}`;
            amount = formatSol(totalNativeReceived);
            if (protocol) description += ` from ${protocol}`;
          } else if (tokensSent.length > 0 && tokensReceived.length > 0) {
            // Looks like a swap
            typeLabel = "Swap";
            const inStr = formatTokenAmount(tokensSent[0].amount, tokensSent[0].mint);
            const outStr = formatTokenAmount(tokensReceived[tokensReceived.length - 1].amount, tokensReceived[tokensReceived.length - 1].mint);
            description = `Swapped ${inStr} for ${outStr}`;
            amount = inStr;
            if (protocol) description += ` on ${protocol}`;
          } else if (tokensSent.length > 0) {
            const t = tokensSent[0];
            description = `Sent ${formatTokenAmount(t.amount, t.mint)}`;
            amount = formatTokenAmount(t.amount, t.mint);
            if (protocol) description += ` to ${protocol}`;
          } else if (tokensReceived.length > 0) {
            const t = tokensReceived[0];
            description = `Received ${formatTokenAmount(t.amount, t.mint)}`;
            amount = formatTokenAmount(t.amount, t.mint);
            if (protocol) description += ` from ${protocol}`;
          } else if (tx.description) {
            description = tx.description;
          } else {
            description = protocol ? `Interacted with ${protocol}` : typeLabel;
          }
        }
      }
    }
  }

  // Set from/to if not already set
  if (!from) from = walletAddress;
  if (!to && nativeDests.length > 0) to = nativeDests[0];
  if (!to && nativeSources.length > 0) to = nativeSources[0];

  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
    type: domainService ? "DOMAIN" : 
          typeLabel === "Deposit" ? "DEPOSIT" :
          typeLabel === "LP Deposit" ? "LP_DEPOSIT" :
          typeLabel === "LP Withdraw" ? "LP_WITHDRAW" :
          typeLabel === "LP Close" ? "CLOSE_POSITION" :
          typeLabel === "Perps" ? "PERPS" :
          typeLabel === "DCA" ? "DCA" :
          typeLabel === "Multisig" ? "MULTISIG" :
          typeLabel === "Claim" ? "CLAIM" :
          typeLabel === "Swap" && type === "UNKNOWN" ? "SWAP" :
          type,
    typeLabel,
    description,
    amount,
    from,
    to,
    fee: tx.fee,
    source: tx.source || "UNKNOWN",
  };
}

// Resolve a domain name to a wallet address
async function resolveDomainToAddress(domain: string): Promise<string | null> {
  // Clean up input
  let cleaned = domain.trim().toLowerCase();

  // 1. Try .sol domain via Bonfida
  if (cleaned.endsWith(".sol")) {
    const name = cleaned.replace(/\.sol$/, "");
    try {
      const response = await fetch(
        `https://sns-sdk-proxy.bonfida.workers.dev/resolve/${name}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.s === "ok" && data.result) {
          return data.result;
        }
      }
    } catch {
      // Fall through
    }
    return null;
  }

  // 2. Try AllDomains TLD parser for .abc, .bonk, .poor, .id, .solana, .skr, etc.
  // Check if it looks like a domain (has a dot)
  if (cleaned.includes(".")) {
    try {
      const connection = new Connection(HELIUS_RPC_URL);
      const parser = new TldParser(connection);
      const owner = await parser.getOwnerFromDomainTld(cleaned);
      if (owner) {
        return typeof owner === "string" ? owner : owner.toBase58();
      }
    } catch {
      // Fall through
    }
  }

  // 3. If no dot, try as .sol by default
  if (!cleaned.includes(".")) {
    try {
      const response = await fetch(
        `https://sns-sdk-proxy.bonfida.workers.dev/resolve/${cleaned}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.s === "ok" && data.result) {
          return data.result;
        }
      }
    } catch {
      // Fall through
    }

    // Also try AllDomains common TLDs
    const commonTlds = [".sol", ".abc", ".bonk", ".id", ".solana", ".poor", ".skr"];
    for (const tld of commonTlds) {
      if (tld === ".sol") continue; // Already tried above
      try {
        const connection = new Connection(HELIUS_RPC_URL);
        const parser = new TldParser(connection);
        const owner = await parser.getOwnerFromDomainTld(cleaned + tld);
        if (owner) {
          return typeof owner === "string" ? owner : owner.toBase58();
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

// Resolve domains for addresses via Bonfida SNS + AllDomains TLD parser
async function resolveDomains(addresses: string[]): Promise<Record<string, string>> {
  const domains: Record<string, string> = {};
  const unique = [...new Set(addresses.filter(a => a && BASE58_REGEX.test(a)))].slice(0, 10);

  if (unique.length === 0) return domains;

  // 1. Try Bonfida SNS (.sol domains) in parallel
  const bonfidaResults = await Promise.allSettled(
    unique.map(async (addr) => {
      try {
        const response = await fetch(
          `https://sns-sdk-proxy.bonfida.workers.dev/domains/${addr}`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (!response.ok) return { addr, domain: null };
        const data = await response.json();
        if (data.s === "ok" && data.result && data.result.length > 0) {
          const sorted = data.result.sort(
            (a: { domain: string }, b: { domain: string }) => a.domain.length - b.domain.length
          );
          return { addr, domain: sorted[0].domain + ".sol" };
        }
        return { addr, domain: null };
      } catch {
        return { addr, domain: null };
      }
    })
  );

  for (const r of bonfidaResults) {
    if (r.status === "fulfilled" && r.value.domain) {
      domains[r.value.addr] = r.value.domain;
    }
  }

  // 2. For the searched wallet only, try AllDomains TLD parser (main domain first, then any domain)
  // Only resolve the first address to avoid RPC rate limits
  const unresolved = unique.filter(a => !domains[a]).slice(0, 5);
  if (unresolved.length > 0) {
    try {
      const connection = new Connection(HELIUS_RPC_URL);
      const parser = new TldParser(connection);

      await Promise.allSettled(
        unresolved.map(async (addr) => {
          try {
            const pubkey = new PublicKey(addr);
            // Try main domain first (user's preferred/set domain)
            try {
              const main = await parser.getMainDomain(pubkey);
              if (main && main.domain && main.tld) {
                domains[addr] = main.domain + main.tld;
                return;
              }
            } catch {
              // No main domain set, fall through
            }
            // Fallback: get all domains and pick shortest
            const userDomains = await parser.getParsedAllUserDomains(pubkey);
            if (userDomains && userDomains.length > 0) {
              const nonSol = userDomains.filter(d => !d.domain.endsWith(".sol"));
              const best = nonSol.length > 0
                ? nonSol.sort((a, b) => a.domain.length - b.domain.length)[0]
                : userDomains.sort((a, b) => a.domain.length - b.domain.length)[0];
              domains[addr] = best.domain;
            }
          } catch {
            // Best-effort
          }
        })
      );
    } catch {
      // AllDomains resolution is best-effort
    }
  }

  return domains;
}

// Dust threshold: transfers below this are likely spam
const DUST_THRESHOLD_SOL = 0.001; // 0.001 SOL

function filterSpamTransactions(transactions: ParsedTransaction[], walletAddress: string, rawTxs?: HeliusTransaction[]): ParsedTransaction[] {
  const filtered: ParsedTransaction[] = [];
  let dustCount = 0;
  let dustTotalSol = 0;
  const dustSenders = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const raw = rawTxs?.[i];

    // Detect multi-recipient spam: someone else sends tiny amounts to many wallets
    // Pattern: feePayer != wallet, "transferred a total X SOL to multiple accounts"
    if (tx.type === "TRANSFER" && raw && raw.feePayer !== walletAddress) {
      const walletReceived = (raw.nativeTransfers || [])
        .filter(t => t.toUserAccount === walletAddress)
        .reduce((sum, t) => sum + t.amount, 0) / 1e9;
      if (walletReceived > 0 && walletReceived < DUST_THRESHOLD_SOL) {
        dustCount++;
        dustTotalSol += walletReceived;
        if (raw.feePayer) dustSenders.add(raw.feePayer);
        continue;
      }
    }

    // Check if this is a dust transfer (tiny amount received)
    if (tx.type === "TRANSFER" && tx.to === walletAddress) {
      if (tx.amount.startsWith("< 0.0001")) {
        dustCount++;
        dustTotalSol += 0.00000001;
        if (tx.from) dustSenders.add(tx.from);
        continue;
      }
      const amountMatch = tx.amount.match(/([\d.e+-]+)\s*SOL/i);
      if (amountMatch) {
        const solAmount = parseFloat(amountMatch[1]);
        if (solAmount > 0 && solAmount < DUST_THRESHOLD_SOL) {
          dustCount++;
          dustTotalSol += solAmount;
          if (tx.from) dustSenders.add(tx.from);
          continue;
        }
      }
    }

    // Also catch cNFT spam mints (unsolicited compressed NFT mints)
    if ((tx.type === "COMPRESSED_NFT_MINT" || tx.type === "NFT_MINT") && raw && raw.feePayer !== walletAddress) {
      dustCount++;
      if (raw.feePayer) dustSenders.add(raw.feePayer);
      continue;
    }

    filtered.push(tx);
  }

  // If we filtered dust, add a single summary row
  if (dustCount > 0) {
    const dustDisplay = dustTotalSol > 0.0001
      ? `${floorTo4(dustTotalSol)} SOL`
      : `< 0.0001 SOL`;
    filtered.push({
      signature: `dust-summary-${Date.now()}`,
      timestamp: transactions[transactions.length - 1]?.timestamp || Math.floor(Date.now() / 1000),
      type: "SPAM",
      typeLabel: "Spam",
      description: `Filtered ${dustCount} spam transaction${dustCount > 1 ? "s" : ""} (${dustDisplay} total from ${dustSenders.size} source${dustSenders.size > 1 ? "s" : ""})`,
      amount: dustDisplay,
      from: dustSenders.size === 1 ? [...dustSenders][0] : "",
      to: walletAddress,
      fee: 0,
      source: "SPAM",
    });
  }

  return filtered;
}

function getMockTransactions(): ParsedTransaction[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      signature: "5xGh8K...mock1",
      timestamp: now - 120,
      type: "SWAP",
      typeLabel: "Swap",
      description: "Swapped 2.5 SOL for 142.8 USDC on Jupiter",
      amount: "2.5 SOL",
      from: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "JUP6Lk...aggregator",
      fee: 5000,
      source: "JUPITER",
    },
    {
      signature: "3mNp2Q...mock2",
      timestamp: now - 3600,
      type: "TRANSFER",
      typeLabel: "Transfer",
      description: "Sent 10.0 SOL",
      amount: "10.0 SOL",
      from: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "RecvWa11etYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      fee: 5000,
      source: "SYSTEM_PROGRAM",
    },
    {
      signature: "8dKm3P...mock3",
      timestamp: now - 5400,
      type: "DOMAIN",
      typeLabel: "Domain",
      description: "Bought a domain from AllDomains for 0.08 SOL",
      amount: "0.08 SOL",
      from: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
      fee: 5000,
      source: "ALLDOMAINS",
    },
    {
      signature: "7kRt5V...mock4",
      timestamp: now - 7200,
      type: "NFT_SALE",
      typeLabel: "NFT Sale",
      description: "Sold an NFT for 85.0 SOL on Magic Eden",
      amount: "85.0 SOL",
      from: "SellerXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "BuyerYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      fee: 5000,
      source: "MAGIC_EDEN",
    },
    {
      signature: "9pLm4W...mock5",
      timestamp: now - 14400,
      type: "STAKE_SOL",
      typeLabel: "Stake",
      description: "Staked 50.0 SOL",
      amount: "50.0 SOL",
      from: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "ValidatorZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
      fee: 5000,
      source: "STAKE_PROGRAM",
    },
  ];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  let isAddress = BASE58_REGEX.test(query);
  let resolvedAddress = query;
  let inputDomain: string | null = null;

  // If not a raw address, try resolving as a domain name
  if (!isAddress) {
    const resolved = await resolveDomainToAddress(query);
    if (resolved) {
      resolvedAddress = resolved;
      inputDomain = query;
      isAddress = true;
    } else {
      return NextResponse.json({
        query,
        isAddress: false,
        message:
          "Could not resolve domain. Try a wallet address or a domain like name.sol, name.abc, name.bonk",
        transactions: [],
      });
    }
  }

  if (!HELIUS_API_KEY) {
    return NextResponse.json({
      query,
      isAddress: true,
      address: resolvedAddress,
      inputDomain,
      demo: true,
      transactions: getMockTransactions(),
    });
  }

  try {
    const url = `https://api.helius.xyz/v0/addresses/${resolvedAddress}/transactions?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(url, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Helius API error:", response.status, errorText);

      if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limited. Please try again in a moment." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch transaction data" },
        { status: 502 }
      );
    }

    const rawTransactions: HeliusTransaction[] = await response.json();
    let transactions = rawTransactions.map(tx => classifyTransaction(tx, resolvedAddress));

    // Filter and collapse spam dust transfers
    transactions = filterSpamTransactions(transactions, resolvedAddress, rawTransactions);

    // Collect unique addresses: searched wallet + counterparties
    const addressSet = new Set<string>([resolvedAddress]);
    for (const tx of transactions) {
      if (tx.from && tx.from !== resolvedAddress) addressSet.add(tx.from);
      if (tx.to && tx.to !== resolvedAddress) addressSet.add(tx.to);
    }
    // Resolve domains (capped at 10 addresses)
    const domains = await resolveDomains([...addressSet]);

    // Attach domain to transactions
    for (const tx of transactions) {
      if (domains[tx.from]) tx.fromDomain = domains[tx.from];
      if (domains[tx.to]) tx.toDomain = domains[tx.to];
    }

    return NextResponse.json({
      query,
      isAddress: true,
      address: resolvedAddress,
      inputDomain,
      addressDomain: inputDomain || domains[resolvedAddress] || null,
      demo: false,
      transactions,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
