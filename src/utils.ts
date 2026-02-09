import { PublicKey, Connection } from '@solana/web3.js';

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return address.length >= 32 && address.length <= 44;
  } catch {
    return false;
  }
}

/**
 * Check if input looks like a .sol or .skr domain
 */
export function isDomainName(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  return trimmed.endsWith('.sol') || trimmed.endsWith('.skr');
}

/**
 * Resolve a .sol domain to a Solana address using Bonfida SNS API
 * Resolve a .skr domain using Solana Mobile Seeker resolution
 */
export async function resolveDomain(domain: string): Promise<string | null> {
  const trimmed = domain.trim().toLowerCase();

  if (trimmed.endsWith('.sol')) {
    return resolveSolDomain(trimmed);
  }

  if (trimmed.endsWith('.skr')) {
    return resolveSkrDomain(trimmed);
  }

  return null;
}

function extractAddress(result: unknown): string | null {
  if (typeof result === 'string') return result.trim();
  if (Array.isArray(result) && result.length > 0) return String(result[0]).trim();
  return null;
}

async function resolveSolDomain(domain: string): Promise<string | null> {
  try {
    // Use Bonfida's public API for .sol resolution
    const name = domain.replace('.sol', '');
    const response = await fetch(
      `https://sns-sdk-proxy.bonfida.workers.dev/resolve/${name}`,
    );
    const data = await response.json();

    const addr1 = extractAddress(data?.result);
    if (addr1) return addr1;

    // Fallback: try the SNS API v2
    const response2 = await fetch(
      `https://sns-api.bonfida.com/v2/resolve/${name}`,
    );
    const data2 = await response2.json();

    const addr2 = extractAddress(data2?.result);
    if (addr2) return addr2;

    return null;
  } catch (error) {
    console.warn('[resolveSolDomain] Failed:', error);
    return null;
  }
}

async function resolveSkrDomain(domain: string): Promise<string | null> {
  try {
    // .skr domains resolve ONLY through AllDomains API
    // (Bonfida SNS is for .sol only — sending a .skr name there returns the wrong address)
    const response = await fetch(
      `https://api.alldomains.id/domain/${domain}`,
    );
    const data = await response.json();
    console.log('[resolveSkrDomain] AllDomains response:', JSON.stringify(data));

    const addr = extractAddress(data?.owner);
    if (addr) return addr;

    return null;
  } catch (error) {
    console.warn('[resolveSkrDomain] Failed:', error);
    return null;
  }
}
