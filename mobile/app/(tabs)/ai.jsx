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
  Dimensions, 
  Modal, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { fleetAPI, fileAPI } from '@/lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function AIDashboard() {
  const Colors = useTheme();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, IV, IRS, ON_HIRE

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ location: '', remark: '', status: '' });
  const [isUpdating, setIsUpdating] = useState(false);

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

      const uploadRes = await fileAPI.uploadFile(asset.uri, asset.name, asset.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const fileUrl = uploadRes.data.data.fileUrl;

      const fleetRes = await fleetAPI.uploadFileMetadata({
        fileName: asset.name,
        fileUrl,
        description: 'Uploaded via AI Mobile Dashboard',
        fileSize: asset.size,
        fileType: asset.mimeType
      });

      const fileId = fleetRes.data.data.file._id;
      const processRes = await fleetAPI.processFile(fileId);
      
      if (processRes.data.success) {
        const { updated, created } = processRes.data.data;
        alert(`AI Sync Success!\nUpdated: ${updated}\nCreated: ${created}`);
        fetchAssets();
      }
    } catch (error) {
      console.error('Upload/Process error:', error);
      alert('Failed to process fleet file.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditOpen = (asset) => {
    setSelectedAsset(asset);
    setEditForm({
      location: asset.location || '',
      remark: asset.remark || '',
      status: asset.status || 'IDLE'
    });
    setIsEditing(true);
  };

  const handleUpdateAsset = async () => {
    if (!selectedAsset) return;
    setIsUpdating(true);
    try {
      const response = await fleetAPI.updateAsset(selectedAsset._id, editForm);
      if (response.data.success) {
        const updated = response.data.data.asset;
        setAssets(assets.map(a => a._id === updated._id ? updated : a));
        setSelectedAsset(updated);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Update asset error:', error);
      alert('Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssets();
  };

  const filteredAssets = assets.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.regNo?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filter === 'IV') matchesFilter = item.classification === 'IV';
    else if (filter === 'IRS') matchesFilter = item.classification === 'IRS';
    else if (filter === 'ON_HIRE') matchesFilter = item.status === 'ON_HIRE';
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: assets.length,
    iv: assets.filter(a => a.classification === 'IV').length,
    irs: assets.filter(a => a.classification === 'IRS').length,
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
        <View style={[styles.iconContainer, { backgroundColor: item.classification === 'IRS' ? '#2DD4BF15' : '#E5A24A15' }]}>
          <Ionicons 
            name={item.classification === 'IRS' ? 'speedometer' : 'boat'} 
            size={20} 
            color={item.classification === 'IRS' ? '#2DD4BF' : '#E5A24A'} 
          />
        </View>
        <View style={styles.assetInfo}>
          <Text style={[styles.assetName, { color: Colors.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.assetMeta, { color: Colors.textSecondary }]}>{item.classification} • {item.regNo}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
      <View style={[styles.assetFooter, { borderTopColor: Colors.border }]}>
        <View style={styles.footerItem}>
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
          <Text style={[styles.footerText, { color: Colors.textMuted }]}>{item.location || 'Unknown'}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status || 'UNKNOWN'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const DetailRow = ({ label, value, icon, audit = false }) => (
    <View style={[styles.detailRow, { borderBottomColor: Colors.divider }]}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon} size={16} color={audit ? Colors.accent : Colors.textMuted} style={{ marginRight: 8 }} />
        <Text style={[styles.detailLabel, { color: audit ? Colors.accent : Colors.textMuted, fontWeight: audit ? '800' : '600' }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: audit ? Colors.accent : Colors.textPrimary }]}>{value || '—'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgPrimary }]}>
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <View>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>Intelligence</Text>
          <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>Asset Monitoring Core</Text>
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
            <Text style={[styles.uploadText, { color: Colors.textPrimary }]}>Syncing Fleet...</Text>
            <Text style={[styles.uploadSubtext, { color: Colors.textSecondary }]}>Updating manifest records</Text>
          </View>
        </View>
      )}

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
          <StatCard label="Fleet" value={stats.total} icon="boat" color="#E5A24A" />
          <StatCard label="IV" value={stats.iv} icon="water" color="#3B82F6" />
          <StatCard label="IRS" value={stats.irs} icon="speedometer" color="#2DD4BF" />
          <StatCard label="On Hire" value={stats.onHire} icon="checkmark-circle" color="#22C55E" />
        </ScrollView>

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
            <FilterChip active={filter === 'IV'} label="IV" onPress={() => setFilter('IV')} />
            <FilterChip active={filter === 'IRS'} label="IRS" onPress={() => setFilter('IRS')} />
            <FilterChip active={filter === 'ON_HIRE'} label="ON HIRE" onPress={() => setFilter('ON_HIRE')} />
          </View>
        </View>

        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>Active Manifest</Text>
            <View style={[styles.liveIndicator, { backgroundColor: '#22C55E' }]} />
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
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
                  <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>No assets identified.</Text>
                </View>
              }
            />
          )}
        </View>
        
        <View style={[styles.aiFooter, { backgroundColor: Colors.bgSecondary }]}>
          <Text style={[styles.aiFooterText, { color: Colors.textMuted }]}>
            Arcadian Fleet Intel • {new Date().toLocaleTimeString()}
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
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAsset(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: Colors.bgPrimary }]}>
            {selectedAsset && (
              <>
                <View style={[styles.modalHeader, { borderBottomColor: Colors.border }]}>
                  <View style={[styles.modalIcon, { backgroundColor: selectedAsset.classification === 'IRS' ? '#2DD4BF15' : '#E5A24A15' }]}>
                    <Ionicons 
                      name={selectedAsset.classification === 'IRS' ? 'speedometer' : 'boat'} 
                      size={28} 
                      color={selectedAsset.classification === 'IRS' ? '#2DD4BF' : '#E5A24A'} 
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
                  <TouchableOpacity onPress={() => handleEditOpen(selectedAsset)} style={styles.editBtn}>
                    <Ionicons name="create-outline" size={24} color={Colors.accent} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll}>
                  <Text style={[styles.detailsSectionTitle, { color: Colors.accent }]}>Registration & Build</Text>
                  <DetailRow label="Registration" value={selectedAsset.regNo} icon="id-card-outline" />
                  <DetailRow label="Build Year" value={selectedAsset.buildYear} icon="calendar-outline" />
                  <DetailRow label="Type" value={selectedAsset.irs_iv} icon="shield-checkmark-outline" />

                  <Text style={[styles.detailsSectionTitle, { color: Colors.accent, marginTop: Spacing.xl }]}>Operations</Text>
                  <DetailRow label="Location" value={selectedAsset.location} icon="location-outline" />
                  <DetailRow label="Remarks" value={selectedAsset.remark} icon="chatbubble-outline" />
                  
                  <Text style={[styles.detailsSectionTitle, { color: Colors.accent, marginTop: Spacing.xl }]}>Audit Log</Text>
                  <DetailRow 
                    label="Last Updated By" 
                    value={selectedAsset.lastUpdatedBy?.name || 'System'} 
                    icon="person-outline" 
                    audit
                  />
                  <DetailRow 
                    label="Modified Date" 
                    value={format(new Date(selectedAsset.updatedAt), 'dd MMM, HH:mm')} 
                    icon="time-outline" 
                    audit
                  />
                </ScrollView>

                <TouchableOpacity 
                  style={[styles.closeBtn, { backgroundColor: Colors.bgSecondary }]}
                  onPress={() => setSelectedAsset(null)}
                >
                  <Text style={[styles.closeBtnText, { color: Colors.textPrimary }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={isEditing}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditing(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.editCard, { backgroundColor: Colors.bgModal }]}>
            <Text style={[styles.editTitle, { color: Colors.accent }]}>Update Asset State</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: Colors.textMuted }]}>CURRENT LOCATION</Text>
              <TextInput
                value={editForm.location}
                onChangeText={(text) => setEditForm({...editForm, location: text})}
                style={[styles.input, { color: Colors.textPrimary, backgroundColor: Colors.bgPrimary, borderColor: Colors.border }]}
                placeholder="Enter location"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: Colors.textMuted }]}>REMARKS</Text>
              <TextInput
                value={editForm.remark}
                onChangeText={(text) => setEditForm({...editForm, remark: text})}
                style={[styles.input, { color: Colors.textPrimary, backgroundColor: Colors.bgPrimary, borderColor: Colors.border }]}
                placeholder="Enter remarks"
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>

            <View style={styles.statusGrid}>
              {['IDLE', 'ON_HIRE', 'MAINTENANCE'].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setEditForm({...editForm, status: s})}
                  style={[
                    styles.statusBtn,
                    { backgroundColor: editForm.status === s ? Colors.accent : Colors.bgPrimary, borderColor: Colors.border },
                    editForm.status === s && { borderColor: Colors.accent }
                  ]}
                >
                  <Text style={[styles.statusBtnText, { color: editForm.status === s ? Colors.bgPrimary : Colors.textSecondary }]}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity 
                onPress={() => setIsEditing(false)}
                style={[styles.cancelBtn, { borderColor: Colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleUpdateAsset}
                disabled={isUpdating}
                style={[styles.saveBtn, { backgroundColor: Colors.accent }]}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={Colors.bgPrimary} />
                ) : (
                  <Text style={[styles.saveBtnText, { color: Colors.bgPrimary }]}>Apply Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 0.5,
  },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
    elevation: 10,
  },
  uploadText: { fontSize: 16, fontWeight: '800', marginTop: Spacing.xl, textTransform: 'uppercase' },
  uploadSubtext: { fontSize: 12, fontWeight: '500', marginTop: Spacing.xs },
  statsContainer: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl, gap: Spacing.md },
  statCard: { width: width * 0.35, padding: Spacing.lg, borderRadius: BorderRadius.xl, borderLeftWidth: 4 },
  statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  searchSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, height: 48, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: 14, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  filterChipText: { fontSize: 10, letterSpacing: 0.5 },
  listSection: { paddingHorizontal: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 8 },
  liveIndicator: { width: 8, height: 8, borderRadius: 4 },
  listContent: { paddingBottom: Spacing.xxl },
  assetCard: { padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 0.5, marginBottom: Spacing.md },
  assetHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  assetInfo: { flex: 1 },
  assetName: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
  assetMeta: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  assetFooter: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 0.5, justifyContent: 'space-between' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, fontWeight: '600' },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '800' },
  aiFooter: { padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.xl },
  aiFooterText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: Spacing.xl, height: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: Spacing.xl, borderBottomWidth: 0.5, marginBottom: Spacing.xl },
  modalIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.lg },
  modalTitleContainer: { flex: 1 },
  modalTitle: { fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  modalSubHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: Spacing.sm },
  modalSubtitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  modalStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  modalStatusText: { fontSize: 10, fontWeight: '900' },
  editBtn: { padding: 8 },
  modalScroll: { flex: 1 },
  detailsSectionTitle: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg, borderBottomWidth: 0.5 },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center' },
  detailLabel: { fontSize: 13, fontWeight: '600' },
  detailValue: { fontSize: 14, fontWeight: '800' },
  closeBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  closeBtnText: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
  
  // Edit Form Styles
  editCard: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, width: '100%' },
  editTitle: { fontSize: 18, fontWeight: '900', textTransform: 'uppercase', marginBottom: 24, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 14 },
  statusGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statusBtn: { flex: 1, height: 45, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyCenter: 'center', paddingVertical: 10 },
  statusBtnText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  editActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '800' },
  saveBtn: { flex: 2, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase' }
});
