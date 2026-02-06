import { useQuery } from '@tanstack/react-query';
import { fetchWalletData, fetchSolBalance } from '../services/solanaService';

export function useWalletData(address: string | null) {
  return useQuery({
    queryKey: ['walletData', address],
    queryFn: () => fetchWalletData(address!),
    enabled: !!address,
  });
}

export function useSolBalance(address: string | null) {
  return useQuery({
    queryKey: ['solBalance', address],
    queryFn: () => fetchSolBalance(address!),
    enabled: !!address,
  });
}
