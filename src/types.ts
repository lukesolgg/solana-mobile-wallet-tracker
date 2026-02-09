export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  logoUri?: string;
  priceUsd?: number;
  valueUsd?: number;
  change24h?: number;
  /** true if token was found on DexScreener (has liquidity/pairs) */
  verified: boolean;
}

export interface NFTAsset {
  mint: string;
  name: string;
  image: string;
  collection?: string;
  description?: string;
}

export interface TransactionInfo {
  signature: string;
  timestamp: number | null;
  type: 'transfer' | 'swap' | 'nft' | 'unknown';
  status: 'success' | 'failed';
  fee: number;
  amount?: number;
  direction?: 'in' | 'out';
  counterparty?: string;
}

export interface StakedToken {
  symbol: string;
  name: string;
  stakedAmount: number;
  logoUri?: string;
  priceUsd?: number;
  valueUsd?: number;
}

export interface WalletData {
  address: string;
  solBalance: number;
  solPriceUsd: number;
  totalValueUsd: number;
  tokens: TokenBalance[];
  nfts: NFTAsset[];
  transactions: TransactionInfo[];
  stakedTokens: StakedToken[];
  /** SOL balance history points for chart (oldest → newest) */
  balanceHistory: number[];
  lastUpdated: number;
}

export interface SavedAddress {
  id: string;
  address: string;
  label: string;
  notificationsEnabled: boolean;
  addedAt: number;
}

export interface RewardAction {
  type: 'search' | 'save' | 'kol_view' | 'swap' | 'connect' | 'daily_login' | 'token_detail';
  timestamp: number;
  points: number;
  label?: string;
}

export interface RewardsData {
  totalPoints: number;
  actions: RewardAction[];
  connectedWallet?: string;
  dailyLoginDates: string[]; // YYYY-MM-DD
}

export type RewardLevel = 'Explorer' | 'Tracker' | 'Analyst' | 'Whale Watcher';

export const REWARD_LEVELS: { name: RewardLevel; minPoints: number; icon: string }[] = [
  { name: 'Explorer', minPoints: 0, icon: '🔍' },
  { name: 'Tracker', minPoints: 51, icon: '📡' },
  { name: 'Analyst', minPoints: 201, icon: '📊' },
  { name: 'Whale Watcher', minPoints: 501, icon: '🐋' },
];

export const POINTS_MAP = {
  search: 1,
  save: 5,
  kol_view: 2,
  swap: 10,
  connect: 20,
  daily_login: 5,
  token_detail: 1,
} as const;
