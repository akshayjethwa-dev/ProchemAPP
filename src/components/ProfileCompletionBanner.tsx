import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ProgressBar, IconButton, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileCompletion } from '../utils/profileCompletion';

interface Props {
  user: any; // Using any to be flexible with your existing user types
  onComplete: () => void;
}

export const ProfileCompletionBanner: React.FC<Props> = ({ user, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [completionData, setCompletionData] = useState({ percentage: 0, isComplete: false, missingFields: [] as string[] });

  useEffect(() => {
    const checkVisibility = async () => {
      // 1. Only show for mobile-registered users
      if (!user || user.registrationType !== 'mobile') {
        setIsVisible(false);
        return;
      }

      // 2. Check Completion %
      const completion = getProfileCompletion(user);
      setCompletionData(completion);

      if (completion.isComplete) {
        setIsVisible(false);
        return;
      }

      // 3. Check AsyncStorage for 24hr dismissal TTL
      try {
        const dismissedAtStr = await AsyncStorage.getItem(`profile_banner_dismissed_${user.uid}`);
        if (dismissedAtStr) {
          const dismissedAt = parseInt(dismissedAtStr, 10);
          const now = Date.now();
          const hours24 = 24 * 60 * 60 * 1000;
          
          if (now - dismissedAt < hours24) {
            setIsVisible(false);
            return;
          }
        }
        setIsVisible(true);
      } catch (error) {
        console.error('Error reading async storage for profile banner:', error);
        setIsVisible(true);
      }
    };

    checkVisibility();
  }, [user]);

  const handleDismiss = async () => {
    setIsVisible(false);
    try {
      if (user?.uid) {
        await AsyncStorage.setItem(`profile_banner_dismissed_${user.uid}`, Date.now().toString());
      }
    } catch (error) {
      console.error('Error saving dismiss state:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
         <View style={{flex: 1, paddingRight: 10}}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Your profile is {completionData.percentage}% complete. Add details to gain full access to Prochem.
            </Text>
         </View>
         <IconButton 
           icon="close" 
           size={20} 
           iconColor="#0369A1"
           onPress={handleDismiss} 
           style={{margin: 0, backgroundColor: 'rgba(255,255,255,0.5)'}} 
         />
      </View>
      
      <ProgressBar progress={completionData.percentage / 100} color="#004AAD" style={styles.progressBar} />
      
      <Button mode="contained" onPress={onComplete} style={styles.button} labelStyle={styles.buttonLabel}>
         Complete Profile
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E0F2FE',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004AAD',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#0369A1',
    marginBottom: 12,
    lineHeight: 18,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BAE6FD',
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white'
  }
});