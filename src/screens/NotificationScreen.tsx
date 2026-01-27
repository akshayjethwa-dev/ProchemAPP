import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Avatar, IconButton, ActivityIndicator, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppStore } from '../store/appStore';

// Define Notification Types
interface Notification {
  id: string;
  userId: string; // 'ALL' or specific UserUID
  type: 'ORDER' | 'PAYMENT' | 'SYSTEM' | 'PROMO' | 'ALERT';
  title: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO String
  data?: any; // Extra data like orderId
}

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAppStore();
  const theme = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // 1. Query: Get notifications for THIS user OR 'ALL' (Admin Broadcasts)
    // Note: Firestore 'OR' queries can be tricky, so we might need two listeners or a compound query.
    // For simplicity, we filter client-side or assume 'userId' is correctly set.
    
    const q = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [user.uid, 'ALL']), 
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Mark All as Read
  const markAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read && n.userId !== 'ALL') { // Can't easily mark 'ALL' docs as read for one person without a subcollection
           const ref = doc(db, 'notifications', n.id);
           batch.update(ref, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking read:", error);
    }
  };

  const handleNotificationPress = (item: Notification) => {
    // 1. Mark as read
    if (!item.read && item.userId !== 'ALL') {
      updateDoc(doc(db, 'notifications', item.id), { read: true });
    }

    // 2. Navigate based on type
    if (item.type === 'ORDER' && item.data?.orderId) {
      // Navigate to Tracking or Order Details
       navigation.navigate('OrderTracking', { orderId: item.data.orderId });
    }
  };

  // Helper: Get Icon & Color based on Type
  const getIconConfig = (type: string) => {
    switch (type) {
      case 'ORDER': return { icon: 'package-variant', color: '#2196F3', bg: '#E3F2FD' };
      case 'PAYMENT': return { icon: 'credit-card-check', color: '#4CAF50', bg: '#E8F5E9' };
      case 'ALERT': return { icon: 'alert-circle', color: '#F44336', bg: '#FFEBEE' }; // Stock Low
      case 'PROMO': return { icon: 'ticket-percent', color: '#9C27B0', bg: '#F3E5F5' }; // Admin Promo
      case 'SYSTEM': return { icon: 'cog', color: '#607D8B', bg: '#ECEFF1' };
      default: return { icon: 'bell', color: '#004AAD', bg: '#E3F2FD' };
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const config = getIconConfig(item.type);
    
    // Time formatting (simple relative time)
    const date = new Date(item.createdAt);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity 
        style={[styles.itemContainer, !item.read && styles.unreadItem]} 
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Icon Box */}
        <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
           <Avatar.Icon size={32} icon={config.icon} color={config.color} style={{backgroundColor: 'transparent'}} />
        </View>

        {/* Content */}
        <View style={{flex: 1, marginLeft: 12}}>
           <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
              <Text variant="titleSmall" style={{fontWeight:'bold', color:'#333'}}>{item.title}</Text>
              <Text style={{fontSize: 10, color:'#999'}}>{timeString}</Text>
           </View>
           <Text variant="bodySmall" style={{color:'#666', marginTop: 2}} numberOfLines={2}>
             {item.message}
           </Text>
        </View>

        {/* Unread Dot */}
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} size={24} />
          <Text variant="headlineSmall" style={{fontWeight:'bold', marginLeft: -5}}>Notifications</Text>
        </View>
        <Button mode="text" compact onPress={markAllRead} textColor="#004AAD">
          Mark all read
        </Button>
      </View>

      {/* List */}
      {loading ? (
        <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator color="#004AAD" /></View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          contentContainerStyle={{paddingBottom: 20}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} />}
          ListEmptyComponent={
            <View style={{alignItems:'center', marginTop: 100, opacity: 0.5}}>
              <Avatar.Icon size={80} icon="bell-sleep" style={{backgroundColor:'#F1F5F9'}} color="#94A3B8" />
              <Text style={{marginTop: 20, color:'#94A3B8'}}>No new notifications</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    alignItems: 'center',
    backgroundColor: 'white'
  },
  unreadItem: {
    backgroundColor: '#F0F9FF' // Light blue highlight for unread
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#004AAD',
    marginLeft: 8
  }
});