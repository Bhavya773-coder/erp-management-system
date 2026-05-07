import { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Image, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { fileAPI } from '../../lib/api';
import { API_BASE_URL } from '@/constants/config';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: Fonts.sizes.xl, fontWeight: '700' },
  scroll: { paddingBottom: Spacing.xl },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, margin: Spacing.md },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700' },
  editBadge: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  profileInfo: { marginLeft: Spacing.lg, flex: 1 },
  userName: { fontSize: Fonts.sizes.lg, fontWeight: '700', marginBottom: 2 },
  userEmail: { fontSize: Fonts.sizes.sm },
  section: { marginTop: Spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  itemText: { flex: 1 },
  itemLabel: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  itemSub: { fontSize: Fonts.sizes.sm, marginTop: 1 },
  footer: { textAlign: 'center', marginTop: Spacing.xl, fontSize: Fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  footerBrand: { textAlign: 'center', fontSize: Fonts.sizes.sm, fontWeight: '700', letterSpacing: 2, marginBottom: Spacing.xl },
});

export default function SettingsScreen() {
  const { user, logout, updateProfile } = useAuthStore();
  const { mode, toggleMode, notificationsEnabled, toggleNotifications } = useThemeStore();
  const Colors = useTheme();
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Lazy-load notifications for the toggle
  let Notifications = null;
  try { Notifications = require('expo-notifications'); } catch (e) {}
  let Constants = null;
  try { Constants = require('expo-constants'); } catch (e) {}

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setUpdating(true);
      try {
        const asset = result.assets[0];
        const uploadRes = await fileAPI.uploadFile(asset.uri, 'avatar.jpg', 'image/jpeg');
        const { fileUrl } = uploadRes.data.data;
        await updateProfile({ avatarUrl: fileUrl });
        setRefreshKey(Date.now());
        Alert.alert('Success', 'Profile picture updated!');
      } catch (err) {
        console.error('Avatar update error:', err.response?.data || err.message);
        Alert.alert('Error', `Failed to update: ${err.response?.data?.message || err.message}`);
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleToggleNotifications = async () => {
    try {
      const newVal = !notificationsEnabled;
      toggleNotifications(); // Update local state first

      if (!Notifications) return;

      if (newVal) {
        // Register logic (simplified from RootLayout)
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
          ...(projectId ? { projectId } : {}),
        });
        await authAPI.registerExpoPushToken(pushTokenData.data);
      } else {
        // Unregister logic
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
          ...(projectId ? { projectId } : {}),
        });
        await authAPI.unregisterExpoPushToken(pushTokenData.data);
      }
    } catch (err) {
      console.warn('Notification toggle error:', err.message);
    }
  };

  const avatarUrl = user?.avatarUrl 
    ? (user.avatarUrl.startsWith('http') ? `${user.avatarUrl}?t=${refreshKey}` : `${API_BASE_URL}/${user.avatarUrl.replace(/^\//, '')}?t=${refreshKey}`)
    : null;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  };

  const SettingItem = ({ icon, label, sublabel, onPress, rightElement, color }) => (
    <TouchableOpacity 
      style={[styles.item, { borderBottomColor: Colors.divider }]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: color || Colors.bgSecondary }]}>
        <Ionicons name={icon} size={22} color={color ? '#FFF' : Colors.textPrimary} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemLabel, { color: Colors.textPrimary }]}>{label}</Text>
        {sublabel && <Text style={[styles.itemSub, { color: Colors.textSecondary }]}>{sublabel}</Text>}
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bgPrimary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: Colors.bgHeader, borderBottomColor: Colors.border }]}>
        <Text style={[styles.headerTitle, { color: Colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.profileCard, { backgroundColor: Colors.bgSecondary }]}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: Colors.textOnPrimary }]}>
                  {getInitials(user?.name)}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: Colors.accent }]}>
              {updating ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={16} color="#FFF" />}
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: Colors.textPrimary }]}>{user?.name}</Text>
            <Text style={[styles.userEmail, { color: Colors.textSecondary }]}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SettingItem icon="moon-outline" label="Dark Mode" sublabel={mode === 'dark' ? 'On' : 'Off'}
            rightElement={
              <Switch value={mode === 'dark'} onValueChange={toggleMode}
                trackColor={{ false: Colors.bgTertiary, true: Colors.accent }}
                thumbColor={mode === 'dark' ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
          <SettingItem icon="notifications-outline" label="Notifications" sublabel={notificationsEnabled ? 'Enabled' : 'Disabled'}
            rightElement={
              <Switch value={notificationsEnabled} onValueChange={handleToggleNotifications}
                trackColor={{ false: Colors.bgTertiary, true: Colors.accent }}
                thumbColor={notificationsEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
          <SettingItem icon="lock-closed-outline" label="Privacy" sublabel="Blocked contacts" onPress={() => {}} />
          <SettingItem icon="chatbubble-outline" label="Chats" sublabel="Theme, wallpapers" onPress={() => {}} />
        </View>

        <View style={styles.section}>
          <SettingItem icon="help-circle-outline" label="Help" sublabel="Help center" onPress={() => {}} />
          <SettingItem icon="log-out-outline" label="Log Out" color="#FF3B30" onPress={handleLogout} />
        </View>

        <Text style={[styles.footer, { color: Colors.textMuted }]}>from</Text>
        <Text style={[styles.footerBrand, { color: Colors.textPrimary }]}>ARCADIAN WORKS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
