import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  TextInput, FlatList, ActivityIndicator, Dimensions, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../../store/chatStore';
import { useAuthStore } from '../../../store/authStore';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { API_BASE_URL } from '@/constants/config';
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');
const GRID_SIZE = (width - 4) / 3;

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 0.5 },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', marginLeft: Spacing.md },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl },
  largeAvatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, overflow: 'hidden' },
  largeAvatarImage: { width: '100%', height: '100%' },
  largeAvatarText: { fontSize: 32, fontWeight: '700' },
  profileName: { fontSize: Fonts.sizes.xl, fontWeight: '700' },
  profileStatus: { fontSize: Fonts.sizes.md, marginTop: 4 },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 0.5 },
  tab: { paddingVertical: Spacing.md, flex: 1, alignItems: 'center' },
  tabLabel: { fontWeight: '700', fontSize: Fonts.sizes.sm },
  list: { paddingBottom: Spacing.xl },
  mediaItem: { width: GRID_SIZE, height: GRID_SIZE, margin: 1 },
  mediaImage: { width: '100%', height: '100%' },
  docItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, marginHorizontal: Spacing.md, marginVertical: 4 },
  docInfo: { marginLeft: Spacing.md, flex: 1 },
  docName: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  docMeta: { fontSize: Fonts.sizes.xs, marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: Spacing.md, paddingHorizontal: Spacing.md, height: 44, borderRadius: BorderRadius.md },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: Fonts.sizes.md },
  searchResult: { padding: Spacing.md, borderBottomWidth: 0.5, marginHorizontal: Spacing.md },
  resultDate: { fontSize: Fonts.sizes.xs, marginBottom: 4 },
  resultText: { fontSize: Fonts.sizes.md },
  viewerContainer: { flex: 1, backgroundColor: '#000' },
  viewerHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  viewerClose: { padding: Spacing.sm },
  viewerSender: { color: '#FFF', fontSize: Fonts.sizes.md, fontWeight: '700' },
  viewerDate: { color: '#CCC', fontSize: Fonts.sizes.xs },
  viewerSlide: { width, height: height - 100, justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '100%' }
});

