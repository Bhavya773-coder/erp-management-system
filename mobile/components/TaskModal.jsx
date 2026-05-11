import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { format, isValid } from 'date-fns';

const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  const d = new Date(timeStr);
  return isValid(d) ? format(d, 'HH:mm') : '--:--';
};

export default function TaskModal({ visible, onClose, onSend, chatMembers, isGroup, myId }) {
  const Colors = useTheme();
  const [title, setTitle] = useState('');
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(null);

  React.useEffect(() => {
    if (!isGroup && chatMembers && visible) {
      const other = chatMembers.find(m => (m.id || m._id) !== myId);
      if (other) setAssignedTo(other);
    }
  }, [isGroup, chatMembers, myId, visible]);

  const totalDurationMs = (days * 86400 + hours * 3600 + minutes * 60 + seconds) * 1000;

  const handleSend = () => {
    if (!title || totalDurationMs <= 0 || !assignedTo) return;
    const endTime = new Date(Date.now() + totalDurationMs).toISOString();
    
    onSend({
      title,
      description,
      assignedTo: assignedTo.id || assignedTo._id,
      assignedToName: assignedTo.name,
      endTime,
      status: 'PENDING'
    });
    
    setTitle('');
    setDescription('');
    setDays(0); setHours(0); setMinutes(0); setSeconds(0);
    if (isGroup) setAssignedTo(null);
    onClose();
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxHeight: '85%', backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.lg, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
    body: { padding: Spacing.md },
    label: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.sm },
    input: { backgroundColor: Colors.bgPrimary, color: Colors.textPrimary, borderRadius: BorderRadius.md, padding: Spacing.sm, fontSize: Fonts.sizes.md, borderWidth: 1, borderColor: Colors.border },
    memberList: { maxHeight: 150, marginTop: Spacing.sm },
    memberItem: { padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    memberName: { color: Colors.textPrimary, fontSize: Fonts.sizes.md },
    footer: { flexDirection: 'row', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
    btnCancel: { flex: 1, padding: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md, marginRight: Spacing.sm, backgroundColor: Colors.bgPrimary },
    btnSend: { flex: 1, padding: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.accent },
    btnText: { fontWeight: '700', fontSize: Fonts.sizes.md },
    btnTextCancel: { color: Colors.textPrimary },
    btnTextSend: { color: '#FFF' },
    counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
    counterControls: { flexDirection: 'row', alignItems: 'center' },
    counterBtn: { backgroundColor: Colors.primaryLight, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    counterBtnText: { color: Colors.accent, fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
    counterVal: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', width: 40, textAlign: 'center' }
  });

  const renderCounter = (label, value, setter, max = 99) => (
    <View style={s.counterRow}>
      <Text style={[s.label, { marginTop: 0, marginBottom: 0 }]}>{label}</Text>
      <View style={s.counterControls}>
        <TouchableOpacity style={s.counterBtn} onPress={() => setter(Math.max(0, value - 1))}><Text style={s.counterBtnText}>-</Text></TouchableOpacity>
        <Text style={s.counterVal}>{value}</Text>
        <TouchableOpacity style={s.counterBtn} onPress={() => setter(Math.min(max, value + 1))}><Text style={s.counterBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.overlay}>
          <View style={s.modalContent}>
            <View style={s.header}>
              <Text style={s.headerTitle}>Assign Task</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView style={s.body}>
              <Text style={s.label}>Task Title</Text>
              <TextInput style={[s.input, { marginBottom: Spacing.md }]} value={title} onChangeText={setTitle} placeholder="Enter task..." placeholderTextColor={Colors.textMuted} />
              
              <Text style={s.label}>Description (optional)</Text>
              <TextInput style={[s.input, { marginBottom: Spacing.md, height: 80 }]} value={description} onChangeText={setDescription} placeholder="Enter description..." placeholderTextColor={Colors.textMuted} multiline textAlignVertical="top" />
              
              <Text style={[s.label, { marginBottom: Spacing.md }]}>Duration</Text>
              {renderCounter('Days', days, setDays, 30)}
              {renderCounter('Hours', hours, setHours, 23)}
              {renderCounter('Minutes', minutes, setMinutes, 59)}
              {renderCounter('Seconds', seconds, setSeconds, 59)}
              
              {isGroup && (
                <>
                  <Text style={s.label}>Assign To</Text>
                  <ScrollView style={s.memberList} nestedScrollEnabled>
                    {chatMembers?.map(member => (
                      <TouchableOpacity key={member.id || member._id} style={[s.memberItem, assignedTo?.id === (member.id || member._id) && { backgroundColor: Colors.primaryLight }]} onPress={() => setAssignedTo(member)}>
                        <Text style={s.memberName}>{member.name}</Text>
                        {assignedTo?.id === (member.id || member._id) && <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </ScrollView>
            <View style={s.footer}>
              <TouchableOpacity style={s.btnCancel} onPress={onClose}><Text style={[s.btnText, s.btnTextCancel]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnSend, (!title || totalDurationMs <= 0 || !assignedTo) && { opacity: 0.5 }]} onPress={handleSend} disabled={!title || totalDurationMs <= 0 || !assignedTo}><Text style={[s.btnText, s.btnTextSend]}>Assign Task</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
