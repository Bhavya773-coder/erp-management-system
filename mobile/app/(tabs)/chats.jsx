import { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { API_BASE_URL } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';

export default function ChatsScreen() {
  const { chats, fetchChats, isLoading, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'UNREAD', 'GROUPS'
  const router = useRouter();
  const Colors = useTheme();
  const myId = user?.id || user?._id;

  useEffect(() => {
    fetchChats();
  }, []);

  const onRefresh = useCallback(() => {
    fetchChats();
  }, [fetchChats]);

  const filteredChats = useMemo(() => {
    if (filter === 'UNREAD') return chats.filter(c => (c.unreadCount || 0) > 0);
    if (filter === 'GROUPS') return chats.filter(c => c.isGroup);
    return chats;
  }, [chats, filter]);

  const renderChatItem = ({ item: chat }) => {
    const isGroup = chat.isGroup;
    const otherMember = chat.members?.find(m => (m.user?.id || m.user?._id)?.toString() !== myId?.toString())?.user;
    const chatName = isGroup ? chat.name : (chat.name || otherMember?.name || 'Chat');
    const avatar = isGroup ? chat.avatarUrl : otherMember?.avatarUrl;
    const avatarUrl = avatar 
      ? (avatar.startsWith('http') ? avatar : `${API_BASE_URL}/${avatar.replace(/^\//, '')}`) 
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(chatName)}&background=random&color=fff`;
    const lastMsg = chat.lastMessage;
    const unreadCount = chat.unreadCount || 0;
    
    const typingList = (typingUsers[chat.id] || []).filter(uid => uid.toString() !== myId?.toString());
    const isTyping = typingList.length > 0;

    const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?';

    const getPreview = () => {
      if (isTyping) return 'typing...';
      if (!lastMsg) return 'No messages yet';
      if (lastMsg.isDeleted) return '🚫 Deleted';
      if (lastMsg.messageType === 'IMAGE') return '📷 Photo';
      if (lastMsg.messageType === 'FILE') {
        const name = lastMsg.fileName || lastMsg.content || 'Document';
        const maxLen = 20;
        return `📎 ${name.length > maxLen ? name.substring(0, maxLen) + '...' : name}`;
      }
      if (lastMsg.messageType === 'SCHEDULE') return '📅 Schedule';
      if (lastMsg.messageType === 'VOUCHER') return `🎫 Voucher ${lastMsg.voucherData?.number || ''}`;
      if (lastMsg.messageType === 'TASK') return `⏰ Task: ${lastMsg.taskData?.title || 'Assigned'}`;
      return lastMsg.content || '';
    };

    return (
      <TouchableOpacity
        style={[s.chatItem, { borderBottomColor: Colors.divider }]}
        onPress={() => router.push(`/chat/${chat.id}`)}
      >
        <View style={[s.avatar, { backgroundColor: Colors.primaryLight }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatarImage} />
          ) : isGroup ? (
            <Ionicons name="people" size={24} color={Colors.textOnPrimary} />
          ) : (
            <Text style={[s.avatarText, { color: Colors.textOnPrimary }]}>{getInitials(chatName)}</Text>
          )}
          {!isGroup && otherMember?.isOnline && <View style={[s.onlineDot, { borderColor: Colors.bgPrimary, backgroundColor: Colors.online }]} />}
        </View>

        <View style={s.chatInfo}>
          <View style={s.chatHeader}>
            <Text style={[s.chatName, { color: Colors.textPrimary }]} numberOfLines={1}>{chatName}</Text>
            {lastMsg && (
              <Text style={[s.chatTime, unreadCount > 0 ? { color: Colors.accent } : { color: Colors.textMuted }]}>
                {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
              </Text>
            )}
          </View>

          <View style={s.chatFooter}>
            <Text style={[s.lastMsg, (isTyping || unreadCount > 0) ? { color: unreadCount > 0 ? Colors.textPrimary : Colors.accent, fontWeight: unreadCount > 0 ? '600' : '600' } : { color: Colors.textSecondary }]} numberOfLines={1}>
              {getPreview()}
            </Text>
            {unreadCount > 0 && (
              <View style={[s.unreadBadge, { backgroundColor: Colors.unreadBadge }]}>
                <Text style={[s.unreadText, { color: Colors.bgPrimary }]}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterBtn = ({ type, label }) => (
    <TouchableOpacity 
      style={[s.filterBtn, filter === type ? { backgroundColor: Colors.accent + '20' } : { backgroundColor: Colors.bgSecondary }]} 
      onPress={() => setFilter(type)}
    >
      <Text style={[s.filterBtnText, { color: filter === type ? Colors.accent : Colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: Colors.bgPrimary }]} edges={['top']}>
      <View style={[s.header, { backgroundColor: Colors.bgHeader, borderBottomColor: Colors.border }]}>
        <Text style={[s.headerTitle, { color: Colors.textPrimary }]}>Arcadian Chat</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/new-chat')}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          <FilterBtn type="ALL" label="All" />
          <FilterBtn type="UNREAD" label="Unread" />
          <FilterBtn type="GROUPS" label="Groups" />
        </ScrollView>
      </View>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={onRefresh} 
            tintColor={Colors.accent} 
            colors={[Colors.accent]} 
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="chatbubbles-outline" size={64} color={Colors.textMuted} />
            <Text style={[s.emptyText, { color: Colors.textSecondary }]}>
              {filter === 'UNREAD' ? 'No unread chats' : 'No chats yet'}
            </Text>
            {filter === 'ALL' && (
              <TouchableOpacity 
                style={[s.startBtn, { backgroundColor: Colors.primary }]}
                onPress={() => router.push('/new-chat')}
              >
                <Text style={[s.startBtnText, { color: Colors.textOnPrimary }]}>Start Chatting</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    marginLeft: Spacing.lg,
  },
  list: {
    paddingBottom: Spacing.xl,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    flex: 1,
  },
  chatTime: {
    fontSize: Fonts.sizes.xs,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsg: {
    fontSize: Fonts.sizes.md,
    flex: 1,
    marginRight: Spacing.md,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  filterScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  filterBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 0,
  },
  filterBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: Fonts.sizes.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  startBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  startBtnText: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
  },
});
