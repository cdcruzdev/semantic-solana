import { NextRequest, NextResponse } from "next/server";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
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

function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol === 0) return "0 SOL";
  if (sol < 0.0001) return `${sol.toExponential(2)} SOL`;
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 6 })} SOL`;
}

function formatTokenAmount(amount: number | undefined | null, mint: string): string {
  const token = KNOWN_TOKENS[mint];
  const symbol = token?.symbol || "tokens";
  if (!amount || amount === 0) return `0 ${symbol}`;
  if (amount < 0.0001) return `${amount.toExponential(2)} ${symbol}`;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
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

  // Source label
  const sourceName = getProgramName(tx.source) || tx.source || "";

  // Build description based on type
  switch (type) {
    case "SWAP": {
      typeLabel = "Swap";
      const swap = tx.events?.swap;
      if (swap) {
        let inputStr = "";
        let outputStr = "";

        if (swap.nativeInput) {
          inputStr = formatSol(Number(swap.nativeInput.amount));
        } else if (swap.tokenInputs && swap.tokenInputs.length > 0) {
          const inp = swap.tokenInputs[0];
          inputStr = formatTokenAmount(inp.tokenAmount, inp.mint);
        } else if (totalNativeSent > 0) {
          inputStr = formatSol(totalNativeSent);
        }

        if (swap.nativeOutput) {
          outputStr = formatSol(Number(swap.nativeOutput.amount));
        } else if (swap.tokenOutputs && swap.tokenOutputs.length > 0) {
          const out = swap.tokenOutputs[0];
          outputStr = formatTokenAmount(out.tokenAmount, out.mint);
        } else if (totalNativeReceived > 0) {
          outputStr = formatSol(totalNativeReceived);
        }

        if (inputStr && outputStr) {
          description = `Swapped ${inputStr} for ${outputStr}`;
          amount = inputStr;
        } else if (inputStr) {
          description = `Swapped ${inputStr}`;
          amount = inputStr;
        } else {
          description = "Swapped tokens";
        }
        if (sourceName) description += ` on ${sourceName}`;
      } else {
        description = "Swapped tokens";
        if (sourceName) description += ` on ${sourceName}`;
      }
      break;
    }

    case "TRANSFER": {
      if (domainService) {
        // Domain purchase
        typeLabel = "Domain";
        const cost = totalNativeSent > 0 ? formatSol(totalNativeSent) : "";
        description = cost
          ? `Bought a domain from ${domainService} for ${cost}`
          : `Registered a domain via ${domainService}`;
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
      // Closing token accounts reclaims rent
      const reclaimedSol = totalNativeReceived > 0 ? formatSol(totalNativeReceived) : "";
      if (tokensSent.length > 0 || tokensReceived.length > 0) {
        const tokenAmt = tokensReceived.length > 0
          ? formatTokenAmount(tokensReceived[0].amount, tokensReceived[0].mint)
          : tokensSent.length > 0
            ? formatTokenAmount(tokensSent[0].amount, tokensSent[0].mint)
            : "";
        description = tokenAmt
          ? `Closed token account, reclaimed ${reclaimedSol || "rent"} (had ${tokenAmt})`
          : `Closed token account${reclaimedSol ? `, reclaimed ${reclaimedSol}` : ""}`;
      } else {
        description = `Closed account${reclaimedSol ? `, reclaimed ${reclaimedSol}` : ""}`;
      }
      amount = reclaimedSol;
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

    default: {
      // Check if domain related even with UNKNOWN type
      if (domainService) {
        typeLabel = "Domain";
        const cost = totalNativeSent > 0 ? formatSol(totalNativeSent) : "";
        description = cost
          ? `Domain transaction via ${domainService} for ${cost}`
          : `Domain transaction via ${domainService}`;
        amount = cost;
      } else if (tx.description) {
        description = tx.description;
      } else {
        // Best effort from transfers
        if (totalNativeSent > 0 && totalNativeReceived === 0) {
          description = `Sent ${formatSol(totalNativeSent)}`;
          amount = formatSol(totalNativeSent);
        } else if (totalNativeReceived > 0 && totalNativeSent === 0) {
          description = `Received ${formatSol(totalNativeReceived)}`;
          amount = formatSol(totalNativeReceived);
        } else {
          description = typeLabel;
        }
        if (sourceName && description !== typeLabel) description += ` via ${sourceName}`;
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
    type: domainService ? "DOMAIN" : type,
    typeLabel,
    description,
    amount,
    from,
    to,
    fee: tx.fee,
    source: tx.source || "UNKNOWN",
  };
}

// Resolve domains for addresses using multiple services
async function resolveDomains(addresses: string[]): Promise<Record<string, string>> {
  const domains: Record<string, string> = {};
  const unique = [...new Set(addresses.filter(a => a && BASE58_REGEX.test(a)))];

  if (unique.length === 0 || !HELIUS_API_KEY) return domains;

  // Use Helius DAS API to check for domain names
  // Try fetching .sol domains from Helius
  try {
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${unique[0]}/names?api-key=${HELIUS_API_KEY}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.domainNames && data.domainNames.length > 0) {
        domains[unique[0]] = data.domainNames[0] + ".sol";
      }
    }
  } catch {
    // Domain resolution is best-effort
  }

  return domains;
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

  const isAddress = BASE58_REGEX.test(query);

  if (!isAddress) {
    return NextResponse.json({
      query,
      isAddress: false,
      message:
        "Paste a valid Solana wallet address to search transactions.",
      transactions: [],
    });
  }

  if (!HELIUS_API_KEY) {
    return NextResponse.json({
      query,
      isAddress: true,
      address: query,
      demo: true,
      transactions: getMockTransactions(),
    });
  }

  try {
    const url = `https://api.helius.xyz/v0/addresses/${query}/transactions?api-key=${HELIUS_API_KEY}`;
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
    const transactions = rawTransactions.map(tx => classifyTransaction(tx, query));

    // Try to resolve domains for the searched wallet
    const allAddresses = [query];
    const domains = await resolveDomains(allAddresses);

    // Attach domain to transactions
    for (const tx of transactions) {
      if (domains[tx.from]) tx.fromDomain = domains[tx.from];
      if (domains[tx.to]) tx.toDomain = domains[tx.to];
    }

    return NextResponse.json({
      query,
      isAddress: true,
      address: query,
      addressDomain: domains[query] || null,
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
