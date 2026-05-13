import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Image, Dimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Spacing, Fonts } from '@/constants/appTheme';
import { API_BASE_URL } from '@/constants/config';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

const COMPANY_NAMES = {
  'MP': 'Millennium Plaza',
  'AST': 'Arcadia Shipping and Trading',
  'AE': 'Arcadia Engineering',
  'APIL': 'Arvind Port and infra'
};

export default function VoucherDetailModal({ visible, onClose, voucher, onImagePress }) {
  const Colors = useTheme();
  const insets = useSafeAreaInsets();

  if (!voucher) return null;

  const { voucherData, fileUrl, createdAt, sender } = voucher;
  const images = fileUrl ? fileUrl.split(',') : [];
  const formattedDate = createdAt ? format(new Date(createdAt), 'dd MMMM yyyy') : 'N/A';
  const preparedBy = voucherData.preparedBy || sender?.name || 'Unknown';
  const fullCompanyName = COMPANY_NAMES[voucherData.company] || voucherData.company;

  const handlePrint = async () => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              .header { border-bottom: 2px solid #25D366; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
              .company-name { font-size: 24px; font-weight: bold; color: #1a1a1a; }
              .voucher-number { font-size: 16px; color: #666; }
              .status { padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 14px; color: white; }
              .status-approved { background-color: #4CAF50; }
              .status-pending { background-color: #FF9800; }
              .status-denied { background-color: #F44336; }
              .section { margin-bottom: 25px; }
              .label { font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 5px; font-weight: bold; }
              .value { font-size: 18px; color: #111; }
              .amount-box { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px solid #eee; }
              .amount-label { font-size: 14px; color: #666; margin-bottom: 10px; }
              .amount-value { font-size: 36px; font-weight: 800; color: #25D366; }
              .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #999; text-align: center; clear: both; }
              .image-container { display: inline-block; width: 45%; margin: 10px 2%; text-align: center; vertical-align: top; }
              .image-label { font-size: 12px; color: #666; margin-bottom: 8px; text-transform: uppercase; font-weight: bold; }
              .supp-image { width: 100%; height: 250px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; }
              .signatures { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px dashed #ccc; padding-top: 20px; }
              .sig-box { flex: 1; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="company-name">${fullCompanyName}</div>
                <div class="voucher-number">Voucher #${voucherData.number}</div>
              </div>
              <div class="status status-${voucherData.status.toLowerCase()}">${voucherData.status}</div>
            </div>

            <div class="section">
              <div class="label">Date</div>
              <div class="value">${formattedDate}</div>
            </div>

            <div class="amount-box">
              <div class="amount-label">TOTAL AMOUNT</div>
              <div class="amount-value">₹${voucherData.amount.toLocaleString('en-IN')}</div>
            </div>

            <div class="section">
              <div class="label">Narration / Description</div>
              <div class="value">${voucherData.narration}</div>
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="label">Prepared By</div>
                <div class="value" style="font-size:16px;">${preparedBy}</div>
              </div>
              ${voucherData.status === 'APPROVED' ? `
              <div class="sig-box" style="text-align: right;">
                <div class="label">Approved By</div>
                <div class="value" style="font-size:16px; color: #4CAF50;">${voucherData.approvedBy || 'Admin'}</div>
                ${voucherData.approvedAt ? `<div style="font-size:12px; color:#666; margin-top:4px;">on ${format(new Date(voucherData.approvedAt), 'dd MMM yyyy, h:mm a')}</div>` : ''}
              </div>
              ` : ''}
            </div>

            <div class="footer">
              Generated by Arcadian ERP System on ${new Date().toLocaleString()}<br/>
              This is a computer generated document.
            </div>

            <div style="margin-top: 40px;">
              ${images.length > 0 ? `<div class="label" style="margin-bottom: 15px;">Supportings</div>` : ''}
              ${images.map((url, index) => {
                const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
                return `
                  <div class="image-container">
                    <div class="image-label">Document ${index + 1}</div>
                    <img src="${fullUrl}" class="supp-image" />
                  </div>
                `;
              }).join('')}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log('PDF generated at:', uri);
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to generate voucher PDF');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: Colors.bgPrimary, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: Colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Voucher Details</Text>
          <TouchableOpacity onPress={handlePrint} style={styles.printBtn}>
            <Ionicons name="print-outline" size={24} color={Colors.accent} />
          </TouchableOpacity>
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
              <Text style={[styles.label, { color: Colors.textSecondary }]}>Description</Text>
              <Text style={[styles.value, { color: Colors.textPrimary }]}>{voucherData.narration}</Text>
            </View>

            <View style={{ marginTop: Spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: Colors.textSecondary }]}>Prepared By</Text>
                <Text style={[styles.value, { color: Colors.textPrimary }]}>{preparedBy}</Text>
              </View>

              {voucherData.status === 'APPROVED' && (
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.label, { color: Colors.textSecondary }]}>Approved By</Text>
                  <View style={styles.approverBox}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.value, { color: Colors.textPrimary, fontWeight: '700' }]}>{voucherData.approvedBy || 'Admin'}</Text>
                  </View>
                  {voucherData.approvedAt && (
                    <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>
                      on {format(new Date(voucherData.approvedAt), 'dd MMM yyyy')}
                    </Text>
                  )}
                </View>
              )}
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
  printBtn: { padding: Spacing.xs, width: 40, alignItems: 'flex-end' },
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
  approverBox: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  supportingsSection: { marginTop: Spacing.sm },
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
