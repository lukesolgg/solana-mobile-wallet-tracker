// src/screens/SavedScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../hooks/useTheme';
import { useSavedAddresses } from '../hooks/useSavedAddresses';
import { useSolBalance } from '../hooks/useWalletData';
import { isValidSolanaAddress, shortenAddress } from '../utils';
import type { SavedAddress } from '../types';
import { GlowBackground } from '../components/GlowBackground';

const SavedAddressCard: React.FC<{
  item: SavedAddress;
  onRemove: (id: string) => void;
  onRename: (id: string, newLabel: string) => void;
  onToggleNotification: (id: string, enabled: boolean) => void;
}> = ({ item, onRemove, onRename, onToggleNotification }) => {
  const { colors } = useAppTheme();
  const { data: balance, isLoading } = useSolBalance(item.address);

  const handleRemove = () => {
    Alert.alert('Remove Address', `Remove "${item.label}" from saved list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove(item.id) },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
          <Text style={[styles.address, { color: colors.textSecondary }]}>
            {shortenAddress(item.address, 6)}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={handleRemove} style={styles.actionBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.balanceRow}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Text style={[styles.balanceText, { color: colors.text }]}>
            {balance !== undefined
              ? `${balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`
              : 'Unable to fetch'}
          </Text>
        )}
      </View>

      <View style={[styles.notifRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.notifLabel, { color: colors.textSecondary }]}>
          Tx Notifications
        </Text>
        <TouchableOpacity
          style={[
            styles.toggle,
            {
              backgroundColor: item.notificationsEnabled
                ? colors.primary
                : colors.textSecondary + '40',
            },
          ]}
          onPress={() => onToggleNotification(item.id, !item.notificationsEnabled)}
        >
          <View
            style={[
              styles.toggleDot,
              {
                backgroundColor: '#FFF',
                transform: [{ translateX: item.notificationsEnabled ? 16 : 0 }],
              },
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const SavedScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { addresses, loading, add, remove, update } = useSavedAddresses();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = newAddress.trim();
    if (!isValidSolanaAddress(trimmed)) {
      setAddError('Invalid Solana address');
      return;
    }
    add(trimmed, newLabel.trim() || undefined);
    setNewAddress('');
    setNewLabel('');
    setAddError('');
    setShowAddModal(false);
  }, [newAddress, newLabel, add]);

  const handleRename = useCallback(
    (id: string, newLabelText: string) => {
      update(id, { label: newLabelText });
    },
    [update],
  );

  const handleToggleNotification = useCallback(
    (id: string, enabled: boolean) => {
      update(id, { notificationsEnabled: enabled });
      if (enabled) {
        Alert.alert(
          'Notifications Enabled',
          'You\'ll be notified of new transactions above 0.1 SOL.',
        );
      }
    },
    [update],
  );

  return (
    <GlowBackground>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Saved</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.card }]}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="bookmark-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No saved addresses yet. Search for a wallet and tap the bookmark to save it.
          </Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SavedAddressCard
              item={item}
              onRemove={remove}
              onRename={handleRename}
              onToggleNotification={handleToggleNotification}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Wallet Address</Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: addError ? colors.error : colors.border,
                },
              ]}
              placeholder="Solana wallet address"
              placeholderTextColor={colors.textSecondary}
              value={newAddress}
              onChangeText={(t) => {
                setNewAddress(t);
                if (addError) setAddError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!addError && (
              <Text style={[styles.modalError, { color: colors.error }]}>{addError}</Text>
            )}

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Label (optional)"
              placeholderTextColor={colors.textSecondary}
              value={newLabel}
              onChangeText={setNewLabel}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowAddModal(false);
                  setAddError('');
                }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleAdd}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GlowBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  cardHeaderLeft: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700' },
  address: { fontSize: 13, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 4 },
  balanceRow: { paddingHorizontal: 16, paddingBottom: 12 },
  balanceText: { fontSize: 22, fontWeight: '700' },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notifLabel: { fontSize: 13 },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  modalError: { fontSize: 12, marginBottom: 8, marginTop: -4 },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
