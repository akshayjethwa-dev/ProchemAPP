import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Image, StyleSheet } from 'react-native';
import { Text, TextInput, Button, RadioButton, Checkbox, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase'; 
import { getAllUsers } from '../../services/adminService';
import { User } from '../../types';

export default function AdminSendNotificationScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('ALL'); // 'ALL', 'SELECTED', 'EXCLUDE'
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const toggleUserSelection = (uid: string) => {
    if (selectedUsers.includes(uid)) {
      setSelectedUsers(selectedUsers.filter(id => id !== uid));
    } else {
      setSelectedUsers([...selectedUsers, uid]);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!uri) return null;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `notifications/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error("Image Upload Error details:", error);
      Alert.alert("Upload Error", "Failed to upload image. Check console.");
      return null;
    }
  };

  const handleSend = async () => {
    if (!title || !message) {
      Alert.alert('Missing Fields', 'Please enter a Title and Message');
      return;
    }
    if ((targetType === 'SELECTED' || targetType === 'EXCLUDE') && selectedUsers.length === 0) {
      Alert.alert('Missing Selection', 'Please select at least one user from the list.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
        if (!imageUrl && imageUri) { 
           setLoading(false);
           return; 
        }
      }

      const baseNotification = {
        title,
        message,
        imageUrl,
        type: 'admin_broadcast',
        read: false,
        createdAt: new Date().toISOString(),
      };

      if (targetType === 'ALL') {
        // Send global broadcast doc (assuming frontend listens for 'ALL')
        await addDoc(collection(db, 'notifications'), { ...baseNotification, userId: 'ALL' });
      } else {
        // Determine the array of user IDs to send to
        let targetUserIds: string[] = [];
        if (targetType === 'SELECTED') {
          targetUserIds = selectedUsers;
        } else if (targetType === 'EXCLUDE') {
          targetUserIds = users.filter(u => !selectedUsers.includes(u.uid)).map(u => u.uid);
        }

        // Loop and create a notification for each specific user
        const promises = targetUserIds.map(uid => 
          addDoc(collection(db, 'notifications'), { ...baseNotification, userId: uid })
        );
        await Promise.all(promises);
      }
      
      Alert.alert('Success', 'Notification sent successfully!');
      navigation.goBack();
    } catch (error) {
      console.error("Send Error:", error);
      Alert.alert('Error', 'Failed to send notification. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text variant="headlineSmall" style={{ marginBottom: 20, fontWeight: 'bold' }}>Send Notification</Text>

        <Text variant="titleMedium" style={{marginTop: 10}}>Target Audience</Text>
        <RadioButton.Group onValueChange={value => {
            setTargetType(value);
            setSelectedUsers([]); // Reset selection when mode changes
        }} value={targetType}>
          <View style={styles.radioRow}>
            <RadioButton value="ALL" />
            <Text>All Users</Text>
          </View>
          <View style={styles.radioRow}>
            <RadioButton value="SELECTED" />
            <Text>Only Selected Users</Text>
          </View>
          <View style={styles.radioRow}>
            <RadioButton value="EXCLUDE" />
            <Text>All Users EXCEPT Selected</Text>
          </View>
        </RadioButton.Group>

        {(targetType === 'SELECTED' || targetType === 'EXCLUDE') && (
          <View style={styles.userListContainer}>
            <Text variant="labelLarge" style={{ marginBottom: 5 }}>
              {targetType === 'SELECTED' ? 'Select users to receive this:' : 'Select users to EXCLUDE:'}
            </Text>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {users.map((u) => (
                <Checkbox.Item
                  key={u.uid}
                  label={`${u.companyName || u.email} (${u.userType || 'User'})`}
                  status={selectedUsers.includes(u.uid) ? 'checked' : 'unchecked'}
                  onPress={() => toggleUserSelection(u.uid)}
                  mode="android"
                />
              ))}
            </ScrollView>
            <Divider style={{ marginVertical: 10 }} />
          </View>
        )}

        <TextInput 
          label="Title" 
          value={title} 
          onChangeText={setTitle} 
          mode="outlined" 
          style={styles.input} 
        />
        
        <TextInput 
          label="Message" 
          value={message} 
          onChangeText={setMessage} 
          mode="outlined" 
          multiline 
          numberOfLines={4} 
          style={styles.input} 
        />

        <Button mode="outlined" icon="camera" onPress={pickImage} style={styles.input}>
          {imageUri ? 'Change Image' : 'Attach Image'}
        </Button>
        
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        )}

        <Button 
          mode="contained" 
          onPress={handleSend} 
          loading={loading} 
          disabled={loading}
          style={styles.sendBtn}
          buttonColor="#004AAD"
        >
          Send Notification
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 15, backgroundColor: 'white' },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  userListContainer: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 5, padding: 5, marginBottom: 15, backgroundColor: '#f9f9f9' },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 15 },
  sendBtn: { marginTop: 10, paddingVertical: 6 }
});