export default function ChatInfoScreen() {
  const { id: chatId } = useLocalSearchParams();
  const router = useRouter();
  const Colors = useTheme();
  
  const { user } = useAuthStore();
  const { currentChat, getChatMedia, searchMessages } = useChatStore();
  
  const [activeTab, setActiveTab] = useState('MEDIA'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [media, setMedia] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const otherUser = useMemo(() => {
    if (!currentChat || currentChat.isGroup) return null;
    const myId = user?.id || user?._id;
    return currentChat.members?.find(m => (m.user?.id || m.user?._id) !== myId)?.user || currentChat.members?.[0]?.user;
  }, [currentChat, user]);

  const chatName = currentChat?.isGroup ? currentChat.name : (otherUser?.name || 'Chat Info');
  const avatarUrl = currentChat?.isGroup ? null : (otherUser?.avatar?.startsWith('http') ? otherUser.avatar : (otherUser?.avatar ? `${API_BASE_URL}${otherUser.avatar}` : null));

  useEffect(() => {
    loadContent();
  }, [chatId]);

  const loadContent = async () => {
    setLoading(true);
    const data = await getChatMedia(chatId);
    setMedia(data.media || []);
    setDocs(data.docs || []);
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await searchMessages(chatId, searchQuery);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openViewer = (idx) => {
    setViewerIndex(idx);
    setViewerVisible(true);
  };

  const chatImages = useMemo(() => {
    return media.map(m => ({
      id: m.id || m._id,
      url: m.fileUrl?.startsWith('http') ? m.fileUrl : `${API_BASE_URL}${m.fileUrl}`,
      sender: m.sender?.name,
      time: m.createdAt
    }));
  }, [media]);

  const HeaderComponent = useMemo(() => {
    const initials = chatName ? chatName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0,2).toUpperCase() : '?';

    return (
      <View style={{ backgroundColor: Colors.bgPrimary }}>
        <View style={s.profileHeader}>
          <View style={[s.largeAvatar, { backgroundColor: Colors.primaryLight }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.largeAvatarImage} />
            ) : (
              <Text style={[s.largeAvatarText, { color: Colors.textOnPrimary }]}>{initials}</Text>
            )}
          </View>
          <Text style={[s.profileName, { color: Colors.textPrimary }]}>{chatName}</Text>
          <Text style={[s.profileStatus, { color: Colors.textSecondary }]}>
            {currentChat?.isGroup ? `${currentChat.members?.length} participants` : (otherUser?.isOnline ? 'Online' : 'Offline')}
          </Text>
        </View>

        <View style={[s.tabs, { borderBottomColor: Colors.divider }]}>
          {['MEDIA', 'DOCS', 'SEARCH'].map(tab => (
            <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && { borderBottomColor: Colors.accent, borderBottomWidth: 3 }]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabLabel, { color: activeTab === tab ? Colors.accent : Colors.textSecondary }]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'SEARCH' && (
          <View style={[s.searchBar, { backgroundColor: Colors.bgSecondary }]}>
            <Ionicons name="search" size={20} color={Colors.textMuted} />
            <TextInput style={[s.searchInput, { color: Colors.textPrimary, paddingVertical: 8 }]} placeholder="Search..." placeholderTextColor={Colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={handleSearch} returnKeyType="search" />
          </View>
        )}
      </View>
    );
  }, [chatName, activeTab, Colors, searchQuery, loading, currentChat, otherUser, avatarUrl]);

  const renderItem = ({ item, index }) => {
    const itemId = item.id || item._id;
    if (activeTab === 'MEDIA') {
      const fullUrl = item.fileUrl?.startsWith('http') ? item.fileUrl : `${API_BASE_URL}${item.fileUrl}`;
      return (
        <TouchableOpacity style={s.mediaItem} onPress={() => openViewer(index)}>
          <Image source={{ uri: fullUrl }} style={s.mediaImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    if (activeTab === 'DOCS') {
      return (
        <TouchableOpacity style={[s.docItem, { backgroundColor: Colors.bgSecondary }]}>
          <Ionicons name="document-text" size={24} color={Colors.accent} />
          <View style={s.docInfo}>
            <Text style={[s.docName, { color: Colors.textPrimary }]} numberOfLines={1}>{item.fileName}</Text>
            <Text style={[s.docMeta, { color: Colors.textSecondary }]}>{item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : ''} • {format(new Date(item.createdAt), 'MMM d')}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    if (activeTab === 'SEARCH') {
      return (
        <TouchableOpacity style={[s.searchResult, { borderBottomColor: Colors.divider }]} onPress={() => router.push({ pathname: `/chat/${chatId}`, params: { msgId: itemId } })}>
          <Text style={[s.resultDate, { color: Colors.textMuted }]}>{format(new Date(item.createdAt), 'MMM d, HH:mm')}</Text>
          <Text style={[s.resultText, { color: Colors.textPrimary }]}>{item.content}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: Colors.bgPrimary }]} edges={['top']}>
      <View style={[s.header, { backgroundColor: Colors.bgHeader, borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={[s.headerTitle, { color: Colors.textPrimary }]}>Info</Text>
      </View>
      <FlatList data={activeTab === 'MEDIA' ? media : activeTab === 'DOCS' ? docs : searchResults} key={activeTab} numColumns={activeTab === 'MEDIA' ? 3 : 1} ListHeaderComponent={HeaderComponent} renderItem={renderItem} keyExtractor={item => item.id || item._id} contentContainerStyle={s.list} />
      <Modal visible={viewerVisible} transparent animationType="fade">
        <SafeAreaView style={s.viewerContainer}>
          <View style={s.viewerHeader}>
            <TouchableOpacity onPress={() => setViewerVisible(false)} style={s.viewerClose}><Ionicons name="close" size={30} color="#FFF" /></TouchableOpacity>
            <View><Text style={s.viewerSender}>{chatImages[viewerIndex]?.sender}</Text><Text style={s.viewerDate}>{chatImages[viewerIndex]?.time ? format(new Date(chatImages[viewerIndex].time), 'PPp') : ''}</Text></View>
          </View>
          <FlatList data={chatImages} horizontal pagingEnabled initialScrollIndex={viewerIndex} getItemLayout={(d, i) => ({ length: width, offset: width * i, i })} onMomentumScrollEnd={(e) => setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / width))} renderItem={({ item }) => <View style={s.viewerSlide}><Image source={{ uri: item.url }} style={s.viewerImage} resizeMode="contain" /></View>} keyExtractor={item => item.id} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
