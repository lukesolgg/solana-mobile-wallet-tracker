export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  logoUri?: string;
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

export interface WalletData {
  address: string;
  solBalance: number;
  tokens: TokenBalance[];
  nfts: NFTAsset[];
  transactions: TransactionInfo[];
  lastUpdated: number;
}

export interface SavedAddress {
  id: string;
  address: string;
  label: string;
  notificationsEnabled: boolean;
  addedAt: number;
}
