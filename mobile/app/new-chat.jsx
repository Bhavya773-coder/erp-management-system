import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { Image } from 'react-native';
import { API_BASE_URL } from '@/constants/config';

export default function NewChatScreen() {
  const { users, fetchUsers } = useChatStore();
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?';

  const handleSelect = async (userId) => {
    const r = await useChatStore.getState().createIndividualChat(userId);
    if (r.success) {
      router.replace(`/chat/${r.chat.id}`);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>New Chat</Text>
      </View>
      <View style={s.searchBox}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput style={s.searchInput} placeholder="Search contacts..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} autoFocus />
      </View>

      {/* New Group option */}
      <TouchableOpacity style={s.optionItem} onPress={() => { router.back(); router.push('/new-group'); }}>
        <View style={[s.optAvatar, { backgroundColor: Colors.accent }]}>
          <Ionicons name="people" size={22} color={Colors.textOnPrimary} />
        </View>
        <Text style={s.optText}>New Group</Text>
      </TouchableOpacity>

      <Text style={s.sectionLabel}>CONTACTS</Text>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const avatarUrl = item.avatarUrl ? (item.avatarUrl.startsWith('http') ? item.avatarUrl : `${API_BASE_URL}/${item.avatarUrl.replace(/^\//, '')}`) : null;
          return (
            <TouchableOpacity style={s.userItem} onPress={() => handleSelect(item.id)} activeOpacity={0.7}>
              <View style={[s.avatar, { overflow: 'hidden' }]}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={s.avatarText}>{getInitials(item.name)}</Text>
                )}
              </View>
              <View style={s.userInfo}>
                <Text style={s.userName}>{item.name}</Text>
                <Text style={s.userDetail}>{item.role}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No contacts found</Text></View>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.bgHeader, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  backBtn: { marginRight: Spacing.md },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '700', color: Colors.textPrimary },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.searchBg, borderRadius: BorderRadius.lg, margin: Spacing.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Fonts.sizes.md, marginLeft: Spacing.sm },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.divider },
  optAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  optText: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.textPrimary },
  sectionLabel: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textMuted, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, letterSpacing: 1 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.divider },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  avatarText: { color: Colors.textOnPrimary, fontSize: Fonts.sizes.md, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.textPrimary },
  userDetail: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: Fonts.sizes.md },
});
