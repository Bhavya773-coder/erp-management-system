import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Fonts, Spacing, BorderRadius } from '@/constants/appTheme';
import { format, isValid } from 'date-fns';

const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  const d = new Date(timeStr);
  return isValid(d) ? format(d, 'PPP p') : '--:--';
};

export default function TaskDetailModal({ visible, onClose, task, onComplete, myId }) {
  const Colors = useTheme();

  if (!task) return null;

  const { taskData } = task;
  const isPending = taskData?.status === 'PENDING';
  const isExpired = isPending && new Date(taskData?.endTime) < new Date();
  const isAssignedToMe = taskData?.assignedTo === myId;

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    container: { backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg, overflow: 'hidden', maxHeight: '80%' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    title: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
    content: { padding: Spacing.lg },
    label: { fontSize: 14, color: Colors.textMuted, marginBottom: 4, marginTop: Spacing.md },
    value: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
    desc: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, marginTop: Spacing.md },
    statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row' },
    btn: { flex: 1, padding: 16, borderRadius: BorderRadius.md, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>Task Details</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={s.content}>
            <View style={[s.statusBadge, { backgroundColor: isExpired ? '#F44336' : (isPending ? '#FF9800' : '#4CAF50') }]}>
              <Text style={s.statusText}>{isExpired ? 'EXPIRED' : taskData?.status}</Text>
            </View>

            <Text style={s.label}>Title</Text>
            <Text style={s.value}>{taskData?.title}</Text>

            <Text style={s.label}>Description</Text>
            <Text style={s.desc}>{taskData?.description || 'No description provided.'}</Text>

            <Text style={s.label}>Assigned To</Text>
            <Text style={s.value}>{taskData?.assignedToName}</Text>

            <Text style={s.label}>Deadline</Text>
            <Text style={s.value}>{formatTime(taskData?.endTime)}</Text>

            {!isPending && (
              <>
                <Text style={s.label}>Completed At</Text>
                <Text style={s.value}>{formatTime(taskData?.completedAt)}</Text>
              </>
            )}
          </ScrollView>

          {isPending && isAssignedToMe && (
            <View style={s.footer}>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#4CAF50' }]} onPress={() => { onComplete(); onClose(); }}>
                <Text style={s.btnText}>Mark as Completed</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
