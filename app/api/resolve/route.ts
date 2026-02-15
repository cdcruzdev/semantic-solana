import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { TldParser } from "@onsol/tldparser";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : "https://api.mainnet-beta.solana.com";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Missing domain param" }, { status: 400 });
  }

  const cleaned = domain.trim().toLowerCase();
  let address: string | null = null;

  // Try .sol via Bonfida
  if (cleaned.endsWith(".sol")) {
    const name = cleaned.replace(/\.sol$/, "");
    try {
      const r = await fetch(
        `https://sns-sdk-proxy.bonfida.workers.dev/resolve/${name}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (r.ok) {
        const data = await r.json();
        if (data.s === "ok" && data.result) address = data.result;
      }
    } catch {}
  }

  // Try AllDomains TLD parser
  if (!address && cleaned.includes(".")) {
    try {
      const connection = new Connection(HELIUS_RPC_URL);
      const parser = new TldParser(connection);
      const owner = await parser.getOwnerFromDomainTld(cleaned);
      if (owner) {
        address = typeof owner === "string" ? owner : owner.toBase58();
      }
    } catch {}
  }

  if (!address) {
    return NextResponse.json({ resolved: false });
  }

  return NextResponse.json({
    resolved: true,
    domain: cleaned,
    address,
    truncated: address.slice(0, 4) + "..." + address.slice(-4),
  });
}
