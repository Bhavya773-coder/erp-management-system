import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  TextInput,
  FlatList,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { fleetAPI, fileAPI } from '@/lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Modal, Pressable } from 'react-native';

const { width } = Dimensions.get('window');

export default function AIDashboard() {
  const Colors = useTheme();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, BARGE, TUG

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fleetAPI.getAssets();
      if (response.data.success) {
        setAssets(response.data.data.assets);
      }
    } catch (error) {
      console.error('Fetch assets error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      });

      if (result.canceled) return;

      setUploading(true);
      const asset = result.assets[0];

      // 1. Upload to general file storage
      const uploadRes = await fileAPI.uploadFile(asset.uri, asset.name, asset.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const fileUrl = uploadRes.data.data.fileUrl;

      // 2. Save metadata to fleet
      const fleetRes = await fleetAPI.uploadFileMetadata({
        fileName: asset.name,
        fileUrl,
        description: 'Uploaded via AI Mobile Dashboard',
        fileSize: asset.size,
        fileType: asset.mimeType
      });

      const fileId = fleetRes.data.data.file._id;

      // 3. Trigger AI Processing
      const processRes = await fleetAPI.processFile(fileId);
      
      if (processRes.data.success) {
        const { updated, created } = processRes.data.data;
        alert(`AI Sync Success!\nUpdated: ${updated}\nCreated: ${created}`);
        fetchAssets();
      }
    } catch (error) {
      console.error('Upload/Process error:', error);
      alert('Failed to process fleet file. Ensure it follows the required format.');
    } finally {
      setUploading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssets();
  };

  const filteredAssets = assets.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.regNo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'ALL' || item.classification === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: assets.length,
    barges: assets.filter(a => a.classification === 'BARGE').length,
    tugs: assets.filter(a => a.classification === 'TUG').length,
    onHire: assets.filter(a => a.status === 'ON_HIRE').length,
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ON_HIRE': return { backgroundColor: '#2DD4BF20' };
      case 'IDLE': return { backgroundColor: '#B7C8E120' };
      case 'MAINTENANCE': return { backgroundColor: '#EA433520' };
      default: return { backgroundColor: '#8696A020' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ON_HIRE': return '#2DD4BF';
      case 'IDLE': return '#B7C8E1';
      case 'MAINTENANCE': return '#EA4335';
      default: return '#8696A0';
    }
  };

  const StatCard = ({ label, value, icon, color }) => (
    <View style={[styles.statCard, { backgroundColor: Colors.bgSecondary, borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.statValue, { color: Colors.textPrimary }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: Colors.textMuted }]}>{label}</Text>
    </View>
  );

  const FilterChip = ({ active, label, onPress }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        styles.filterChip, 
        { backgroundColor: active ? Colors.accent : Colors.bgSecondary },
        active && styles.activeChip
      ]}
    >
      <Text style={[
        styles.filterChipText, 
        { color: active ? Colors.bgPrimary : Colors.textSecondary, fontWeight: active ? 'bold' : '600' }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAssetItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => setSelectedAsset(item)}
      activeOpacity={0.7}
      style={[styles.assetCard, { backgroundColor: Colors.bgSecondary, borderColor: Colors.border }]}
    >
      <View style={styles.assetHeader}>
        <View style={[styles.iconContainer, { backgroundColor: item.classification === 'TUG' ? '#2DD4BF15' : '#E5A24A15' }]}>
          <Ionicons 
            name={item.classification === 'TUG' ? 'speedometer' : 'boat'} 
            size={20} 
            color={item.classification === 'TUG' ? '#2DD4BF' : '#E5A24A'} 
          />
        </View>
        <View style={styles.assetInfo}>
          <Text style={[styles.assetName, { color: Colors.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.assetMeta, { color: Colors.textSecondary }]}>{item.regNo} • {item.buildYear || 'N/A'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
      <View style={[styles.assetFooter, { borderTopColor: Colors.border }]}>
        <View style={styles.footerItem}>
          <Ionicons name="resize-outline" size={14} color={Colors.textMuted} />
          <Text style={[styles.footerText, { color: Colors.textMuted }]}>{item.length}x{item.breadth}m</Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status || 'UNKNOWN'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const DetailRow = ({ label, value, icon }) => (
    <View style={[styles.detailRow, { borderBottomColor: Colors.divider }]}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon} size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <Text style={[styles.detailLabel, { color: Colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: Colors.textPrimary }]}>{value || '—'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgPrimary }]}>
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <View>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>AI Intelligence</Text>
          <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Fleet Monitoring & Analytics</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleUpload} 
            disabled={uploading}
            style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
          >
            <Ionicons name="cloud-upload" size={20} color={Colors.bgPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={onRefresh} 
            style={[styles.actionBtn, { backgroundColor: Colors.bgTertiary }]}
          >
            <Ionicons name="sync" size={20} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {uploading && (
        <View style={[styles.uploadOverlay, { backgroundColor: Colors.bgOverlay }]}>
          <View style={[styles.uploadCard, { backgroundColor: Colors.bgModal }]}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={[styles.uploadText, { color: Colors.textPrimary }]}>AI Engine Processing...</Text>
            <Text style={[styles.uploadSubtext, { color: Colors.textSecondary }]}>Extracting fleet data from manifest</Text>
          </View>
        </View>
      )}

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
          <StatCard label="Total Fleet" value={stats.total} icon="boat" color="#E5A24A" />
          <StatCard label="Barges" value={stats.barges} icon="water" color="#3B82F6" />
          <StatCard label="Tugs" value={stats.tugs} icon="speedometer" color="#2DD4BF" />
          <StatCard label="On Hire" value={stats.onHire} icon="checkmark-circle" color="#22C55E" />
        </ScrollView>

        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: Colors.searchBg }]}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput 
              placeholder="Search assets..." 
              placeholderTextColor={Colors.textMuted}
              style={[styles.searchInput, { color: Colors.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.filterRow}>
            <FilterChip active={filter === 'ALL'} label="ALL" onPress={() => setFilter('ALL')} />
            <FilterChip active={filter === 'BARGE'} label="BARGES" onPress={() => setFilter('BARGE')} />
            <FilterChip active={filter === 'TUG'} label="TUGS" onPress={() => setFilter('TUG')} />
          </View>
        </View>

        {/* Assets List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Live Fleet Manifest</Text>
            <View style={[styles.liveIndicator, { backgroundColor: '#22C55E' }]} />
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={[styles.loadingText, { color: Colors.textSecondary }]}>Initializing Intelligence Core...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredAssets}
              renderItem={renderAssetItem}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="alert-circle-outline" size={64} color={Colors.textMuted} style={{ opacity: 0.2 }} />
                  <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>No assets identified in repository.</Text>
                  <Text style={[styles.emptySubtext, { color: Colors.textMuted }]}>Upload an XLSX Fleet file to sync data.</Text>
                </View>
              }
            />
          )}
        </View>
        
        {/* AI Insight Footer */}
        <View style={[styles.aiFooter, { backgroundColor: Colors.bgSecondary }]}>
          <Text style={[styles.aiFooterText, { color: Colors.textMuted }]}>
            AI Engine v2.4.0 active • Data synchronized with server {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </ScrollView>

      {/* Asset Details Modal */}
      <Modal
        visible={!!selectedAsset}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAsset(null)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setSelectedAsset(null)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: Colors.bgPrimary }]}>
            {selectedAsset && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                  <View style={[styles.modalIcon, { backgroundColor: selectedAsset.classification === 'TUG' ? '#2DD4BF15' : '#E5A24A15' }]}>
                    <Ionicons 
                      name={selectedAsset.classification === 'TUG' ? 'speedometer' : 'boat'} 
                      size={28} 
                      color={selectedAsset.classification === 'TUG' ? '#2DD4BF' : '#E5A24A'} 
                    />
                  </View>
                  <View style={styles.modalTitleContainer}>
                    <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>{selectedAsset.name}</Text>
                    <View style={styles.modalSubHeader}>
                      <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>{selectedAsset.classification}</Text>
                      <View style={[styles.modalStatusBadge, getStatusStyle(selectedAsset.status)]}>
                        <Text style={[styles.modalStatusText, { color: getStatusColor(selectedAsset.status) }]}>{selectedAsset.status}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedAsset(null)}>
                    <Ionicons name="close" size={24} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll}>
                  <Text style={[styles.detailsSectionTitle, { color: Colors.accent }]}>Registration & Build</Text>
                  <DetailRow label="Registration No" value={selectedAsset.regNo} icon="id-card-outline" />
                  <DetailRow label="Build Year" value={selectedAsset.buildYear} icon="calendar-outline" />
                  <DetailRow label="IRS / IV" value={selectedAsset.irs_iv} icon="shield-checkmark-outline" />

                  <Text style={[styles.detailsSectionTitle, { color: Colors.accent, marginTop: Spacing.xl }]}>Vessel Specifications</Text>
                  <View style={styles.specsGrid}>
                    <View style={styles.specItem}>
                      <Text style={[styles.specLabel, { color: Colors.textMuted }]}>Length</Text>
                      <Text style={[styles.specValue, { color: Colors.textPrimary }]}>{selectedAsset.length}m</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={[styles.specLabel, { color: Colors.textMuted }]}>Breadth</Text>
                      <Text style={[styles.specValue, { color: Colors.textPrimary }]}>{selectedAsset.breadth}m</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={[styles.specLabel, { color: Colors.textMuted }]}>Depth</Text>
                      <Text style={[styles.specValue, { color: Colors.textPrimary }]}>{selectedAsset.depth}m</Text>
                    </View>
                  </View>

                  <Text style={[styles.detailsSectionTitle, { color: Colors.accent, marginTop: Spacing.xl }]}>Operations</Text>
                  <DetailRow label="Current Location" value={selectedAsset.location} icon="location-outline" />
                  <DetailRow label="Remarks" value={selectedAsset.remark} icon="chatbubble-outline" />
                  <DetailRow label="Last Updated" value={new Date(selectedAsset.updatedAt).toLocaleDateString()} icon="time-outline" />
                </ScrollView>

                <TouchableOpacity 
                  style={[styles.closeBtn, { backgroundColor: Colors.accent }]}
                  onPress={() => setSelectedAsset(null)}
                >
                  <Text style={[styles.closeBtnText, { color: Colors.bgPrimary }]}>Close Details</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  uploadCard: {
    padding: Spacing.xxxl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  uploadText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '800',
    marginTop: Spacing.xl,
    textTransform: 'uppercase',
  },
  uploadSubtext: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  statsContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  statCard: {
    width: width * 0.35,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Fonts.sizes.md,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterChipText: {
    fontSize: Fonts.sizes.xs,
    letterSpacing: 0.5,
  },
  listSection: {
    paddingHorizontal: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  assetCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 0.5,
    marginBottom: Spacing.md,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: Fonts.sizes.md,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  assetMeta: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  assetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
    gap: Spacing.xl,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Fonts.sizes.md,
    fontWeight: '800',
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '500',
    marginTop: 4,
  },
  aiFooter: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  aiFooterText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.xl,
    borderBottomWidth: 0.5,
    marginBottom: Spacing.xl,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: Spacing.sm,
  },
  modalSubtitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  modalScroll: {
    flex: 1,
  },
  detailsSectionTitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: Fonts.sizes.md,
    fontWeight: '800',
  },
  specsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  specItem: {
    flex: 1,
    backgroundColor: 'rgba(128,128,128,0.05)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  specValue: {
    fontSize: Fonts.sizes.md,
    fontWeight: '900',
  },
  closeBtn: {
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  closeBtnText: {
    fontSize: Fonts.sizes.md,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
