import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal,
  Image, Dimensions, Share, Keyboard, BackHandler
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import { fileAPI } from '../../lib/api';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { API_BASE_URL } from '@/constants/config';
import { format, differenceInSeconds, isValid } from 'date-fns';
// Audio migration pending expo-audio install
// import { Audio } from 'expo-av';
import VoucherModal from '../../components/VoucherModal';
import VoucherDetailModal from '../../components/VoucherDetailModal';
import TaskModal from '../../components/TaskModal';
import TaskDetailModal from '../../components/TaskDetailModal';
import * as IntentLauncher from 'expo-intent-launcher';

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

const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  const d = new Date(timeStr);
  return isValid(d) ? format(d, 'HH:mm') : '--:--';
};

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}/${url.replace(/^\//, '')}`;
};

const getAvatarUrl = (currentChat, otherUser) => {
  const name = currentChat?.isGroup ? currentChat?.name : otherUser?.name;
  const avatar = currentChat?.isGroup ? currentChat?.avatarUrl : otherUser?.avatarUrl;
  if (avatar) {
    return avatar.startsWith('http') ? avatar : `${API_BASE_URL}/${avatar.replace(/^\//, '')}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;
};

const LiveTimer = ({ endTime, completedAt, status }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (status !== 'PENDING') return;
    let int;
    const update = () => {
      const diff = Math.max(0, new Date(endTime).getTime() - Date.now());
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        if (int) clearInterval(int);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      let str = '';
      if (d > 0) str += `${d}d `;
      str += `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      setTimeLeft(str);
    };
    update();
    int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, [endTime, status]);

  if (status === 'COMPLETED') return <Text style={{ color: '#FFF', fontWeight: 'bold' }}>COMPLETED at {formatTime(completedAt)}</Text>;
  
  const diff = Math.max(0, new Date(endTime).getTime() - Date.now());
  if (diff <= 0) return <Text style={{ color: '#FFF', fontWeight: 'bold' }}>EXPIRED</Text>;

  return <Text style={{ color: '#FFF', fontWeight: 'bold' }}>PENDING: ends in {timeLeft || '--:--:--'}</Text>;
};

const { width, height } = Dimensions.get('window');

const s = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 0.5 },
  backBtn: { padding: Spacing.sm },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  headerAvatarText: { fontWeight: '700', fontSize: Fonts.sizes.md },
  headerInfo: { flex: 1 },
  headerName: { fontSize: Fonts.sizes.md, fontWeight: '700' },
  headerStatus: { fontSize: Fonts.sizes.xs },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', marginLeft: Spacing.sm },
  selectionActions: { flexDirection: 'row' },
  headerAction: { padding: Spacing.md },
  messageList: { paddingVertical: Spacing.sm },
  loadMore: { padding: Spacing.md, alignItems: 'center' },
  loadMoreText: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
  bubbleWrapper: { paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  bubble: { maxWidth: '80%', padding: Spacing.md, borderRadius: BorderRadius.lg },
  senderName: { fontSize: Fonts.sizes.xs, fontWeight: '700', marginBottom: 4 },
  msgText: { fontSize: Fonts.sizes.md, lineHeight: 20 },
  imageBox: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  messageImage: { width: width * 0.6, height: width * 0.6, borderRadius: BorderRadius.sm },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 10, minWidth: 220, marginBottom: 4 },
  fileIconWrapper: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700' },
  fileSize: { fontSize: 11, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  time: { fontSize: Fonts.sizes.xs },
  tick: { marginLeft: 4 },
  forwardBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  forwardText: { fontSize: Fonts.sizes.xs, marginLeft: 4, fontStyle: 'italic' },
  deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deletedText: { fontSize: Fonts.sizes.sm, fontStyle: 'italic' },
  voucherBox: { padding: 12, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: BorderRadius.lg, width: 240 },
  voucherHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  voucherNum: { fontSize: 14, fontWeight: '700', flex: 1 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusTagText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  voucherAmt: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  voucherMeta: { fontSize: 11 },
  voucherBtn: { paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
  voucherBtnText: { fontSize: 13, fontWeight: '700' },
  voucherStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 6, paddingTop: 4, backgroundColor: 'transparent' },
  inputBubble: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#FFF', borderRadius: 28, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 4, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 },
  attachBtn: { padding: 8, marginRight: 4 },
  textInput: { flex: 1, fontSize: 16, maxHeight: 120, paddingTop: 8, paddingBottom: 8, color: '#000' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginLeft: 6, marginBottom: 4, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 },
  attachMenu: { flexDirection: 'row', padding: Spacing.lg, borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, justifyContent: 'space-around' },
  attachItem: { alignItems: 'center' },
  attachIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  viewerContainer: { flex: 1, backgroundColor: '#000' },
  viewerHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, backgroundColor: 'rgba(0,0,0,0.5)' },
  viewerClose: { padding: Spacing.sm },
  viewerSender: { color: '#FFF', fontSize: Fonts.sizes.md, fontWeight: '700' },
  viewerDate: { color: '#CCC', fontSize: Fonts.sizes.xs },
  viewerAction: { padding: Spacing.sm },
  viewerSlide: { width, height: height - 100, justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '100%' }
});

