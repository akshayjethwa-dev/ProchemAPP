import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, Linking, StyleSheet } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator, IconButton, SegmentedButtons, Avatar, Divider, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getAllUsers, verifyUserKYC } from '../../services/adminService';
import { User } from '../../types';

export default function AdminUsersScreen() {
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'verified'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadData(); }, []);

  // Filter & Search Logic
  useEffect(() => {
    let result = users;

    // 1. Status Filter
    if (filter === 'pending') {
      result = result.filter(u => !u.verified);
    } else if (filter === 'verified') {
      result = result.filter(u => u.verified);
    }

    // 2. Search Filter
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.companyName || '').toLowerCase().includes(lower) || 
        (u.email || '').toLowerCase().includes(lower) ||
        (u.gstNumber || '').includes(searchQuery)
      );
    }

    setFilteredUsers(result);
  }, [filter, searchQuery, users]);

  const loadData = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleVerify = (uid: string, name: string) => {
    Alert.alert('Approve KYC', `Verify ${name} as a trusted business?`, [
      { text: 'Cancel' },
      { text: 'Approve', onPress: async () => {
          await verifyUserKYC(uid, true);
          loadData(); 
      }}
    ]);
  };

  const handleContact = (phone?: string, email?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else if (email) Linking.openURL(`mailto:${email}`);
    else Alert.alert("No contact info available");
  };

  const renderItem = ({ item }: { item: User }) => (
    <Card 
      style={styles.card}
      // ✅ NAVIGATE to the Details Screen on Press
      onPress={() => navigation.navigate('AdminUserDetails', { user: item })}
    >
      <Card.Content>
        {/* Visual Arrow for clickability (Top Right) */}
        <View style={{position:'absolute', top: 5, right: 5}}>
           <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" />
        </View>

        <View style={styles.row}>
          <Avatar.Text 
            size={42} 
            label={item.companyName?.[0]?.toUpperCase() || 'U'} 
            style={{backgroundColor: item.verified ? '#2E7D32' : '#F57C00'}} 
          />
          
          <View style={{marginLeft: 12, flex: 1, paddingRight: 20}}>
             <Text variant="titleMedium" style={{fontWeight:'bold'}}>{item.companyName || 'Unknown Company'}</Text>
             <Text variant="bodySmall" style={{color:'#666'}}>{item.email}</Text>
             {item.gstNumber && <Text variant="bodySmall" style={{color:'#004AAD', fontWeight:'bold'}}>GST: {item.gstNumber}</Text>}
          </View>
        </View>

        <Divider style={{marginVertical: 12}} />

        <View style={styles.infoGrid}>
           <Text style={styles.infoText}>📍 {item.address || 'Address not updated'}</Text>
           <Text style={styles.infoText}>📞 {item.phoneNumber || 'Phone not linked'}</Text>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
           {!item.verified ? (
             // IF PENDING: Show Verify Button
             <Button 
               mode="contained" 
               compact 
               buttonColor="#2E7D32" 
               icon="shield-check"
               style={{flex:1, marginRight:8}} 
               onPress={() => handleVerify(item.uid, item.companyName || 'User')}
             >
               Verify KYC
             </Button>
           ) : (
             // IF VERIFIED: Show Badge
             <Chip icon="check-decagram" style={{backgroundColor:'#DCFCE7', flex:1, marginRight:8}} textStyle={{color:'green', fontSize:10, fontWeight:'bold'}}>Verified Business</Chip>
           )}
           
           {/* Contact Button (Always Visible) */}
           <Button 
             mode="outlined" 
             compact 
             textColor="#004AAD"
             style={{flex:1, borderColor:'#004AAD'}} 
             onPress={() => handleContact(item.phoneNumber, item.email)}
           >
             Contact
           </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{fontWeight:'bold'}}>Company Directory</Text>
        <IconButton icon="refresh" onPress={loadData} />
      </View>

      <View style={{paddingHorizontal: 16, paddingBottom: 10}}>
        <Searchbar 
          placeholder="Search Name, Email, GST" 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          style={{marginBottom: 10, height: 45, backgroundColor:'white'}} 
          inputStyle={{minHeight: 0}}
        />
        
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'verified', label: 'Verified' },
          ]}
        />
      </View>

      {loading ? <ActivityIndicator style={{marginTop:50}} color="#004AAD" /> : (
        <FlatList 
          data={filteredUsers} 
          renderItem={renderItem} 
          keyExtractor={i => i.uid} 
          contentContainerStyle={{padding: 16}}
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color:'#999'}}>No companies found matching your criteria.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'white', marginBottom: 5 },
  card: { marginBottom: 12, backgroundColor: 'white', borderRadius: 12, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  infoGrid: { marginBottom: 12 },
  infoText: { fontSize: 13, color: '#475569', marginBottom: 6 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center' }
});