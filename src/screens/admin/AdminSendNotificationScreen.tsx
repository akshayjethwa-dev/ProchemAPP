import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Image, StyleSheet } from 'react-native';
import { Text, TextInput, Button, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase'; // ✅ This MUST export storage
import { getAllUsers } from '../../services/adminService';
import { User } from '../../types';
import { Picker } from '@react-native-picker/picker'; 

export default function AdminSendNotificationScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('ALL'); 
  const [selectedUser, setSelectedUser] = useState('');
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
      
      // ✅ Generate a safe filename
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
    if (targetType === 'SPECIFIC' && !selectedUser) {
      Alert.alert('Missing User', 'Please select a user from the dropdown');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
        // If image upload fails, stop here (optional)
        if (!imageUrl && imageUri) { 
           setLoading(false);
           return; 
        }
      }

      const notificationData = {
        userId: targetType === 'ALL' ? 'ALL' : selectedUser,
        title,
        message,
        imageUrl,
        type: 'admin_broadcast',
        read: false,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'notifications'), notificationData);
      
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
        <Text variant="headlineSmall" style={{ marginBottom: 20, fontWeight: 'bold' }}>Send Broadcast</Text>

        <Text variant="titleMedium" style={{marginTop: 10}}>Target Audience</Text>
        <RadioButton.Group onValueChange={value => setTargetType(value)} value={targetType}>
          <View style={styles.radioRow}>
            <RadioButton value="ALL" />
            <Text>All Users</Text>
          </View>
          <View style={styles.radioRow}>
            <RadioButton value="SPECIFIC" />
            <Text>Specific User</Text>
          </View>
        </RadioButton.Group>

        {targetType === 'SPECIFIC' && (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedUser}
              onValueChange={(itemValue) => setSelectedUser(itemValue)}
            >
              <Picker.Item label="Select a user..." value="" />
              {users.map((u) => (
                <Picker.Item key={u.uid} label={`${u.companyName || u.email} (${u.userType})`} value={u.uid} />
              ))}
            </Picker>
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
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15 },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 15 },
  sendBtn: { marginTop: 10, paddingVertical: 6 }
});