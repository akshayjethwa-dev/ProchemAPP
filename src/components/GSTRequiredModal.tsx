import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Modal, Animated, TouchableWithoutFeedback } from 'react-native';
import { Text, Button, Avatar, useTheme } from 'react-native-paper';

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  ctaLabel?: string;
  onCTA?: () => void; // Conformed to new prop name
  onAction?: () => void; // Fallback for previously generated files
  onDismiss: () => void;
}

export const GSTRequiredModal: React.FC<Props> = ({
  visible,
  title = "GST Details Required",
  message = "To proceed, you need to complete your business profile with GST details.",
  ctaLabel = "Update Profile Now",
  onCTA,
  onAction,
  onDismiss
}) => {
  const theme = useTheme();
  
  // Local state to keep the modal rendered during the exit animation
  const [renderModal, setRenderModal] = useState(visible);
  
  const slideAnim = useRef(new Animated.Value(300)).current; 
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRenderModal(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start(() => {
        setRenderModal(false);
      });
    }
  }, [visible, slideAnim, fadeAnim]);

  // Handle CTA press depending on which prop was passed
  const handlePressCTA = () => {
    if (onCTA) onCTA();
    else if (onAction) onAction();
  };

  if (!renderModal) return null;

  return (
    <Modal transparent visible={renderModal} animationType="none" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[
            styles.overlay, 
            { 
              // Using theme colors as requested, with fallback for safety
              backgroundColor: theme.colors.backdrop || 'rgba(0,0,0,0.5)', 
              opacity: fadeAnim 
            }
        ]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[
                styles.modalContent, 
                { 
                  backgroundColor: theme.colors.surface, 
                  transform: [{ translateY: slideAnim }] 
                }
            ]}>
              
              <Avatar.Icon 
                size={56} 
                icon="domain" // Business/Building icon
                style={[styles.icon, { backgroundColor: theme.colors.primaryContainer }]} 
                color={theme.colors.primary} 
              />
              
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
              <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>{message}</Text>
              
              <Button 
                mode="contained" 
                onPress={handlePressCTA} 
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]} 
                contentStyle={{ height: 48 }}
              >
                {ctaLabel}
              </Button>
              <Button 
                mode="text" 
                onPress={onDismiss} 
                textColor={theme.colors.onSurfaceVariant} 
                contentStyle={{ height: 48 }}
              >
                Maybe Later
              </Button>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    justifyContent: 'flex-end', // Aligns modal to the bottom for the bottom-sheet look
  },
  modalContent: { 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    padding: 24, 
    alignItems: 'center', 
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    paddingBottom: 40, // Padding for safe area at the bottom of the screen
  },
  icon: { 
    marginBottom: 16 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  message: { 
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 24, 
    lineHeight: 22 
  },
  actionBtn: { 
    width: '100%', 
    marginBottom: 12, 
    borderRadius: 8
  }
});