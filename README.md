# Semantic Solana

A natural language search engine for Solana blockchain transactions. Paste a wallet address or type a domain name, and get back clean, human-readable transaction history instead of raw hex data and program IDs.

**Live:** [semantic-solana.vercel.app](https://semantic-solana.vercel.app)

---

## What It Does

Semantic Solana takes the raw output of Solana's transaction logs and translates it into plain descriptions. Instead of seeing a blob of program interactions and account addresses, you see:

- "Swapped 2.5 SOL for 142.8 USDC on Jupiter"
- "Deposited 1,200 USDC + 8.4 SOL into Raydium CLMM LP"
- "Set up DCA order for 500 USDC on Jupiter"
- "Bought cdcruz.abc for 0.08 SOL"
- "Closed perp position, received 42.3 USDC from Jupiter"

Every transaction gets a type badge, a smart description, token amounts, and counterparty addresses with domain resolution where available.

## Features

**Program Recognition**
Identifies 30+ Solana programs and routes transactions through specific classification logic. Covers Jupiter (aggregator, perps, DCA), Orca, Raydium, Raydium CLMM, Meteora, Magic Eden, Tensor, Pump.fun, Pump.fun AMM, Squads multisig, Marinade, Phoenix, Saber, Serum, FluxBeam, DFlow, and more.

**Domain Resolution**
Resolves Bonfida SNS domains (.sol) via their proxy API and AllDomains TLDs (.abc, .bonk, .id, .solana, .poor, .skr) via the on-chain TLD parser. Wallet addresses in results display their domain names when available. The search bar also accepts domains directly, with a live resolution dropdown as you type.

**Spam and Dust Filtering**
Incoming dust transfers and unsolicited cNFT mints below the threshold get collapsed into a single summary row ("Filtered 14 spam transactions, < 0.001 SOL total from 8 sources") instead of cluttering the feed.

**Filter and Sort Controls**
Filter pills for Swaps, Transfers, DeFi, NFTs, Domains, Spam, and Other. Each pill shows a count. Sort by newest, oldest, largest amount, or smallest amount.

**Color-Coded Type Badges**
Each transaction type gets a distinct badge color: green for swaps, blue for transfers, pink for domains, purple for NFTs and perps, yellow for staking and multisig, orange for withdrawals and unstaking.

**Mobile-First Responsive Design**
Card layout on mobile, table layout on desktop. Sticky header with inline search. Touch-friendly targets throughout.

## Tech Stack

- **Next.js 14** with App Router
- **Helius Enhanced Transactions API** for enriched transaction data
- **Bonfida SNS Proxy** for .sol domain resolution
- **@onsol/tldparser** for AllDomains TLD resolution (.abc, .bonk, .id, .solana, .poor, .skr)
- **@solana/web3.js** for RPC connections
- **Tailwind CSS v4** for styling
- **TypeScript** throughout

## Architecture

```
User Input (wallet address or domain)
        |
        v
  /api/resolve ──── Live domain resolution dropdown
        |            (Bonfida SNS + AllDomains TldParser)
        v
  /api/search
        |
        ├── Domain resolution (if input is not a base58 address)
        |     ├── Bonfida SNS proxy (.sol)
        |     └── AllDomains TldParser (other TLDs)
        |
        ├── Helius Enhanced Transactions API
        |     └── Returns enriched tx data with token transfers,
        |         swap events, NFT events, instructions
        |
        ├── Transaction classifier (classifyTransaction)
        |     ├── Detects protocol from instruction program IDs
        |     ├── Builds human-readable descriptions from token flows
        |     └── Handles 15+ transaction types with specific logic
        |
        ├── Spam filter (filterSpamTransactions)
        |     └── Collapses dust transfers and unsolicited mints
        |
        └── Reverse domain resolution (resolveDomains)
              └── Resolves counterparty addresses to domain names
```

The classifier works by inspecting the Helius enriched transaction data in layers: first it checks the transaction type and swap/NFT events, then falls back to analyzing raw token transfers and native transfers, then balance changes. Protocol detection walks the instruction tree looking for known program IDs, skipping infrastructure programs (System, Token, Compute Budget).

## Getting Started

### Prerequisites

- Node.js 18+
- A [Helius](https://helius.dev) API key (free tier works)

### Installation

```bash
git clone https://github.com/cdcruzdev/semantic-solana.git
cd semantic-solana
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```
HELIUS_API_KEY=your_helius_api_key_here
```

Without a Helius API key, the app runs in demo mode with mock transaction data.

The Helius RPC URL is also used for AllDomains TLD resolution. If no key is provided, it falls back to the public Solana mainnet RPC (which has stricter rate limits).

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Deployment

Built for Vercel. Push to GitHub and import the repo in Vercel. Add `HELIUS_API_KEY` as an environment variable in your project settings.

```bash
npx vercel --prod
```

## Roadmap

- **Transaction detail pages** (`/tx/<signature>`): Click any transaction to see a full breakdown with all token transfers, program interactions, and account changes. Currently links to Solscan as a bridge.
- **Pagination**: Load older transactions beyond the initial 100.
- **Search by token**: Find all transactions involving a specific token mint.
- **Wallet analytics**: Summary stats like total volume, most-used protocols, and token holdings.
- **More program coverage**: Continuously adding new Solana programs as the ecosystem grows.

## License

MIT
