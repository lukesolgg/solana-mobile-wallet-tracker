import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';
import type { NFTAsset } from '../types';

const GRID_GAP = 8;
const PADDING = 16;
const COLS = 3;
const itemWidth = (Dimensions.get('window').width - PADDING * 2 - GRID_GAP * (COLS - 1)) / COLS;

interface Props {
  nfts: NFTAsset[];
}

export const NFTGrid: React.FC<Props> = ({ nfts }) => {
  const { colors } = useAppTheme();

  if (nfts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No NFTs found</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {nfts.map((nft) => (
        <View
          key={nft.mint}
          style={[styles.nftCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.nftImage, { backgroundColor: colors.primary + '15' }]}>
            <Text style={{ fontSize: 24 }}>🖼</Text>
          </View>
          <Text style={[styles.nftName, { color: colors.text }]} numberOfLines={1}>
            {nft.name}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    gap: GRID_GAP,
  },
  empty: { alignItems: 'center', padding: 20 },
  nftCard: {
    width: itemWidth,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  nftImage: {
    width: '100%',
    height: itemWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nftName: { fontSize: 11, fontWeight: '600', padding: 6 },
});
