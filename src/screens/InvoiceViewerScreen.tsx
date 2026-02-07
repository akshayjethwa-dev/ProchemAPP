import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Text, IconButton, FAB, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview'; 
import { generateInvoiceHtml, printInvoice } from '../services/invoiceService';

export default function InvoiceViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const { order } = route.params || {}; 
  const [selectedType, setSelectedType] = useState<string>('GOODS');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadInvoicePreview(); }, [selectedType, order]);

  const loadInvoicePreview = async () => {
    if (!order) return;
    setLoading(true);
    // Now async because it fetches data from Firebase
    const html = await generateInvoiceHtml(selectedType as any, order);
    setHtmlContent(html);
    setLoading(false);
  };

  const handlePrint = () => printInvoice(htmlContent);

  if (!order) return <View style={styles.center}><Text>No Order Details</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium">Admin Invoice Viewer</Text>
        <IconButton icon="printer" onPress={handlePrint} />
      </View>
      <View style={{padding: 10}}>
        <SegmentedButtons
          value={selectedType}
          onValueChange={setSelectedType}
          buttons={[
            { value: 'GOODS', label: 'Goods' },
            { value: 'SERVICE_BUYER', label: 'Buyer Srv' },
            { value: 'SERVICE_SELLER', label: 'Seller Srv' }
          ]}
        />
      </View>
      <View style={{flex:1}}>
        {loading ? <ActivityIndicator style={{marginTop:50}} /> : (
           Platform.OS === 'web' ? 
           <iframe srcDoc={htmlContent} style={{width:'100%', height:'100%', border:'none'}} /> :
           <WebView source={{ html: htmlContent }} style={{flex:1}} />
        )}
      </View>
      <FAB icon="download" label="PDF" style={styles.fab} onPress={handlePrint} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 5, backgroundColor: 'white' },
  fab: { position: 'absolute', margin: 20, right: 0, bottom: 0, backgroundColor: '#004AAD' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});