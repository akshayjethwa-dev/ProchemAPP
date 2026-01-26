import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { Text, List, Button, Chip, ActivityIndicator, IconButton } from 'react-native-paper';
import { getAllUsers, verifyUserKYC } from '../../services/adminService';
import { User } from '../../types';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleVerify = (uid: string, name: string) => {
    Alert.alert('Approve KYC', `Verify ${name}?`, [
      { text: 'Cancel' },
      { text: 'Approve', onPress: async () => {
          await verifyUserKYC(uid, true);
          loadData(); // Refresh
      }}
    ]);
  };

  const renderItem = ({ item }: { item: User }) => (
    <List.Item
      title={item.companyName || item.email}
      description={`GST: ${item.gstNumber || 'N/A'}`}
      left={props => <List.Icon {...props} icon="account-business" />}
      right={props => (
        <View style={{flexDirection:'row', alignItems:'center'}}>
          {item.verified ? (
            <Chip icon="check" style={{backgroundColor:'#DCFCE7'}}>Verified</Chip>
          ) : (
            <Button mode="contained" compact onPress={() => handleVerify(item.uid, item.companyName || 'User')}>
              Approve
            </Button>
          )}
        </View>
      )}
      style={{backgroundColor:'white', marginBottom: 2}}
    />
  );

  return (
    <View style={{flex:1, backgroundColor:'#F1F5F9'}}>
      <View style={{padding:16, backgroundColor:'white', flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
        <Text variant="titleLarge" style={{fontWeight:'bold'}}>User Management</Text>
        <IconButton icon="refresh" onPress={loadData} />
      </View>
      {loading ? <ActivityIndicator style={{marginTop:20}} /> : (
        <FlatList data={users} renderItem={renderItem} keyExtractor={i => i.uid} />
      )}
    </View>
  );
}