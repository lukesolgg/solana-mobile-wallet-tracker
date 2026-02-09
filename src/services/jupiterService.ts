// src/services/jupiterService.ts

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const JUPITER_TOKEN_LIST = 'https://token.jup.ag/strict';

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

export interface PopularToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

// Popular tokens for quick selection
export const POPULAR_TOKENS: PopularToken[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  {
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
  },
  {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
  },
  {
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    symbol: 'WIF',
    name: 'dogwifhat',
    decimals: 6,
    logoURI: 'https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betiber557wruw5742bu4.ipfs.nftstorage.link',
  },
  {
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter',
    decimals: 6,
    logoURI: 'https://static.jup.ag/jup/icon.png',
  },
];

/**
 * Get a swap quote from Jupiter V6 API
 */
export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: string, // in lamports / smallest unit
  slippageBps: number = 50,
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: slippageBps.toString(),
    swapMode: 'ExactIn',
  });

  const res = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jupiter quote failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Get the serialized swap transaction from Jupiter
 */
export async function getSwapTransaction(
  quoteResponse: JupiterQuote,
  userPublicKey: string,
): Promise<string> {
  const res = await fetch(`${JUPITER_QUOTE_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jupiter swap transaction failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.swapTransaction; // base64-encoded serialized transaction
}

/**
 * Search the Jupiter strict token list
 */
export async function searchTokens(query: string): Promise<PopularToken[]> {
  try {
    const res = await fetch(JUPITER_TOKEN_LIST);
    if (!res.ok) return [];
    const tokens: PopularToken[] = await res.json();
    const q = query.toLowerCase();
    return tokens
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.address === query,
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}

/**
 * Format token amount for display (from smallest unit to UI amount)
 */
export function formatTokenAmount(amount: string, decimals: number): string {
  const num = Number(amount) / Math.pow(10, decimals);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  return num.toFixed(10);
}

/**
 * Convert UI amount to lamports/smallest unit
 */
export function toSmallestUnit(amount: number, decimals: number): string {
  return Math.floor(amount * Math.pow(10, decimals)).toString();
}
