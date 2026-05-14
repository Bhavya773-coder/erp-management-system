import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, FlatList, Dimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { messageAPI } from '../lib/api';
import { format, parseISO, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

export default function MyVouchersScreen() {
  const Colors = useTheme();
  const router = useRouter();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState(format(new Date(), 'MMMM yyyy'));
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const res = await messageAPI.getMyVouchers();
      setVouchers(res.data?.data?.vouchers || []);
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
      Alert.alert('Error', 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const groupedVouchers = useMemo(() => {
    const groups = {};
    vouchers.forEach(v => {
      const date = parseISO(v.createdAt);
      const monthKey = format(date, 'MMMM yyyy');
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(v);
    });
    return groups;
  }, [vouchers]);

  const monthKeys = useMemo(() => Object.keys(groupedVouchers).sort((a, b) => {
    return new Date(b) - new Date(a);
  }), [groupedVouchers]);

  const handlePrint = async (v) => {
    const vData = v.voucherData || {};
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #25D366; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 28px; font-weight: bold; color: #128C7E; letter-spacing: 2px; }
            .title { font-size: 20px; margin-top: 10px; color: #666; }
            .voucher-box { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background-color: #f9f9f9; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px dashed #eee; padding-bottom: 10px; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; }
            .amount { font-size: 32px; font-weight: 800; color: #25D366; text-align: center; margin: 30px 0; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
            .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 14px; }
            .approved { background-color: #e8f5e9; color: #2e7d32; }
            .pending { background-color: #fff3e0; color: #ef6c00; }
            .denied { background-color: #ffebee; color: #c62828; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">ARCADIAN WORKS</div>
            <div class="title">OFFICIAL PAYMENT VOUCHER</div>
          </div>
          <div class="voucher-box">
            <div class="row">
              <span class="label">Voucher Number:</span>
              <span class="value">${vData.number || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Date Created:</span>
              <span class="value">${format(parseISO(v.createdAt), 'dd MMMM yyyy, HH:mm')}</span>
            </div>
            <div class="row">
              <span class="label">Prepared By:</span>
              <span class="value">${vData.preparedBy || 'Self'}</span>
            </div>
            <div class="row">
              <span class="label">Status:</span>
              <span class="status ${vData.status?.toLowerCase() || 'pending'}">${vData.status || 'PENDING'}</span>
            </div>
            <div class="amount">₹${vData.amount?.toLocaleString('en-IN')}</div>
            <div class="row" style="border: none;">
              <span class="label">Description / Remarks:</span>
            </div>
            <div style="color: #666; font-style: italic; margin-top: 5px;">
              ${v.content || 'No description provided.'}
            </div>
          </div>
          <div class="footer">
            This is a computer-generated document. No signature required.<br/>
            &copy; ${new Date().getFullYear()} Arcadian Works ERP System
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'ios') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (err) {
      console.error('Print error:', err);
      Alert.alert('Error', 'Could not generate print document');
    }
  };

  const renderVoucherDetail = (v) => {
    const vData = v.voucherData || {};
    return (
      <View style={[s.detailCard, { backgroundColor: Colors.bgSecondary }]}>
        <View style={s.detailHeader}>
          <Text style={[s.detailTitle, { color: Colors.textPrimary }]}>Voucher Details</Text>
          <TouchableOpacity onPress={() => setSelectedVoucher(null)}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        
        <View style={s.detailRow}>
          <Text style={[s.detailLabel, { color: Colors.textSecondary }]}>Voucher #</Text>
          <Text style={[s.detailValue, { color: Colors.textPrimary }]}>{vData.number}</Text>
        </View>
        
        <View style={s.detailRow}>
          <Text style={[s.detailLabel, { color: Colors.textSecondary }]}>Status</Text>
          <View style={[s.statusBadge, { backgroundColor: vData.status === 'APPROVED' ? '#4CAF50' : vData.status === 'DENIED' ? '#F44336' : '#FF9800' }]}>
            <Text style={s.statusText}>{vData.status || 'PENDING'}</Text>
          </View>
        </View>

        <View style={s.amountSection}>
          <Text style={[s.amountLabel, { color: Colors.textSecondary }]}>Amount</Text>
          <Text style={[s.amountValue, { color: Colors.accent }]}>₹{vData.amount?.toLocaleString('en-IN')}</Text>
        </View>

        <View style={s.detailRow}>
          <Text style={[s.detailLabel, { color: Colors.textSecondary }]}>Date</Text>
          <Text style={[s.detailValue, { color: Colors.textPrimary }]}>{format(parseISO(v.createdAt), 'dd MMM yyyy, HH:mm')}</Text>
        </View>

        <TouchableOpacity 
          style={[s.printBtn, { backgroundColor: Colors.accent }]}
          onPress={() => handlePrint(v)}
        >
          <Ionicons name="print-outline" size={20} color="#FFF" />
          <Text style={s.printBtnText}>Print Voucher</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: Colors.bgPrimary }]}>
      <View style={[s.header, { backgroundColor: Colors.bgHeader, borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: Colors.textPrimary }]}>My Vouchers</Text>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {monthKeys.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={64} color={Colors.textMuted} />
              <Text style={[s.emptyText, { color: Colors.textSecondary }]}>No vouchers found</Text>
            </View>
          ) : (
            monthKeys.map(month => (
              <View key={month} style={s.monthSection}>
                <TouchableOpacity 
                  style={[s.monthHeader, { backgroundColor: Colors.bgSecondary, borderBottomColor: Colors.border }]}
                  onPress={() => setExpandedMonth(expandedMonth === month ? null : month)}
                >
                  <Text style={[s.monthTitle, { color: Colors.textPrimary }]}>{month}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[s.monthCount, { color: Colors.textMuted }]}>{groupedVouchers[month].length} items</Text>
                    <Ionicons 
                      name={expandedMonth === month ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={Colors.textMuted} 
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                </TouchableOpacity>

                {expandedMonth === month && (
                  <View style={s.voucherList}>
                    {groupedVouchers[month].map(v => (
                      <TouchableOpacity 
                        key={v._id || v.id} 
                        style={[s.voucherItem, { backgroundColor: Colors.bgSecondary, borderBottomColor: Colors.border }]}
                        onPress={() => setSelectedVoucher(v)}
                      >
                        <View style={[s.voucherIcon, { backgroundColor: Colors.accent + '20' }]}>
                          <Ionicons name="receipt" size={20} color={Colors.accent} />
                        </View>
                        <View style={s.voucherInfo}>
                          <Text style={[s.voucherNum, { color: Colors.textPrimary }]}>{v.voucherData?.number}</Text>
                          <Text style={[s.voucherDate, { color: Colors.textMuted }]}>{format(parseISO(v.createdAt), 'dd MMM, HH:mm')}</Text>
                        </View>
                        <View style={s.voucherRight}>
                          <Text style={[s.voucherAmt, { color: Colors.accent }]}>₹{v.voucherData?.amount?.toLocaleString('en-IN')}</Text>
                          <View style={[s.statusDot, { backgroundColor: v.voucherData?.status === 'APPROVED' ? '#4CAF50' : v.voucherData?.status === 'DENIED' ? '#F44336' : '#FF9800' }]} />
                        </View>
                      </TouchableOpacity>
                    ))}
                    <View style={[s.monthTotal, { borderTopColor: Colors.border }]}>
                      <Text style={[s.totalLabel, { color: Colors.textSecondary }]}>Monthly Total</Text>
                      <Text style={[s.totalValue, { color: Colors.accent }]}>
                        ₹{groupedVouchers[month].reduce((sum, v) => sum + (v.voucherData?.amount || 0), 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {selectedVoucher && (
        <View style={s.overlay}>
          <TouchableOpacity style={s.dismiss} onPress={() => setSelectedVoucher(null)} />
          {renderVoucherDetail(selectedVoucher)}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 0.5 },
  backBtn: { marginRight: Spacing.md },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '700' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 100 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: Fonts.sizes.md, marginTop: 16 },
  monthSection: { marginBottom: Spacing.md, paddingHorizontal: Spacing.md },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 20, borderRadius: BorderRadius.lg, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  monthTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  monthCount: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
  voucherList: { marginTop: Spacing.sm },
  voucherItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: BorderRadius.md, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  voucherIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  voucherInfo: { flex: 1 },
  voucherNum: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  voucherDate: { fontSize: Fonts.sizes.xs, marginTop: 2 },
  voucherRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  voucherAmt: { fontSize: Fonts.sizes.md, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  monthTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginTop: 8, borderTopWidth: 1, borderStyle: 'dashed' },
  totalLabel: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 20, fontWeight: '900' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  dismiss: { ...StyleSheet.absoluteFillObject },
  detailCard: { width: width * 0.85, padding: 24, borderRadius: BorderRadius.xl, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  detailTitle: { fontSize: 20, fontWeight: '800' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailLabel: { fontSize: 14, fontWeight: '600' },
  detailValue: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  amountSection: { alignItems: 'center', marginVertical: 32, paddingVertical: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  amountLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  amountValue: { fontSize: 36, fontWeight: '900' },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: BorderRadius.lg, marginTop: 8 },
  printBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
