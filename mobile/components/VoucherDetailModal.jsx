import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Spacing, Fonts } from '@/constants/appTheme';
import { API_BASE_URL } from '@/constants/config';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

const COMPANY_NAMES = {
  'MP': 'Millennium Plaza',
  'AST': 'Arcadia Shipping and Trading',
  'AE': 'Arcadia Engineering'
};

export default function VoucherDetailModal({ visible, onClose, voucher, onImagePress }) {
  const Colors = useTheme();
  const insets = useSafeAreaInsets();

  if (!voucher) return null;

  const { voucherData, fileUrl, createdAt } = voucher;
  const images = fileUrl ? fileUrl.split(',') : [];
  const formattedDate = createdAt ? format(new Date(createdAt), 'dd MMMM yyyy') : 'N/A';
  const fullCompanyName = COMPANY_NAMES[voucherData.company] || voucherData.company;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: Colors.bgPrimary, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: Colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Voucher Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}>
          {/* Status Badge */}
          <View style={styles.statusSection}>
            <View style={[styles.statusBadge, { backgroundColor: voucherData.status === 'APPROVED' ? '#4CAF50' : voucherData.status === 'DENIED' ? '#F44336' : Colors.accent }]}>
              <Text style={styles.statusText}>{voucherData.status}</Text>
            </View>
            <Text style={[styles.voucherNumber, { color: Colors.textSecondary }]}>Voucher #{voucherData.number}</Text>
          </View>

          {/* Main Info Card */}
          <View style={[styles.card, { backgroundColor: Colors.bgSecondary, borderColor: Colors.border }]}>
            <View style={styles.infoRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: Colors.textMuted }]}>COMPANY</Text>
                <Text style={[styles.value, { color: Colors.textPrimary }]} numberOfLines={2}>{fullCompanyName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginLeft: Spacing.md }}>
                <Text style={[styles.label, { color: Colors.textMuted }]}>DATE</Text>
                <Text style={[styles.value, { color: Colors.textPrimary }]}>{formattedDate}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: Colors.border }]} />

            <View style={styles.amountSection}>
              <Text style={[styles.label, { color: Colors.textMuted }]}>AMOUNT</Text>
              <Text style={[styles.amount, { color: Colors.accent }]}>₹{voucherData.amount.toLocaleString('en-IN')}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: Colors.border }]} />

            <View style={styles.narrationSection}>
              <Text style={[styles.label, { color: Colors.textMuted }]}>NARRATION</Text>
              <Text style={[styles.narration, { color: Colors.textPrimary }]}>{voucherData.narration}</Text>
            </View>
          </View>

          {/* Supportings */}
          {images.length > 0 && (
            <View style={styles.supportingsSection}>
              <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Supportings ({images.length})</Text>
              <View style={styles.imageGrid}>
                {images.map((url, idx) => {
                  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      activeOpacity={0.9} 
                      onPress={() => onImagePress(voucher, fullUrl)}
                      style={[styles.imageWrapper, { borderColor: Colors.border }]}
                    >
                      <Image source={{ uri: fullUrl }} style={styles.suppImage} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.md, 
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    height: 56
  },
  title: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  closeBtn: { padding: Spacing.xs, width: 40 },
  content: { flex: 1, padding: Spacing.md },
  statusSection: { alignItems: 'center', marginBottom: Spacing.lg },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  voucherNumber: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.xl },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  label: { fontSize: 10, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  value: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  divider: { height: 1, marginVertical: Spacing.md },
  amountSection: { alignItems: 'center' },
  amount: { fontSize: 32, fontWeight: '800' },
  narrationSection: {},
  narration: { fontSize: Fonts.sizes.md, lineHeight: 22 },
  supportingsSection: {},
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: Spacing.md },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageWrapper: { 
    width: (width - Spacing.md * 2 - 24) / 3, 
    height: (width - Spacing.md * 2 - 24) / 3, 
    borderRadius: BorderRadius.md, 
    borderWidth: 1,
    overflow: 'hidden'
  },
  suppImage: { width: '100%', height: '100%' }
});
