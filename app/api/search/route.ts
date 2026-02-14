import { NextRequest, NextResponse } from "next/server";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// Base58 character set for Solana addresses
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
  fee: number;
  source: string;
}

function classifyTransaction(tx: HeliusTransaction): ParsedTransaction {
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
    LOAN: "Loan",
    REPAY_LOAN: "Repay Loan",
    ADD_LIQUIDITY: "Add Liquidity",
    REMOVE_LIQUIDITY: "Remove Liquidity",
    UNKNOWN: "Transaction",
  };

  const typeLabel = typeLabels[type] || type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  // Build description
  let description = tx.description || "";
  let amount = "";
  let from = tx.feePayer || "";
  let to = "";

  // Extract transfer details
  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
    const transfer = tx.nativeTransfers[0];
    from = transfer.fromUserAccount;
    to = transfer.toUserAccount;
    const solAmount = transfer.amount / 1e9;
    if (solAmount > 0) {
      amount = `${solAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
    }
  }

  // Token transfers override
  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    const transfer = tx.tokenTransfers[0];
    from = transfer.fromUserAccount || from;
    to = transfer.toUserAccount || to;
    if (transfer.tokenAmount > 0) {
      amount = `${transfer.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens`;
    }
  }

  // Generate human-readable description if Helius didn't provide one
  if (!description) {
    switch (type) {
      case "TRANSFER":
        description = amount
          ? `Transferred ${amount}`
          : "Transferred funds";
        break;
      case "SWAP":
        description = "Swapped tokens";
        if (tx.events?.swap) {
          const swap = tx.events.swap;
          if (swap.nativeInput) {
            const solIn = Number(swap.nativeInput.amount) / 1e9;
            description = `Swapped ${solIn.toFixed(4)} SOL for tokens`;
          } else if (swap.nativeOutput) {
            const solOut = Number(swap.nativeOutput.amount) / 1e9;
            description = `Swapped tokens for ${solOut.toFixed(4)} SOL`;
          }
        }
        break;
      case "NFT_SALE":
        description = tx.events?.nft?.description || "NFT sold";
        break;
      case "NFT_MINT":
      case "COMPRESSED_NFT_MINT":
        description = "Minted an NFT";
        break;
      case "STAKE_SOL":
        description = amount ? `Staked ${amount}` : "Staked SOL";
        break;
      case "UNSTAKE_SOL":
        description = amount ? `Unstaked ${amount}` : "Unstaked SOL";
        break;
      default:
        description = typeLabel;
    }
  }

  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
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

function getMockTransactions(): ParsedTransaction[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      signature: "5xGh8K...mock1",
      timestamp: now - 120,
      type: "SWAP",
      typeLabel: "Swap",
      description: "Swapped 2.5 SOL for 142.8 USDC via Jupiter",
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
      description: "Transferred 10.0 SOL to another wallet",
      amount: "10.0 SOL",
      from: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "RecvWa11etYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      fee: 5000,
      source: "SYSTEM_PROGRAM",
    },
    {
      signature: "7kRt5V...mock3",
      timestamp: now - 7200,
      type: "NFT_SALE",
      typeLabel: "NFT Sale",
      description: "Sold DeGod #4521 for 85.0 SOL on Magic Eden",
      amount: "85.0 SOL",
      from: "SellerXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "BuyerYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      fee: 5000,
      source: "MAGIC_EDEN",
    },
    {
      signature: "9pLm4W...mock4",
      timestamp: now - 14400,
      type: "STAKE_SOL",
      typeLabel: "Stake",
      description: "Staked 50.0 SOL with a validator",
      amount: "50.0 SOL",
      from: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "ValidatorZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
      fee: 5000,
      source: "STAKE_PROGRAM",
    },
    {
      signature: "2cBn8X...mock5",
      timestamp: now - 28800,
      type: "TOKEN_MINT",
      typeLabel: "Token Mint",
      description: "Minted 1,000,000 tokens",
      amount: "1,000,000 tokens",
      from: "MintAuthXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      to: "DemoWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      fee: 5000,
      source: "TOKEN_PROGRAM",
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

  // Detect if query is a wallet address
  const isAddress = BASE58_REGEX.test(query);

  if (!isAddress) {
    // For natural language queries, return helpful message
    return NextResponse.json({
      query,
      isAddress: false,
      message:
        "Natural language search requires a valid Solana wallet address. Paste a base58 address to search.",
      transactions: [],
    });
  }

  // If no API key, return mock data
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
    const transactions = rawTransactions.map(classifyTransaction);

    return NextResponse.json({
      query,
      isAddress: true,
      address: query,
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
