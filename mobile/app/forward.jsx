import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { messageAPI } from '../lib/api';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 0.5 },
  backBtn: { padding: Spacing.sm },
  headerTitleBox: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  selectedCount: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, height: 44 },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: Fonts.sizes.md },
  list: { paddingBottom: Spacing.xl },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  avatarText: { fontSize: Fonts.sizes.md, fontWeight: '700' },
  checkBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: Fonts.sizes.md, fontWeight: '700' },
  chatSub: { fontSize: Fonts.sizes.sm, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
});

export default function ForwardScreen() {
  const { messageIds: idsString } = useLocalSearchParams();
  const router = useRouter();
  const Colors = useTheme();
  const { chats, fetchChats } = useChatStore();
  
  const [search, setSearch] = useState('');
  const [selectedChats, setSelectedChats] = useState([]);
  const [forwarding, setForwarding] = useState(false);

  // Convert comma-separated string back to array
  const messageIds = idsString ? idsString.split(',') : [];

  useEffect(() => {
    fetchChats();
  }, []);

  const filteredChats = chats.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.members?.some(m => m.user?.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelect = (chatId) => {
    if (selectedChats.includes(chatId)) {
      setSelectedChats(prev => prev.filter(id => id !== chatId));
    } else {
      setSelectedChats(prev => [...prev, chatId]);
    }
  };

  const handleForward = async () => {
    if (selectedChats.length === 0 || messageIds.length === 0) {
      console.log('⚠️ Nothing to forward:', { selectedChats, messageIds });
      return;
    }
    
    setForwarding(true);
    try {
      const validMessageIds = messageIds.filter(id => id && id !== 'undefined');
      
      if (validMessageIds.length === 0) {
        throw new Error('No valid message IDs found');
      }

      await messageAPI.forwardBulk(validMessageIds, selectedChats);
      
      setForwarding(false);
      Alert.alert('Success', `Forwarded to ${selectedChats.length} chats`);
      router.back();
    } catch (error) {
      console.error('Forward error details:', error.response?.data || error.message);
      setForwarding(false);
      Alert.alert('Error', 'Failed to forward messages');
    }
  };

  const renderChatItem = ({ item: chat }) => {
    const isSelected = selectedChats.includes(chat.id);
    const initials = (chat.name || 'C').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();

    return (
      <TouchableOpacity 
        style={[s.chatItem, { borderBottomColor: Colors.divider }]} 
        onPress={() => toggleSelect(chat.id)}
      >
        <View style={[s.avatar, { backgroundColor: Colors.primaryLight }]}>
          {chat.isGroup 
            ? <Ionicons name="people" size={24} color={Colors.textOnPrimary} />
            : <Text style={[s.avatarText, { color: Colors.textOnPrimary }]}>{initials}</Text>}
          {isSelected && (
            <View style={[s.checkBadge, { backgroundColor: Colors.accent, borderColor: Colors.bgPrimary }]}>
              <Ionicons name="checkmark" size={12} color={Colors.textOnPrimary} />
            </View>
          )}
        </View>
        <View style={s.chatInfo}>
          <Text style={[s.chatName, { color: Colors.textPrimary }]}>{chat.name || 'Chat'}</Text>
          <Text style={[s.chatSub, { color: Colors.textSecondary }]}>
            {chat.isGroup ? `${chat.members?.length} members` : 'Personal Chat'}
          </Text>
        </View>
        <Ionicons 
          name={isSelected ? "checkbox" : "square-outline"} 
          size={24} 
          color={isSelected ? Colors.accent : Colors.textMuted} 
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: Colors.bgPrimary }]} edges={['top']}>
      <View style={[s.header, { backgroundColor: Colors.bgHeader, borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerTitleBox}>
          <Text style={[s.headerTitle, { color: Colors.textPrimary }]}>Forward to...</Text>
          {selectedChats.length > 0 && (
            <Text style={[s.selectedCount, { color: Colors.accent }]}>{selectedChats.length} selected</Text>
          )}
        </View>
        {selectedChats.length > 0 && (
          <TouchableOpacity 
            style={[s.sendBtn, { backgroundColor: Colors.accent }]} 
            onPress={handleForward}
            disabled={forwarding}
          >
            {forwarding 
              ? <ActivityIndicator color={Colors.textOnPrimary} size="small" />
              : <Ionicons name="send" size={20} color={Colors.textOnPrimary} />}
          </TouchableOpacity>
        )}
      </View>

      <View style={[s.searchBar, { backgroundColor: Colors.bgSecondary }]}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: Colors.textPrimary }]}
          placeholder="Search chats..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ color: Colors.textSecondary }}>No chats found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
