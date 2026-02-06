import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function NotificationDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { notification } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button 
          icon="arrow-left" 
          mode="text" 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          Back
        </Button>

        <Text variant="headlineMedium" style={styles.title}>{notification.title}</Text>
        <Text variant="bodySmall" style={styles.date}>
          {new Date(notification.createdAt).toLocaleString()}
        </Text>

        {notification.imageUrl && (
          <Surface style={styles.imageContainer} elevation={2}>
            <Image 
              source={{ uri: notification.imageUrl }} 
              style={styles.image} 
              resizeMode="cover"
            />
          </Surface>
        )}

        <Text variant="bodyLarge" style={styles.message}>
          {notification.message}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  backButton: { alignSelf: 'flex-start', marginLeft: -10, marginBottom: 10 },
  title: { fontWeight: 'bold', color: '#004AAD', marginBottom: 5 },
  date: { color: '#888', marginBottom: 20 },
  imageContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: 200 },
  message: { lineHeight: 24, color: '#333' },
});