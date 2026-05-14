import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import * as ImagePicker from 'expo-image-picker';
import { fileAPI, messageAPI } from '../lib/api';
import { API_BASE_URL } from '@/constants/config';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { format } from 'date-fns';

const getMimeType = (filename) => {
  const ext = filename?.split('.').pop().toLowerCase();
  const map = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'zip': 'application/zip',
    'txt': 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
};

export default function ProfileScreen() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const Colors = useTheme();
  const router = useRouter();
  const [phone, setPhone] = useState(user?.phone || '');
  const [education, setEducation] = useState(user?.education || '');
  const [skills, setSkills] = useState(user?.skills?.join(', ') || '');
  const [sharedDocs, setSharedDocs] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?';

  useEffect(() => {
    fetchSharedDocuments();
    fetchMyVouchers();
  }, []);

  const fetchSharedDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await messageAPI.getSharedDocuments();
      setSharedDocs(res.data?.data?.documents || []);
    } catch (err) {
      console.error('Failed to fetch shared documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  const fetchMyVouchers = async () => {
    setVouchersLoading(true);
    try {
      const res = await messageAPI.getMyVouchers();
      setMyVouchers(res.data?.data?.vouchers || []);
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
    } finally {
      setVouchersLoading(false);
    }
  };

  const handleSave = async () => {
    const r = await updateProfile({
      phone, education,
      avatarUrl: user?.avatarUrl,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
    });
    if (r.success) {
      Alert.alert('Success', 'Profile updated');
      router.back();
    } else {
      Alert.alert('Error', r.error || 'Failed to update');
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!res.canceled) {
      const asset = res.assets[0];
      try {
        const up = await fileAPI.uploadFile(asset.uri, 'avatar.jpg', 'image/jpeg');
        if (up.data.success) {
          await updateProfile({ avatarUrl: up.data.data.fileUrl });
          Alert.alert('Success', 'Profile picture updated');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };

  const getAvatarUrl = () => {
    if (!user?.avatarUrl) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&color=fff&size=128`;
    }
    return user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE_URL}/${user.avatarUrl.replace(/^\//, '')}`;
  };

  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}/${url.replace(/^\//, '')}`;
  };

  const handleDownloadDocument = async (doc) => {
    if (!doc.fileUrl) return;
    const url = getMediaUrl(doc.fileUrl);
    const filename = doc.fileName || url.split('/').pop();
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    
    setDownloadingId(doc._id || doc.id);
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      
      if (info.exists) {
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
              type: getMimeType(filename),
            });
          } catch (e) {
            console.error('Intent Error:', e);
            Alert.alert('Error', 'No app found to open this file type');
          }
          return;
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { 
            dialogTitle: `Open ${filename}`,
            UTI: 'public.item'
          });
        } else {
          Alert.alert('Info', 'File already downloaded');
        }
        return;
      }

      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: getMimeType(filename),
        });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, { 
          dialogTitle: `Open ${filename}`,
          UTI: 'public.item'
        });
      } else {
        Alert.alert('Success', 'File downloaded successfully');
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'Unable to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  const truncateFileName = (name, maxLen = 30) => {
    if (!name) return 'Document';
    if (name.length <= maxLen) return name;
    const ext = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const maxNameLen = maxLen - ext.length - 4; // 4 for "..." + "."
    return `${nameWithoutExt.substring(0, maxNameLen)}...${ext}`;
  };

  const renderDocItem = (doc) => {
    const fileName = doc.fileName || doc.content || 'Document';
    const senderName = doc.sender?.name || 'Unknown';
    const dateStr = doc.createdAt ? format(new Date(doc.createdAt), 'dd MMM yyyy') : '';
    const isDownloading = downloadingId === (doc._id || doc.id);

    return (
      <View 
        key={doc._id || doc.id} 
        style={[s.docItem, { backgroundColor: Colors.bgSecondary, borderColor: Colors.border }]}
      >
        <View style={[s.docIcon, { backgroundColor: Colors.accent }]}>
          <Ionicons name="document-text" size={22} color="#FFF" />
        </View>
        <View style={s.docInfo}>
          <Text style={[s.docName, { color: Colors.textPrimary }]} numberOfLines={2} ellipsizeMode="middle">
            {truncateFileName(fileName)}
          </Text>
          <Text style={[s.docMeta, { color: Colors.textSecondary }]}>
            {senderName} • {dateStr}
          </Text>
          {doc.fileSize && (
            <Text style={[s.docSize, { color: Colors.textMuted }]}>
              {doc.fileSize < 1024 ? `${doc.fileSize} B` : doc.fileSize < 1048576 ? `${(doc.fileSize / 1024).toFixed(1)} KB` : `${(doc.fileSize / 1048576).toFixed(1)} MB`}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={[s.downloadBtn, { backgroundColor: Colors.accent + '20' }]} 
          onPress={() => handleDownloadDocument(doc)}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Ionicons name="download-outline" size={22} color={Colors.accent} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderVoucherItem = (v) => {
    const vData = v.voucherData || {};
    const chatName = v.chat?.isGroup ? v.chat?.name : 'Personal Chat';
    const dateStr = v.createdAt ? format(new Date(v.createdAt), 'dd MMM HH:mm') : '';
    
    return (
      <TouchableOpacity 
        key={v._id || v.id} 
        style={[s.docItem, { backgroundColor: Colors.bgSecondary, borderColor: Colors.border }]}
        onPress={() => router.push(`/chat/${v.chat?._id || v.chat}`)}
      >
        <View style={[s.docIcon, { backgroundColor: Colors.accent + '30' }]}>
          <Ionicons name="receipt" size={22} color={Colors.accent} />
        </View>
        <View style={s.docInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[s.docName, { color: Colors.textPrimary }]}>{vData.number || 'Voucher'}</Text>
            <Text style={{ color: Colors.accent, fontWeight: '700' }}>₹{vData.amount?.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={[s.docMeta, { color: Colors.textSecondary }]}>
            {chatName} • {dateStr}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: vData.status === 'APPROVED' ? '#4CAF50' : vData.status === 'DENIED' ? '#F44336' : '#FF9800' }} />
            <Text style={{ fontSize: 11, color: Colors.textMuted }}>{vData.status || 'PENDING'}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: Colors.bgPrimary }]}>
      <View style={[s.header, { backgroundColor: Colors.bgHeader, borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: Colors.textPrimary }]}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar */}
        <View style={s.avatarContainer}>
          <TouchableOpacity style={[s.avatar, { backgroundColor: Colors.accent }]} onPress={pickImage}>
            {getAvatarUrl() ? (
              <Image source={{ uri: getAvatarUrl() }} style={s.avatarImage} />
            ) : (
              <Text style={[s.avatarText, { color: Colors.textOnPrimary }]}>{getInitials(user?.name)}</Text>
            )}
            <View style={s.editBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={[s.name, { color: Colors.textPrimary }]}>{user?.name}</Text>
          <Text style={[s.email, { color: Colors.textSecondary }]}>{user?.email}</Text>
          <View style={[s.roleBadge, { backgroundColor: Colors.accent }]}><Text style={s.roleText}>{user?.role}</Text></View>
        </View>

        {/* Fields */}
        <Text style={[s.label, { color: Colors.textSecondary }]}>Phone</Text>
        <TextInput style={[s.input, { backgroundColor: Colors.bgSecondary, color: Colors.textPrimary, borderColor: Colors.border }]} value={phone} onChangeText={setPhone} placeholderTextColor={Colors.textMuted} placeholder="Phone number" keyboardType="phone-pad" />

        <Text style={[s.label, { color: Colors.textSecondary }]}>Education</Text>
        <TextInput style={[s.input, { backgroundColor: Colors.bgSecondary, color: Colors.textPrimary, borderColor: Colors.border }]} value={education} onChangeText={setEducation} placeholderTextColor={Colors.textMuted} placeholder="Education" />

        <Text style={[s.label, { color: Colors.textSecondary }]}>Skills (comma separated)</Text>
        <TextInput style={[s.input, { backgroundColor: Colors.bgSecondary, color: Colors.textPrimary, borderColor: Colors.border }]} value={skills} onChangeText={setSkills} placeholderTextColor={Colors.textMuted} placeholder="React, Node.js, etc." />

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: Colors.accent }, isLoading && s.saveBtnDisabled]} onPress={handleSave} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        {/* My Vouchers Section */}
        <View style={s.docsSection}>
          <View style={s.docsSectionHeader}>
            <Ionicons name="receipt-outline" size={22} color={Colors.accent} />
            <Text style={[s.docsSectionTitle, { color: Colors.textPrimary }]}>My Vouchers</Text>
          </View>
          <Text style={[s.docsSectionSub, { color: Colors.textSecondary }]}>
            Vouchers created by you
          </Text>

          {vouchersLoading ? (
            <View style={s.docsLoading}>
              <ActivityIndicator size="large" color={Colors.accent} />
            </View>
          ) : myVouchers.length === 0 ? (
            <View style={s.docsEmpty}>
              <Text style={[s.docsEmptyText, { color: Colors.textSecondary }]}>No vouchers created yet</Text>
            </View>
          ) : (
            <View style={s.docsList}>
              {myVouchers.map(v => renderVoucherItem(v))}
            </View>
          )}
        </View>

        {/* Shared Documents Section */}
        <View style={s.docsSection}>
          <View style={s.docsSectionHeader}>
            <Ionicons name="folder-open-outline" size={22} color={Colors.accent} />
            <Text style={[s.docsSectionTitle, { color: Colors.textPrimary }]}>Shared Documents</Text>
          </View>
          <Text style={[s.docsSectionSub, { color: Colors.textSecondary }]}>
            All documents shared in your chats
          </Text>

          {docsLoading ? (
            <View style={s.docsLoading}>
              <ActivityIndicator size="large" color={Colors.accent} />
            </View>
          ) : sharedDocs.length === 0 ? (
            <View style={s.docsEmpty}>
              <Ionicons name="document-outline" size={48} color={Colors.textMuted} />
              <Text style={[s.docsEmptyText, { color: Colors.textSecondary }]}>No documents shared yet</Text>
            </View>
          ) : (
            <View style={s.docsList}>
              {sharedDocs.map(doc => renderDocItem(doc))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 0.5 },
  backBtn: { marginRight: Spacing.md },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '700' },
  scroll: { padding: Spacing.xxl, paddingBottom: 60 },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, position: 'relative', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 32, fontWeight: '700' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', width: '100%', height: 30, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: Fonts.sizes.xl, fontWeight: '700' },
  email: { fontSize: Fonts.sizes.sm, marginTop: 4 },
  roleBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  roleText: { color: '#FFF', fontSize: Fonts.sizes.xs, fontWeight: '600' },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '600', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Fonts.sizes.md, borderWidth: 1 },
  saveBtn: { borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFF', fontSize: Fonts.sizes.lg, fontWeight: '700' },
  // Shared Documents Section
  docsSection: { marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.15)' },
  docsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  docsSectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  docsSectionSub: { fontSize: Fonts.sizes.sm, marginBottom: 16 },
  docsLoading: { alignItems: 'center', paddingVertical: 30 },
  docsLoadingText: { fontSize: Fonts.sizes.sm, marginTop: 8 },
  docsEmpty: { alignItems: 'center', paddingVertical: 30 },
  docsEmptyText: { fontSize: Fonts.sizes.md, marginTop: 8 },
  docsList: { gap: 10 },
  docItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, gap: 12 },
  docIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  docMeta: { fontSize: Fonts.sizes.xs, marginTop: 2 },
  docSize: { fontSize: Fonts.sizes.xs, marginTop: 1 },
  downloadBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
