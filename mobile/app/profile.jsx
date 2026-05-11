import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import * as ImagePicker from 'expo-image-picker';
import { fileAPI } from '../lib/api';
import { API_BASE_URL } from '@/constants/config';
import { Image } from 'react-native';

export default function ProfileScreen() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const router = useRouter();
  const [phone, setPhone] = useState(user?.phone || '');
  const [education, setEducation] = useState(user?.education || '');
  const [skills, setSkills] = useState(user?.skills?.join(', ') || '');

  const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?';

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
    if (!user?.avatarUrl) return null;
    return user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE_URL}/${user.avatarUrl.replace(/^\//, '')}`;
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar */}
        <View style={s.avatarContainer}>
          <TouchableOpacity style={s.avatar} onPress={pickImage}>
            {getAvatarUrl() ? (
              <Image source={{ uri: getAvatarUrl() }} style={s.avatarImage} />
            ) : (
              <Text style={s.avatarText}>{getInitials(user?.name)}</Text>
            )}
            <View style={s.editBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.roleBadge}><Text style={s.roleText}>{user?.role}</Text></View>
        </View>

        {/* Fields */}
        <Text style={s.label}>Phone</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholderTextColor={Colors.textMuted} placeholder="Phone number" keyboardType="phone-pad" />

        <Text style={s.label}>Education</Text>
        <TextInput style={s.input} value={education} onChangeText={setEducation} placeholderTextColor={Colors.textMuted} placeholder="Education" />

        <Text style={s.label}>Skills (comma separated)</Text>
        <TextInput style={s.input} value={skills} onChangeText={setSkills} placeholderTextColor={Colors.textMuted} placeholder="React, Node.js, etc." />

        <TouchableOpacity style={[s.saveBtn, isLoading && s.saveBtnDisabled]} onPress={handleSave} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={s.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.bgHeader, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  backBtn: { marginRight: Spacing.md },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '700', color: Colors.textPrimary },
  scroll: { padding: Spacing.xxl },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, position: 'relative', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: Colors.textOnPrimary, fontSize: 32, fontWeight: '700' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', width: '100%', height: 30, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: Fonts.sizes.xl, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
  roleBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  roleText: { color: Colors.textOnPrimary, fontSize: Fonts.sizes.xs, fontWeight: '600' },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: Fonts.sizes.md, borderWidth: 1, borderColor: Colors.border },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: Colors.textOnPrimary, fontSize: Fonts.sizes.lg, fontWeight: '700' },
});
