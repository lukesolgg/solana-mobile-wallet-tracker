// src/services/solanaService.ts

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from '@solana/web3.js';
import { PublicKey as SplPublicKey } from '@solana/web3.js';

// Hardcode TOKEN_PROGRAM_ID to avoid @solana/spl-token import issues in React Native
const TOKEN_PROGRAM_ID = new SplPublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
import type {
  TokenBalance,
  NFTAsset,
  TransactionInfo,
  WalletData,
} from '../types';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RPC_ENDPOINTS = {
  mainnet: `https://mainnet.helius-rpc.com/?api-key=${CONFIG.HELIUS_API_KEY}`,
  devnet: 'https://api.devnet.solana.com',
};

// Switch to 'mainnet' for production, 'devnet' for testing
const ACTIVE_NETWORK: keyof typeof RPC_ENDPOINTS = 'mainnet';

let connection: Connection;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_ENDPOINTS[ACTIVE_NETWORK], {
      commitment: 'confirmed',
    });
  }
  return connection;
}

// ---------------------------------------------------------------------------
// SOL Balance
// ---------------------------------------------------------------------------

export async function fetchSolBalance(address: string): Promise<number> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);
  const lamports = await conn.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

// ---------------------------------------------------------------------------
// Token Balances (SPL)
// ---------------------------------------------------------------------------

/** Known token registry (expand or fetch from a token-list API) */
const TOKEN_META: Record<string, { symbol: string; name: string; logoUri?: string }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: 'USDC',
    name: 'USD Coin',
    logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: 'USDT',
    name: 'Tether USD',
    logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
  },
  So11111111111111111111111111111111111111112: {
    symbol: 'wSOL',
    name: 'Wrapped SOL',
  },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
    symbol: 'JUP',
    name: 'Jupiter',
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    symbol: 'BONK',
    name: 'Bonk',
  },
};

export async function fetchTokenBalances(address: string): Promise<TokenBalance[]> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);

  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID,
  });

  const tokens: TokenBalance[] = tokenAccounts.value
    .map((ta) => {
      const info = ta.account.data.parsed.info;
      const mint: string = info.mint;
      const amount: number = Number(info.tokenAmount.amount);
      const decimals: number = info.tokenAmount.decimals;
      const uiAmount: number = info.tokenAmount.uiAmount ?? 0;

      if (uiAmount === 0) return null; // skip zero balances

      const meta = TOKEN_META[mint];

      return {
        mint,
        symbol: meta?.symbol ?? shortenMint(mint),
        name: meta?.name ?? 'Unknown Token',
        amount,
        decimals,
        uiAmount,
        logoUri: meta?.logoUri,
      } as TokenBalance;
    })
    .filter(Boolean) as TokenBalance[];

  // Sort by uiAmount descending (proxy for value without price feed)
  tokens.sort((a, b) => b.uiAmount - a.uiAmount);

  return tokens;
}

function shortenMint(mint: string): string {
  return mint.slice(0, 4) + '…';
}

// ---------------------------------------------------------------------------
// NFTs — uses DAS (Digital Asset Standard) API on Helius / Shyft / RPC
// Falls back to getParsedTokenAccountsByOwner for basic detection
// ---------------------------------------------------------------------------

export async function fetchNFTs(address: string): Promise<NFTAsset[]> {
  // Try DAS API first (works with Helius/Triton RPCs that support getAssetsByOwner)
  try {
    return await fetchNFTsViaDAS(address);
  } catch {
    // Fallback: detect NFTs from token accounts (amount=1, decimals=0)
    return fetchNFTsFallback(address);
  }
}

async function fetchNFTsViaDAS(address: string): Promise<NFTAsset[]> {
  const conn = getConnection();
  // DAS is a JSON-RPC extension — not all RPCs support it
  const response = await (conn as any)._rpcRequest('getAssetsByOwner', {
    ownerAddress: address,
    page: 1,
    limit: 50,
    displayOptions: { showFungible: false },
  });

  if (!response?.result?.items) throw new Error('DAS not supported');

  return response.result.items.map((item: any) => ({
    mint: item.id,
    name: item.content?.metadata?.name ?? 'Unnamed NFT',
    image:
      item.content?.links?.image ??
      item.content?.files?.[0]?.uri ??
      '',
    collection: item.grouping?.[0]?.group_value,
    description: item.content?.metadata?.description,
  }));
}

