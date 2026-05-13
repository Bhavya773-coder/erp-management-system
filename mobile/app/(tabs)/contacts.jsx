import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../store/chatStore';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { API_BASE_URL } from '@/constants/config';

export default function ContactsScreen() {
  const { users, fetchUsers, isLoading } = useChatStore();
  const [search, setSearch] = useState('');
  const router = useRouter();
  const Colors = useTheme();

  useEffect(() => { fetchUsers(); }, []);
  const onRefresh = useCallback(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?';

  const handleStartChat = async (userId) => {
    const r = await useChatStore.getState().createIndividualChat(userId);
    if (r.success) router.push(`/chat/${r.chat.id}`);
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: Colors.bgPrimary }]} edges={['top']}>
      <View style={[s.header, { backgroundColor: Colors.bgHeader, borderBottomColor: Colors.border }]}>
        <Text style={[s.title, { color: Colors.textPrimary }]}>Contacts</Text>
        <Text style={[s.count, { color: Colors.textSecondary }]}>{users.length} total</Text>
      </View>
      <View style={[s.searchBox, { backgroundColor: Colors.searchBg }]}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput 
          style={[s.searchInput, { color: Colors.textPrimary }]} 
          placeholder="Search..." 
          placeholderTextColor={Colors.textMuted} 
          value={search} 
          onChangeText={setSearch} 
        />
      </View>
      <FlatList 
        data={filtered} 
        keyExtractor={i => i.id || i._id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
        renderItem={({ item }) => {
          const avatarUrl = item.avatarUrl 
            ? (item.avatarUrl.startsWith('http') ? item.avatarUrl : `${API_BASE_URL}/${item.avatarUrl.replace(/^\//, '')}`) 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=random&color=fff`;
          return (
            <TouchableOpacity style={[s.userItem, { borderBottomColor: Colors.divider }]} onPress={() => handleStartChat(item.id || item._id)} activeOpacity={0.7}>
              <View style={[s.avatar, { backgroundColor: Colors.primaryLight }]}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={s.avatarImage} />
                ) : (
                  <Text style={[s.avatarText, { color: Colors.textOnPrimary }]}>{getInitials(item.name)}</Text>
                )}
              </View>
              <View style={s.userInfo}>
                <Text style={[s.userName, { color: Colors.textPrimary }]}>{item.name}</Text>
                <Text style={[s.userDetail, { color: Colors.textSecondary }]}>{item.role || 'User'} • {item.phone || item.email}</Text>
              </View>
              <Ionicons name="chatbubble-outline" size={20} color={Colors.accent} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={s.empty}><Text style={[s.emptyText, { color: Colors.textMuted }]}>No contacts found</Text></View>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 0.5 },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '700' },
  count: { fontSize: Fonts.sizes.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.lg, margin: Spacing.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchInput: { flex: 1, fontSize: Fonts.sizes.md, marginLeft: Spacing.sm },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: Fonts.sizes.md, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  userDetail: { fontSize: Fonts.sizes.sm, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: Fonts.sizes.md },
});
