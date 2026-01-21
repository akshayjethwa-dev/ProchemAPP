import React, { useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, Surface, useTheme, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NegotiationMessage } from '../types';

export default function NegotiationScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const theme = useTheme();
  const { product } = route.params || {};

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<NegotiationMessage[]>([
    {
      id: '1',
      text: `Hi, I am interested in ${product?.name || 'your product'}. What is the best price for 10 MT?`,
      senderId: 'buyer',
      timestamp: Date.now(),
      isBuyer: true,
    },
    {
      id: '2',
      text: `Hello! For 10 MT, we can offer ₹${(product?.pricePerUnit || 0) * 0.95}/kg. Where is the delivery location?`,
      senderId: 'seller',
      timestamp: Date.now() + 1000,
      isBuyer: false,
    }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    const newMsg: NegotiationMessage = {
      id: Date.now().toString(),
      text: message,
      senderId: 'buyer',
      timestamp: Date.now(),
      isBuyer: true
    };
    setMessages(prev => [...prev, newMsg]);
    setMessage('');
  };

  const renderMessage = ({ item }: { item: NegotiationMessage }) => {
    const isMe = item.isBuyer;
    return (
      <View style={[
        styles.msgContainer, 
        isMe ? styles.myMsgContainer : styles.theirMsgContainer
      ]}>
        {!isMe && <Avatar.Text size={32} label="S" style={{marginRight: 8}} />}
        <Surface style={[
          styles.bubble, 
          isMe ? { backgroundColor: theme.colors.primary } : { backgroundColor: '#E5E7EB' }
        ]}>
          <Text style={{ color: isMe ? 'white' : 'black' }}>{item.text}</Text>
        </Surface>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View>
          <Text variant="titleMedium" style={{fontWeight: 'bold'}}>Negotiation</Text>
          <Text variant="bodySmall">{product?.sellerName || 'Seller'}</Text>
        </View>
        <View style={{flex:1}} />
        <IconButton icon="phone" />
      </View>

      {/* Product Context */}
      <View style={styles.contextBar}>
        <Text variant="labelMedium" style={{color: '#666'}}>Discussing:</Text>
        <Text variant="labelLarge" style={{fontWeight: 'bold', color: theme.colors.primary}}>
          {product?.name} ({product?.origin || 'India'})
        </Text>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            mode="outlined"
            value={message}
            onChangeText={setMessage}
            placeholder="Type your offer..."
            style={styles.input}
            right={<TextInput.Icon icon="send" onPress={handleSend} color={theme.colors.primary} />}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: 'white', elevation: 2 },
  contextBar: { padding: 12, backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#DBEAFE' },
  chatList: { padding: 16 },
  msgContainer: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  myMsgContainer: { justifyContent: 'flex-end' },
  theirMsgContainer: { justifyContent: 'flex-start' },
  bubble: { padding: 12, borderRadius: 16, maxWidth: '80%', elevation: 1 },
  inputBar: { padding: 12, backgroundColor: 'white' },
  input: { backgroundColor: 'white' }
});