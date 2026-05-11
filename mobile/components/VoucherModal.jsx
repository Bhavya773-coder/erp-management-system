import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Spacing, Fonts } from '@/constants/appTheme';
import { fileAPI } from '../lib/api';

const COMPANIES = [
  { label: 'Millennium Plaza', value: 'MP' },
  { label: 'Arcadia Shipping and Trading', value: 'AST' },
  { label: 'Arcadia Engineering', value: 'AE' },
  { label: 'Arvind Port and infra', value: 'APIL' }
];

export default function VoucherModal({ visible, onClose, onSend }) {
  const Colors = useTheme();
  const insets = useSafeAreaInsets();
  const [company, setCompany] = useState(COMPANIES[0].value);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [supportings, setSupportings] = useState([]); // Array of local URIs
  const [isUploading, setIsUploading] = useState(false);

  const today = new Date().toLocaleDateString('en-GB');

  const pickImages = async () => {
    if (supportings.length >= 10) {
      Alert.alert('Limit Reached', 'You can only attach up to 10 supportings.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - supportings.length,
      quality: 0.8
    });

    if (!res.canceled) {
      setSupportings(prev => [...prev, ...res.assets.map(a => a.uri)]);
    }
  };

  const removeImage = (index) => {
    setSupportings(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > 10000) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (Max ₹10,000)');
      return;
    }
    if (!narration.trim()) {
      Alert.alert('Required', 'Please add a narration.');
      return;
    }

    setIsUploading(true);
    try {
      let uploadedUrls = [];
      for (const uri of supportings) {
        const up = await fileAPI.uploadFile(uri, 'voucher_supp.jpg', 'image/jpeg');
        uploadedUrls.push(up.data.data.fileUrl);
      }
      
      const fileUrl = uploadedUrls.join(',');
      onSend({ company, amount: Number(amount), narration, status: 'PENDING' }, fileUrl);
      
      // Reset
      setCompany(COMPANIES[0].value);
      setAmount('');
      setNarration('');
      setSupportings([]);
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Upload Failed', 'Failed to upload supportings');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: Colors.bgPrimary, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: Colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>New Voucher</Text>
          <TouchableOpacity onPress={handleSend} disabled={isUploading} style={styles.sendActionBtn}>
            {isUploading ? <ActivityIndicator size="small" color={Colors.accent} /> : <Text style={{ color: Colors.accent, fontSize: Fonts.sizes.md, fontWeight: '700' }}>Send</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ padding: Spacing.md }}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: Colors.textSecondary }]}>Date (Auto)</Text>
            <View style={[styles.input, { backgroundColor: Colors.bgSecondary }]}>
              <Text style={{ color: Colors.textPrimary }}>{today}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: Colors.textSecondary }]}>Company</Text>
            <View style={styles.companySelector}>
              {COMPANIES.map(c => (
                <TouchableOpacity 
                  key={c.value} 
                  style={[styles.compBtn, { backgroundColor: company === c.value ? Colors.accent : Colors.bgSecondary, borderColor: company === c.value ? Colors.accent : Colors.border }]}
                  onPress={() => setCompany(c.value)}
                >
                  <Text style={{ color: company === c.value ? '#FFF' : Colors.textPrimary, fontSize: Fonts.sizes.sm, textAlign: 'center' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: Colors.textSecondary }]}>Amount (Max ₹10,000)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.bgSecondary, color: Colors.textPrimary }]}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: Colors.textSecondary }]}>Narration</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Colors.bgSecondary, color: Colors.textPrimary, height: 80, textAlignVertical: 'top' }]}
              multiline
              placeholder="What is this voucher for?"
              placeholderTextColor={Colors.textMuted}
              value={narration}
              onChangeText={setNarration}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: Colors.textSecondary }]}>Supportings ({supportings.length}/10)</Text>
            <View style={styles.supportingsGrid}>
              {supportings.map((uri, index) => (
                <View key={index} style={styles.suppBox}>
                  <Image source={{ uri }} style={styles.suppImage} />
                  <TouchableOpacity style={styles.suppClose} onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {supportings.length < 10 && (
                <TouchableOpacity style={[styles.addSuppBtn, { backgroundColor: Colors.bgSecondary, borderColor: Colors.border }]} onPress={pickImages}>
                  <Ionicons name="camera" size={32} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.md, 
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    height: 56
  },
  title: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  closeBtn: { padding: Spacing.xs, width: 40 },
  sendActionBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, width: 60, alignItems: 'flex-end' },
  content: { flex: 1 },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: Fonts.sizes.sm, marginBottom: Spacing.xs, fontWeight: '600' },
  input: { padding: Spacing.md, borderRadius: BorderRadius.md, fontSize: Fonts.sizes.md },
  companySelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  supportingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  suppBox: { width: 80, height: 80, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  suppImage: { width: '100%', height: '100%' },
  suppClose: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  addSuppBtn: { width: 80, height: 80, borderRadius: BorderRadius.sm, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }
});
