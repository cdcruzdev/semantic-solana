import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Anybody } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "Semantic Solana",
  description:
    "Search any Solana wallet and get plain-English transaction descriptions. Understand swaps, transfers, LP deposits, domain purchases, and more at a glance.",
  keywords: ["solana", "blockchain", "explorer", "transaction", "wallet", "search", "domain", "defi"],
  authors: [{ name: "cdcruzdev" }],
  openGraph: {
    title: "Semantic Solana",
    description: "Human-readable Solana transaction search. Paste a wallet or domain, get plain English.",
    url: "https://semantic-solana.vercel.app",
    siteName: "Semantic Solana",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Semantic Solana",
    description: "Human-readable Solana transaction search. Paste a wallet or domain, get plain English.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${anybody.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