const MessageItem = memo(({ msg, myId, currentChat, isMe, Colors, isSelected, isSelectionMode, onLongPress, onPress, onImagePress, onVoucherAction, onTaskAction, onDownload, userRole, setSelectedVoucher, progress, isDownloaded }) => {
  const showSender = currentChat?.isGroup && !isMe;
  const time = msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : '';

  const getTick = () => {
    if (!isMe) return null;
    switch (msg.status) {
      case 'SEEN': return { name: 'checkmark-done', color: Colors.seen };
      case 'DELIVERED': return { name: 'checkmark-done', color: Colors.sent };
      default: return { name: 'checkmark', color: Colors.sent };
    }
  };
  const tick = getTick();

  return (
    <TouchableOpacity
      style={[
        s.bubbleWrapper, 
        isSelected && { backgroundColor: 'rgba(33, 150, 243, 0.15)' },
        isSelectionMode && { flexDirection: 'row', alignItems: 'center' }
      ]}
      onLongPress={() => onLongPress(msg)}
      onPress={() => (isSelectionMode ? onPress(msg) : (msg.messageType === 'IMAGE' ? onImagePress(msg) : onPress(msg)))}
      activeOpacity={0.8}
      delayLongPress={400}
    >
      {isSelectionMode && (
        <View style={{ marginRight: 12, marginLeft: 4 }}>
          <Ionicons 
            name={isSelected ? "checkbox" : "square-outline"} 
            size={24} 
            color={isSelected ? Colors.accent : Colors.textMuted} 
          />
        </View>
      )}
      <View style={[
        s.bubble, 
        isMe ? { backgroundColor: Colors.bgBubbleOutgoing, alignSelf: 'flex-end', borderBottomRightRadius: 4 } : { backgroundColor: Colors.bgBubbleIncoming, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
        isSelected && { backgroundColor: 'rgba(33, 150, 243, 0.1)' }
      ]}>
        {msg.forwarded && (
          <View style={s.forwardBadge}>
            <Ionicons name="arrow-redo" size={12} color={Colors.textMuted} />
          </View>
        )}
        {showSender && <Text style={[s.senderName, { color: Colors.accent }]}>{msg.sender?.name}</Text>}
        {msg.isDeleted ? (
          <View style={s.deletedRow}><Ionicons name="ban" size={14} color={Colors.textMuted} /><Text style={[s.deletedText, { color: Colors.textMuted }]}>Deleted</Text></View>
        ) : msg.messageType === 'IMAGE' ? (
          <View style={s.imageBox}>
            {msg.fileUrl && msg.fileUrl.includes(',') ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 210, justifyContent: 'space-between' }}>
                {msg.fileUrl.split(',').slice(0, 4).map((url, idx, arr) => {
                  const fullUrl = getMediaUrl(url);
                  const total = msg.fileUrl.split(',').length;
                  return (
                    <TouchableOpacity key={idx} activeOpacity={0.8} onPress={() => onImagePress(msg, fullUrl)} style={{ width: 100, height: 100, marginBottom: 5 }}>
                      <Image source={{ uri: fullUrl }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                      {idx === 3 && total > 4 && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>+{total - 4}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={() => onImagePress(msg, getMediaUrl(msg.fileUrl))}>
                <Image source={{ uri: getMediaUrl(msg.fileUrl) }} style={s.messageImage} />
              </TouchableOpacity>
            )}
            {msg.content && <Text style={[s.msgText, { color: Colors.textPrimary, marginTop: 4 }]}>{msg.content}</Text>}
          </View>
        ) : msg.messageType === 'FILE' ? (
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => onDownload(msg)}
            style={[s.fileBox, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }]}
          >
            <View style={[s.fileIconWrapper, { backgroundColor: Colors.accent }]}>
              <Ionicons name="document-text" size={24} color="#FFF" />
            </View>
            <View style={s.fileInfo}>
              <Text style={[s.fileName, { color: Colors.textPrimary }]} numberOfLines={2} ellipsizeMode="middle">
                {msg.fileName || msg.content || msg.fileUrl?.split('/').pop() || 'Document'}
              </Text>
              {progress !== undefined ? (
                <View style={{ marginTop: 4 }}>
                  <View style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: Colors.accent }} />
                  </View>
                  <Text style={{ fontSize: 10, color: Colors.textSecondary, marginTop: 2 }}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
              ) : (
                <Text style={[s.fileSize, { color: Colors.textSecondary }]}>
                  {msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : 'Document'}
                </Text>
              )}
            </View>
            <View style={{ backgroundColor: Colors.accent + '20', borderRadius: 20, padding: 8 }}>
              <Ionicons 
                name={isDownloaded ? "eye-outline" : progress !== undefined ? "sync-outline" : "download-outline"} 
                size={20} 
                color={Colors.accent} 
              />
            </View>
          </TouchableOpacity>
        ) : msg.messageType === 'TASK' ? (
          <View style={[s.voucherBox, { backgroundColor: Colors.bgSecondary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="alarm" size={24} color="#FF9800" style={{ marginRight: 8 }} />
              <Text style={{ color: Colors.textPrimary, fontWeight: 'bold', fontSize: 16, flex: 1 }}>{msg.taskData?.title}</Text>
            </View>
            <Text style={{ color: Colors.textSecondary, marginBottom: 4 }}>Assigned to: {msg.taskData?.assignedToName}</Text>
            {msg.taskData?.description ? <Text style={{ color: Colors.textPrimary, marginBottom: 8 }}>{msg.taskData.description}</Text> : null}
            
            <View style={[s.voucherStatusBadge, { backgroundColor: msg.taskData?.status === 'PENDING' ? '#FF9800' : '#4CAF50' }]}>
              <LiveTimer endTime={msg.taskData?.endTime} status={msg.taskData?.status} completedAt={msg.taskData?.completedAt} />
            </View>
            
            {msg.taskData?.status === 'PENDING' && (msg.taskData?.assignedTo === myId || msg.taskData?.assignedTo?._id === myId) && (
              <TouchableOpacity style={[s.voucherBtn, { backgroundColor: '#4CAF50', marginTop: 8 }]} onPress={() => onTaskAction(msg.id || msg._id, 'COMPLETED')}>
                <Text style={s.voucherBtnText}>Mark Completed</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : msg.messageType === 'VOUCHER' ? (
          <View style={[s.voucherBox, { backgroundColor: Colors.bgSecondary }]}>
            <View style={s.voucherHeader}>
              <Ionicons name="receipt" size={24} color={Colors.accent} style={{ marginRight: 8 }} />
              <Text style={[s.voucherNum, { color: Colors.textPrimary }]}>{msg.voucherData?.number}</Text>
              <View style={[s.statusTag, { backgroundColor: msg.voucherData?.status === 'APPROVED' ? '#4CAF50' : msg.voucherData?.status === 'DENIED' ? '#F44336' : Colors.accent }]}>
                <Text style={s.statusTagText}>{msg.voucherData?.status}</Text>
              </View>
            </View>
            <Text style={[s.voucherAmt, { color: Colors.accent }]}>₹{msg.voucherData?.amount?.toLocaleString('en-IN')}</Text>
            <Text style={[s.voucherMeta, { color: Colors.textSecondary }]}>Prepared by: {msg.voucherData?.preparedBy || msg.sender?.name || 'Unknown'}</Text>
            {msg.voucherData?.approvedBy && (
              <Text style={[s.voucherMeta, { color: Colors.textSecondary, marginTop: 2 }]}>Approved by: {msg.voucherData.approvedBy}</Text>
            )}
            <TouchableOpacity 
              style={[s.voucherBtn, { backgroundColor: Colors.accent + '20', marginTop: 12 }]} 
              onPress={() => setSelectedVoucher(msg)}
            >
              <Text style={[s.voucherBtnText, { color: Colors.accent }]}>View Details</Text>
            </TouchableOpacity>
            
            {msg.voucherData?.status === 'PENDING' && (userRole === 'ADMIN' || userRole === 'ACCOUNTS') && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity 
                  style={[s.voucherBtn, { backgroundColor: '#4CAF50', flex: 1 }]} 
                  onPress={() => onVoucherAction(msg.id || msg._id, 'APPROVED')}
                >
                  <Text style={s.voucherBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.voucherBtn, { backgroundColor: '#F44336', flex: 1 }]} 
                  onPress={() => onVoucherAction(msg.id || msg._id, 'DENIED')}
                >
                  <Text style={s.voucherBtnText}>Deny</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <Text style={[s.msgText, { color: Colors.textPrimary }]}>{msg.content}</Text>
        )}
        <View style={s.meta}>
          <Text style={[s.time, { color: Colors.textMuted }]}>{time}</Text>
          {tick && <Ionicons name={tick.name} size={15} color={tick.color} style={s.tick} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => {
  return prev.isSelected === next.isSelected && 
         prev.isSelectionMode === next.isSelectionMode &&
         prev.msg.status === next.msg.status && 
         prev.msg.voucherData?.status === next.msg.voucherData?.status &&
         prev.msg.taskData?.status === next.msg.taskData?.status &&
         prev.userRole === next.userRole &&
         prev.progress === next.progress &&
         prev.isDownloaded === next.isDownloaded &&
         prev.msg.id === next.msg.id;
});

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef(null);
  const Colors = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const { currentChat, messages, fetchChat, typingUsers, addMessage, loadMoreMessages, hasMore, isLoading } = useChatStore();
  const { socket, joinChat, leaveChat, sendMessage, startTyping, stopTyping, markMessagesSeen, deleteMessageSocket, sendVoucherAction, onTaskAction } = useSocket(token);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [kbVisible, setKbVisible] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [voucherVisible, setVoucherVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [ringingTask, setRingingTask] = useState(null);
  const soundRef = useRef(null);
  const vibrationIntervalRef = useRef(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherDetailVisible, setVoucherDetailVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailVisible, setTaskDetailVisible] = useState(false);
  const [downloadingItems, setDownloadingItems] = useState({}); // { msgId: progress }
  const [localFiles, setLocalFiles] = useState({}); // { filename: true }
  
  const isFirstLoad = useRef(true);
  const skipScroll = useRef(false);

  // Arcadia ERP folder setup
  useEffect(() => {
    const checkLocalFiles = async () => {
      try {
        const dir = `${FileSystem.documentDirectory}Arcadia_ERP/`;
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        } else {
          const files = await FileSystem.readDirectoryAsync(dir);
          const fileMap = {};
          files.forEach(f => { fileMap[f] = true; });
          setLocalFiles(fileMap);
        }
      } catch (e) {
        console.error('FS Setup Error:', e);
      }
    };
    checkLocalFiles();
  }, []);
  
  const myId = user?.id || user?._id;

  const chatImages = useMemo(() => {
    let images = [];
    messages.filter(m => (m.messageType === 'IMAGE' || m.messageType === 'VOUCHER') && !m.isDeleted).forEach(m => {
      const urls = m.fileUrl ? m.fileUrl.split(',') : [];
      urls.forEach((url, index) => {
        images.push({
          id: `${m.id || m._id}_${index}`,
          msgId: m.id || m._id,
          url: getMediaUrl(url),
          sender: m.sender?.name,
          time: m.createdAt
        });
      });
    });
    return images;
  }, [messages]);

  useEffect(() => {
    const load = async () => {
      isFirstLoad.current = true;
      if (chatId) {
        await fetchChat(chatId);
        joinChat(chatId);
        markMessagesSeen(chatId);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          isFirstLoad.current = false;
        }, 300);
      }
    };
    load();
    return () => {
      if (chatId) leaveChat(chatId);
    };
  }, [chatId]);

  useEffect(() => {
    let timers = [];
    messages.forEach(m => {
      if (m.messageType === 'TASK' && m.taskData?.status === 'PENDING' && m.taskData?.assignedTo === myId) {
        const timeDiff = new Date(m.taskData.endTime).getTime() - Date.now();
        if (timeDiff <= 0 && !ringingTask) {
          triggerAlarm(m);
        } else if (timeDiff > 0 && timeDiff < 86400000) {
          const t = setTimeout(() => triggerAlarm(m), timeDiff);
          timers.push(t);
        }
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [messages, myId, ringingTask]);

  const triggerAlarm = async (taskMsg) => {
    if (ringingTask) return;
    setRingingTask(taskMsg);
    try {
      vibrationIntervalRef.current = setInterval(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }, 1500);
      
      // Migrating to expo-audio for SDK 54 compatibility
      /* 
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/images/favicon.png'),
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
      */
    } catch (err) {
      console.log('Audio init skipped or failed:', err.message);
    }
  };

  const stopAlarm = async (action) => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (action === 'COMPLETED' && ringingTask) {
      onTaskAction(ringingTask.id || ringingTask._id, 'COMPLETED');
    }
    setRingingTask(null);
  };

  useEffect(() => {
    const backAction = () => {
      if (selectedIds.length > 0) {
        setSelectedIds([]);
        return true;
      }
      if (viewerVisible) { setViewerVisible(false); return true; }
      if (voucherVisible) { setVoucherVisible(false); return true; }
      if (voucherDetailVisible) { setVoucherDetailVisible(false); return true; }
      if (taskDetailVisible) { setTaskDetailVisible(false); return true; }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/chats');
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedIds, viewerVisible, voucherVisible, voucherDetailVisible, taskDetailVisible]);

  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad.current) return;
      if (skipScroll.current) {
        skipScroll.current = false;
        return;
      }
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId === myId || lastMsg.sender?.id === myId) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }
  }, [messages.length]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKbVisible(true);
      if (Platform.OS === 'android' && e.endCoordinates) {
        setKbHeight(e.endCoordinates.height);
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKbVisible(false);
      if (Platform.OS === 'android') {
        setKbHeight(0);
      }
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleSend = (overrideContent = null, overrideType = 'TEXT', fileData = null) => {
    const content = overrideContent || text.trim();
    if (!content && !fileData) return;
    const tempId = `temp_${Date.now()}`;
    addMessage({ id: tempId, tempId, chatId, content, messageType: overrideType, status: 'SENT', createdAt: new Date().toISOString(), senderId: myId, sender: { id: myId, name: user?.name }, ...fileData });
    sendMessage({ chatId, content, messageType: overrideType, tempId, ...fileData });
    if (!overrideContent) setText('');
  };

  const pickImage = async (useCamera) => {
    setShowAttachments(false);
    const res = useCamera 
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 }) 
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true });

    if (!res.canceled) {
      setSending(true);
      try {
        if (res.assets.length >= 4) {
          let uploadedUrls = [];
          for (const asset of res.assets) {
            const up = await fileAPI.uploadFile(asset.uri, asset.fileName || 'photo.jpg', asset.mimeType || 'image/jpeg');
            uploadedUrls.push(up.data.data.fileUrl);
          }
          handleSend(null, 'IMAGE', { fileUrl: uploadedUrls.join(',') });
        } else {
          for (const asset of res.assets) {
            const up = await fileAPI.uploadFile(asset.uri, asset.fileName || 'photo.jpg', asset.mimeType || 'image/jpeg');
            handleSend(null, 'IMAGE', up.data.data);
          }
        }
      } finally { setSending(false); }
    }
  };

  const deleteSelected = () => {
    Alert.alert('Delete', `Delete ${selectedIds.length} messages?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { selectedIds.forEach(id => deleteMessageSocket(chatId, id)); setSelectedIds([]); }}
    ]);
  };

  const handleSaveToGallery = async (url) => {
    try {
      const MediaLibrary = require('expo-media-library');
      const FileSystem = require('expo-file-system');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required to save images.');
        return;
      }
      const fileUri = FileSystem.cacheDirectory + url.split('/').pop();
      const res = await FileSystem.downloadAsync(url, fileUri);
      await MediaLibrary.saveToLibraryAsync(res.uri);
      Alert.alert('Success', 'Image saved to gallery');
    } catch (err) {
      Alert.alert('Error', 'Unable to save image');
    }
  };

  const handleDownloadFile = async (msg) => {
    if (!msg.fileUrl) return;
    const msgId = msg.id || msg._id;
    if (downloadingItems[msgId]) return;

    const url = getMediaUrl(msg.fileUrl);
    const filename = msg.fileName || url.split('/').pop();
    const dir = `${FileSystem.documentDirectory}Arcadia_ERP/`;
    const fileUri = `${dir}${filename}`;
    
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      
      if (info.exists) {
        setLocalFiles(prev => ({ ...prev, [filename]: true }));
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
              type: msg.mimeType || getMimeType(filename),
            });
          } catch (e) {
            console.error('Intent Error:', e);
            Alert.alert('Error', 'No app found to open this file type');
          }
          return;
        }

        if (await Sharing.isAvailableAsync()) {
          if (sending) return;
          setSending(true);
          try {
            await Sharing.shareAsync(fileUri, { 
              dialogTitle: `Open ${filename}`,
              UTI: 'public.item', 
              mimeType: msg.mimeType || getMimeType(filename)
            });
          } catch (e) {
            console.error('Open Error:', e);
          } finally {
            setSending(false);
          }
        }
        return;
      }

      setDownloadingItems(prev => ({ ...prev, [msgId]: 0 }));
      
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (progress) => {
          const p = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
          setDownloadingItems(prev => ({ ...prev, [msgId]: p }));
        }
      );

      const downloadRes = await downloadResumable.downloadAsync();
      
      setDownloadingItems(prev => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      setLocalFiles(prev => ({ ...prev, [filename]: true }));

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(downloadRes.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: msg.mimeType || getMimeType(filename),
        });
      } else if (await Sharing.isAvailableAsync()) {
        setSending(true);
        try {
          await Sharing.shareAsync(downloadRes.uri, { 
            dialogTitle: `Open ${filename}`,
            UTI: 'public.item', 
            mimeType: msg.mimeType || getMimeType(filename)
          });
        } catch (e) {
          console.error('Share after download error:', e);
        } finally {
          setSending(false);
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      setDownloadingItems(prev => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      Alert.alert('Error', 'Unable to download or open file');
    }
  };

  const handleShareImage = async (url) => {
    try {
      await Share.share({ url: url, message: 'Check out this photo' });
    } catch (err) {
      Alert.alert('Error', 'Failed to share');
    }
  };

  const handleLongPress = useCallback((m) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIds([m.id || m.tempId]);
  }, []);

  const handlePress = useCallback((m) => {
    if (selectedIds.length > 0) {
      const newS = selectedIds.includes(m.id || m.tempId) 
        ? selectedIds.filter(id => id !== (m.id || m.tempId)) 
        : [...selectedIds, m.id || m.tempId];
      setSelectedIds(newS);
    } else if (m.messageType === 'VOUCHER') {
      setSelectedVoucher(m);
      setVoucherDetailVisible(true);
    } else if (m.messageType === 'TASK') {
      setSelectedTask(m);
      setTaskDetailVisible(true);
    }
  }, [selectedIds]);

  const handleImagePress = useCallback((m, url) => {
    if (selectedIds.length > 0) {
      handlePress(m);
    } else {
      const idx = chatImages.findIndex(i => i.msgId === (m.id || m._id) && (url ? i.url === url : true));
      if (idx !== -1) {
        setViewerIndex(idx);
        setViewerVisible(true);
      }
    }
  }, [selectedIds, chatImages, handlePress]);

  const renderMessage = useCallback(({ item }) => {
    const isMe = (item.senderId || item.sender?.id) === myId;
    return (
      <MessageItem 
        msg={item} 
        myId={myId} 
        isMe={isMe}
        currentChat={currentChat} 
        Colors={Colors} 
        isSelected={selectedIds.includes(item.id || item.tempId)} 
        isSelectionMode={selectedIds.length > 0}
        onLongPress={handleLongPress} 
        onPress={handlePress} 
        onImagePress={handleImagePress} 
        onVoucherAction={sendVoucherAction}
        onTaskAction={onTaskAction}
        onDownload={handleDownloadFile}
        userRole={user?.role}
        setSelectedVoucher={setSelectedVoucher}
        progress={downloadingItems[item.id || item._id]}
        isDownloaded={localFiles[item.fileName || item.fileUrl?.split('/').pop()]}
      />
    );
  }, [myId, currentChat, Colors, selectedIds, handleLongPress, handlePress, handleImagePress, sendVoucherAction, onTaskAction, handleDownloadFile, downloadingItems, localFiles]);

  const chatBody = useMemo(() => (
    <>
      <FlatList 
        ref={flatListRef} 
        data={messages} 
        renderItem={renderMessage} 
        keyExtractor={(m) => m.id || m.tempId} 
        contentContainerStyle={[s.messageList, { paddingBottom: 6 }]} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={hasMore ? <TouchableOpacity onPress={() => { skipScroll.current = true; loadMoreMessages(chatId); }}><View style={s.loadMore}><Text style={[s.loadMoreText, { color: Colors.accent }]}>Load earlier</Text></View></TouchableOpacity> : null} 
      />
      
      {showAttachments && (
        <View style={[s.attachMenu, { backgroundColor: Colors.bgSecondary }]}>
          <TouchableOpacity style={s.attachItem} onPress={() => pickImage(false)}><View style={[s.attachIcon, { backgroundColor: '#A866EE' }]}><Ionicons name="image" size={24} color="#FFF" /></View><Text style={{ color: Colors.textPrimary }}>Gallery</Text></TouchableOpacity>
          <TouchableOpacity style={s.attachItem} onPress={() => pickImage(true)}><View style={[s.attachIcon, { backgroundColor: '#FF5722' }]}><Ionicons name="camera" size={24} color="#FFF" /></View><Text style={{ color: Colors.textPrimary }}>Camera</Text></TouchableOpacity>
          <TouchableOpacity style={s.attachItem} onPress={async () => { const r = await DocumentPicker.getDocumentAsync(); if (!r.canceled) { const originalName = r.assets[0].name; const up = await fileAPI.uploadFile(r.assets[0].uri, originalName, r.assets[0].mimeType); handleSend(originalName, 'FILE', { ...up.data.data, fileName: originalName }); } setShowAttachments(false); }}><View style={[s.attachIcon, { backgroundColor: '#1C98F7' }]}><Ionicons name="document" size={24} color="#FFF" /></View><Text style={{ color: Colors.textPrimary }}>Document</Text></TouchableOpacity>
          <TouchableOpacity style={s.attachItem} onPress={() => { setShowAttachments(false); setVoucherVisible(true); }}><View style={[s.attachIcon, { backgroundColor: '#FF9800' }]}><Ionicons name="receipt" size={24} color="#FFF" /></View><Text style={{ color: Colors.textPrimary }}>Voucher</Text></TouchableOpacity>
          <TouchableOpacity style={s.attachItem} onPress={() => { setShowAttachments(false); setTaskModalVisible(true); }}><View style={[s.attachIcon, { backgroundColor: '#E91E63' }]}><Ionicons name="alarm" size={24} color="#FFF" /></View><Text style={{ color: Colors.textPrimary }}>Task</Text></TouchableOpacity>
        </View>
      )}
      
      <View style={[s.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) + (Platform.OS === 'android' ? kbHeight : 0) }]}>
        <View style={s.inputBubble}>
          <TouchableOpacity onPress={() => setShowAttachments(!showAttachments)} style={s.attachBtn}>
            <Ionicons name={showAttachments ? "close" : "add"} size={26} color={Colors.textMuted} />
          </TouchableOpacity>
          
          <TextInput 
            style={s.textInput} 
            placeholder="Message" 
            value={text} 
            onChangeText={setText} 
            multiline 
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <TouchableOpacity 
          onPress={() => handleSend()} 
          disabled={!text.trim() && !sending}
          style={[s.sendBtn, { backgroundColor: text.trim() ? Colors.accent : Colors.textMuted }]}
        >
          {sending ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="send" size={22} color="#FFF" />}
        </TouchableOpacity>
      </View>
    </>
  ), [messages, renderMessage, showAttachments, text, Colors, insets, kbHeight, sending]);

  return (
    <View style={[s.container, { backgroundColor: Colors.bgChat, paddingTop: insets.top }]}>
      <View style={[s.header, { backgroundColor: Colors.bgHeader, borderBottomColor: Colors.border, height: 60 }]}>
        {selectedIds.length > 0 ? (
          <>
            <TouchableOpacity onPress={() => setSelectedIds([])}><Ionicons name="close" size={26} color={Colors.textPrimary} /></TouchableOpacity>
            <Text style={[s.headerTitle, { color: Colors.textPrimary, flex: 1 }]}>{selectedIds.length}</Text>
            <TouchableOpacity onPress={deleteSelected} style={s.headerAction}><Ionicons name="trash-outline" size={24} color={Colors.textPrimary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => { router.push({ pathname: '/forward', params: { messageIds: selectedIds.join(',') } }); setSelectedIds([]); }} style={s.headerAction}><Ionicons name="arrow-redo-outline" size={24} color={Colors.textPrimary} /></TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.textPrimary} /></TouchableOpacity>
            <TouchableOpacity style={s.headerContent} onPress={() => router.push(`/chat/info/${chatId}`)}>
              <View style={[s.headerAvatar, { backgroundColor: Colors.primaryLight }]}>
                {(() => {
                  const otherM = currentChat?.members?.find(m => (m.user?.id || m.user?._id) !== myId);
                  const avUrl = getAvatarUrl(currentChat, otherM?.user);
                  return <Image source={{ uri: avUrl }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />;
                })()}
              </View>
              <View style={s.headerInfo}>
                <Text style={[s.headerName, { color: Colors.textPrimary }]} numberOfLines={1}>{currentChat?.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {currentChat?.isOnline && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 4 }} />}
                  <Text style={[s.headerStatus, { color: Colors.textSecondary }]}>{typingUsers[chatId]?.length > 0 ? 'typing...' : (currentChat?.isOnline ? 'Online' : 'Offline')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      <KeyboardAvoidingView 
        style={s.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      >
        {chatBody}
      </KeyboardAvoidingView>

      <VoucherModal 
        visible={voucherVisible} 
        onClose={() => setVoucherVisible(false)} 
        onSend={(voucherData, fileUrl) => {
          handleSend('Voucher', 'VOUCHER', { fileUrl, voucherData });
        }} 
      />

      <VoucherDetailModal
        visible={voucherDetailVisible}
        voucher={messages.find(m => (m.id || m._id) === (selectedVoucher?.id || selectedVoucher?._id))}
        onClose={() => { setVoucherDetailVisible(false); setSelectedVoucher(null); }}
        onImagePress={handleImagePress}
      />

      <TaskDetailModal
        visible={taskDetailVisible}
        task={selectedTask}
        onClose={() => { setTaskDetailVisible(false); setSelectedTask(null); }}
        onComplete={() => onTaskAction(selectedTask?.id || selectedTask?._id, 'COMPLETED')}
        myId={myId}
      />

      <TaskModal 
        visible={taskModalVisible}
        onClose={() => setTaskModalVisible(false)}
        chatMembers={currentChat?.members?.map(m => m.user)}
        isGroup={currentChat?.isGroup}
        myId={myId}
        onSend={(taskData) => {
          handleSend('Task Assigned', 'TASK', { taskData });
        }}
      />

      {/* Subtle Task Alarm Banner - Non-blocking */}
      {!!ringingTask && (
        <View style={{ 
          position: 'absolute', 
          top: insets.top + 65, 
          left: 10, 
          right: 10, 
          backgroundColor: '#333', 
          borderRadius: 12, 
          padding: 12, 
          flexDirection: 'row', 
          alignItems: 'center', 
          elevation: 5, 
          shadowColor: '#000', 
          shadowOffset: { width: 0, height: 2 }, 
          shadowOpacity: 0.3, 
          shadowRadius: 4,
          zIndex: 9999
        }}>
          <View style={{ backgroundColor: '#FF9800', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Ionicons name="alarm" size={24} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>Task Alert: {ringingTask?.taskData?.title}</Text>
            <Text style={{ color: '#CCC', fontSize: 12 }}>Time is up!</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={{ backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }} 
              onPress={() => stopAlarm('COMPLETED')}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }} 
              onPress={() => stopAlarm('DISMISS')}
            >
              <Text style={{ color: '#FFF', fontSize: 12 }}>Hide</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <SafeAreaView style={s.viewerContainer}>
          <View style={s.viewerHeader}>
            <TouchableOpacity onPress={() => setViewerVisible(false)} style={s.viewerClose}><Ionicons name="close" size={30} color="#FFF" /></TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.viewerSender}>{chatImages[viewerIndex]?.sender}</Text>
              <Text style={s.viewerDate}>{chatImages[viewerIndex]?.time ? format(new Date(chatImages[viewerIndex]?.time), 'dd MMM, HH:mm') : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => handleSaveToGallery(chatImages[viewerIndex].url)} style={s.viewerAction}><Ionicons name="download-outline" size={24} color="#FFF" /></TouchableOpacity>
            <TouchableOpacity onPress={() => handleShareImage(chatImages[viewerIndex].url)} style={s.viewerAction}><Ionicons name="share-social-outline" size={24} color="#FFF" /></TouchableOpacity>
          </View>
          <FlatList data={chatImages} horizontal pagingEnabled initialScrollIndex={viewerIndex} getItemLayout={(d, i) => ({ length: width, offset: width * i, i })} onMomentumScrollEnd={(e) => setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / width))} renderItem={({ item }) => <View style={s.viewerSlide}><Image source={{ uri: item.url }} style={s.viewerImage} resizeMode="contain" /></View>} keyExtractor={i => i.id} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
