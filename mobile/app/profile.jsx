import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';

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
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
    });
    if (r.success) {
      Alert.alert('Success', 'Profile updated');
      router.back();
    } else {
      Alert.alert('Error', r.error || 'Failed to update');
    }
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
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials(user?.name)}</Text>
          </View>
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
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  avatarText: { color: Colors.textOnPrimary, fontSize: Fonts.sizes.xxl, fontWeight: '700' },
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
