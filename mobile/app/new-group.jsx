import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { Image } from 'react-native';
import { API_BASE_URL } from '@/constants/config';

export default function NewGroupScreen() {
  const { users, fetchUsers, createGroup } = useChatStore();
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState([]);
  const router = useRouter();

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?';

  const toggleUser = (userId) => {
    setSelected(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return Alert.alert('Error', 'Please enter a group name');
    if (selected.length < 2) return Alert.alert('Error', 'Select at least 2 members');
    const r = await createGroup(groupName.trim(), selected);
    if (r.success) router.replace(`/chat/${r.chat.id}`);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>New Group</Text>
      </View>

      {/* Group Name */}
      <View style={s.nameBox}>
        <View style={s.nameAvatar}>
          <Ionicons name="camera" size={24} color={Colors.textMuted} />
        </View>
        <TextInput style={s.nameInput} placeholder="Group name" placeholderTextColor={Colors.textMuted} value={groupName} onChangeText={setGroupName} />
      </View>

      {/* Selected chips */}
      {selected.length > 0 && (
        <View style={s.chipRow}>
          {selected.map(id => {
            const u = users.find(u => u.id === id);
            return (
              <TouchableOpacity key={id} style={s.chip} onPress={() => toggleUser(id)}>
                <Text style={s.chipText}>{u?.name?.split(' ')[0]}</Text>
                <Ionicons name="close" size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput style={s.searchInput} placeholder="Search contacts..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      {/* User list */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          const avatarUrl = item.avatarUrl ? (item.avatarUrl.startsWith('http') ? item.avatarUrl : `${API_BASE_URL}/${item.avatarUrl.replace(/^\//, '')}`) : null;
          return (
            <TouchableOpacity style={s.userItem} onPress={() => toggleUser(item.id)} activeOpacity={0.7}>
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
              <View style={[s.checkBox, isSelected && s.checkBoxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color={Colors.textOnPrimary} />}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Create button */}
      {selected.length >= 2 && (
        <TouchableOpacity style={s.fab} onPress={handleCreate} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={28} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.bgHeader, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  backBtn: { marginRight: Spacing.md },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '700', color: Colors.textPrimary },
  nameBox: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.divider },
  nameAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.bgTertiary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  nameInput: { flex: 1, fontSize: Fonts.sizes.lg, color: Colors.textPrimary, borderBottomWidth: 2, borderBottomColor: Colors.accent, paddingBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgTertiary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, gap: 4 },
  chipText: { fontSize: Fonts.sizes.sm, color: Colors.textPrimary },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.searchBg, borderRadius: BorderRadius.lg, margin: Spacing.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Fonts.sizes.md, marginLeft: Spacing.sm },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.divider },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  avatarText: { color: Colors.textOnPrimary, fontSize: Fonts.sizes.sm, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.textPrimary },
  userDetail: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  checkBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.textMuted, justifyContent: 'center', alignItems: 'center' },
  checkBoxSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