async function fetchNFTsFallback(address: string): Promise<NFTAsset[]> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);

  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID,
  });

  const nftMints = tokenAccounts.value
    .filter((ta) => {
      const info = ta.account.data.parsed.info;
      return (
        Number(info.tokenAmount.amount) === 1 &&
        info.tokenAmount.decimals === 0
      );
    })
    .map((ta) => ta.account.data.parsed.info.mint as string);

  // Return basic NFT stubs — metadata fetching via Metaplex would go here
  return nftMints.slice(0, 30).map((mint) => ({
    mint,
    name: `NFT ${shortenMint(mint)}`,
    image: '', // Would be fetched from on-chain metadata URI
  }));
}

// ---------------------------------------------------------------------------
// Recent Transactions
// ---------------------------------------------------------------------------

export async function fetchTransactions(
  address: string,
  limit = 15,
): Promise<TransactionInfo[]> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);

  const signatures: ConfirmedSignatureInfo[] =
    await conn.getSignaturesForAddress(pubkey, { limit });

  const txInfos: TransactionInfo[] = [];

  // Fetch parsed details in batches
  const batchSize = 5;
  for (let i = 0; i < signatures.length; i += batchSize) {
    const batch = signatures.slice(i, i + batchSize);
    const parsed = await Promise.allSettled(
      batch.map((sig) =>
        conn.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        }),
      ),
    );

    parsed.forEach((result, idx) => {
      const sig = batch[idx];
      if (result.status === 'fulfilled' && result.value) {
        txInfos.push(parseTxInfo(result.value, sig, address));
      } else {
        txInfos.push({
          signature: sig.signature,
          timestamp: sig.blockTime ?? null,
          type: 'unknown',
          status: sig.err ? 'failed' : 'success',
          fee: 0,
        });
      }
    });
  }

  return txInfos;
}

function parseTxInfo(
  tx: ParsedTransactionWithMeta,
  sig: ConfirmedSignatureInfo,
  walletAddress: string,
): TransactionInfo {
  const fee = (tx.meta?.fee ?? 0) / LAMPORTS_PER_SOL;
  const status: 'success' | 'failed' = tx.meta?.err ? 'failed' : 'success';

  // Detect SOL transfer amount
  let amount: number | undefined;
  let direction: 'in' | 'out' | undefined;
  let counterparty: string | undefined;
  let type: TransactionInfo['type'] = 'unknown';

  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];
  const accountKeys = tx.transaction.message.accountKeys;

  const walletIdx = accountKeys.findIndex(
    (k) => k.pubkey.toBase58() === walletAddress,
  );

  if (walletIdx >= 0 && preBalances[walletIdx] !== undefined) {
    const diff =
      (postBalances[walletIdx] - preBalances[walletIdx]) / LAMPORTS_PER_SOL;
    if (Math.abs(diff) > 0.000001) {
      amount = Math.abs(diff);
      direction = diff > 0 ? 'in' : 'out';
      type = 'transfer';
    }
  }

  // Try to find counterparty
  if (walletIdx === 0 && accountKeys.length > 1) {
    counterparty = accountKeys[1].pubkey.toBase58();
  } else if (walletIdx > 0) {
    counterparty = accountKeys[0].pubkey.toBase58();
  }

  return {
    signature: sig.signature,
    timestamp: sig.blockTime ?? null,
    type,
    status,
    fee,
    amount,
    direction,
    counterparty,
  };
}

// ---------------------------------------------------------------------------
// Full Wallet Data (aggregated)
// ---------------------------------------------------------------------------

export async function fetchWalletData(address: string): Promise<WalletData> {
  console.log('[SolanaService] fetchWalletData called for:', address);

  try {
    const solBalance = await fetchSolBalance(address);
    console.log('[SolanaService] SOL balance:', solBalance);

    let tokens: TokenBalance[] = [];
    try {
      tokens = await fetchTokenBalances(address);
    } catch (e) {
      console.warn('[SolanaService] Token fetch failed:', e);
    }

    let nfts: NFTAsset[] = [];
    try {
      nfts = await fetchNFTs(address);
    } catch (e) {
      console.warn('[SolanaService] NFT fetch failed:', e);
    }

    let transactions: TransactionInfo[] = [];
    try {
      transactions = await fetchTransactions(address);
    } catch (e) {
      console.warn('[SolanaService] Tx fetch failed:', e);
    }

    return {
      address,
      solBalance,
      tokens,
      nfts,
      transactions,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('[SolanaService] fetchWalletData ERROR:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Subscribe to account changes (WebSocket for notifications)
// ---------------------------------------------------------------------------

export function subscribeToAccount(
  address: string,
  callback: (lamports: number) => void,
): number {
  const conn = getConnection();
  const pubkey = new PublicKey(address);
  return conn.onAccountChange(pubkey, (accountInfo) => {
    callback(accountInfo.lamports);
  });
}

export function unsubscribeFromAccount(subscriptionId: number): void {
  const conn = getConnection();
  conn.removeAccountChangeListener(subscriptionId);
}
