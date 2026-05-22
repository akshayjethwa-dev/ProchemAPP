// File: src/screens/admin/AdminWhatsAppLogsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getWhatsAppLogs } from '../../services/adminService';
import { Ionicons } from '@expo/vector-icons';

export default function AdminWhatsAppLogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getWhatsAppLogs(100); // Fetch latest 100 logs
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'sent') return '#4CAF50'; // Green
    if (status === 'received') return '#2196F3'; // Blue
    if (status === 'failed') return '#F44336'; // Red
    return '#9E9E9E'; // Grey
  };

  const renderLogItem = ({ item }: { item: any }) => {
    const date = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'N/A';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.direction}>
            {item.direction === 'inbound' ? '📥 INBOUND' : '📤 OUTBOUND'}
          </Text>
          <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
            {item.status?.toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.number}>
          {item.direction === 'inbound' ? `From: ${item.fromNumber}` : `To: ${item.toNumber}`}
        </Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Type: {item.messageType || 'N/A'}</Text>
          <Text style={styles.metaText}>Template: {item.templateName || 'N/A'}</Text>
        </View>

        <Text style={styles.bodyText} numberOfLines={3}>{item.body}</Text>
        
        {item.error && <Text style={styles.errorText}>Error: {item.error}</Text>}
        
        <Text style={styles.dateText}>{date}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WhatsApp Traffic Logs</Text>
        <TouchableOpacity onPress={fetchLogs} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No logs found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#1a237e' },
  title: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  refreshButton: { padding: 5 },
  card: { backgroundColor: '#fff', padding: 15, marginHorizontal: 15, marginTop: 10, borderRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  direction: { fontWeight: 'bold', color: '#333' },
  status: { fontWeight: 'bold' },
  number: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metaText: { fontSize: 12, color: '#666', backgroundColor: '#e0e0e0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  bodyText: { fontSize: 14, color: '#444', fontStyle: 'italic', backgroundColor: '#f9f9f9', padding: 10, borderRadius: 5 },
  errorText: { fontSize: 14, color: '#F44336', marginTop: 10, fontWeight: '500' },
  dateText: { fontSize: 12, color: '#999', marginTop: 10, textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 }
});