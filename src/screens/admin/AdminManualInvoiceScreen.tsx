// File: src/screens/admin/AdminManualInvoiceScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Card, Text, useTheme } from 'react-native-paper';
import { generateInvoiceHtml, printInvoice, ManualInvoiceData } from '../../services/invoiceService';

export default function AdminManualInvoiceScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  // Form State
  const [invoiceNo, setInvoiceNo] = useState(`CUST-${Math.floor(Math.random() * 100000)}`);
  
  const [sellerName, setSellerName] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [sellerGst, setSellerGst] = useState('');
  
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerGst, setBuyerGst] = useState('');
  
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');

  const handleGenerate = async () => {
    if (!sellerName || !buyerName || !amount || !itemName) {
      alert("Please fill in Seller Name, Buyer Name, Item Name, and Taxable Amount.");
      return;
    }

    setLoading(true);
    try {
      const data: ManualInvoiceData = {
        invoiceNo,
        sellerName,
        sellerAddress,
        sellerGst,
        sellerStateCode: '27', // Default to Maharashtra, could be added as input
        buyerName,
        buyerAddress,
        buyerGst,
        buyerStateCode: '24', // Default to Gujarat, could be added as input
        itemName,
        amount: parseFloat(amount),
        taxRate: 18 // Defaulting to standard 18%
      };

      const htmlContent = await generateInvoiceHtml('MANUAL', data);
      await printInvoice(htmlContent);
      
    } catch (error) {
      console.error(error);
      alert("Failed to generate manual invoice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text variant="titleMedium" style={styles.sectionTitle}>Invoice Configuration</Text>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput label="Invoice Number" value={invoiceNo} onChangeText={setInvoiceNo} style={styles.input} mode="outlined" />
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>Seller Details</Text>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput label="Seller Company Name" value={sellerName} onChangeText={setSellerName} style={styles.input} mode="outlined" />
          <TextInput label="Seller Address" value={sellerAddress} onChangeText={setSellerAddress} style={styles.input} mode="outlined" multiline />
          <TextInput label="Seller GSTIN" value={sellerGst} onChangeText={setSellerGst} style={styles.input} mode="outlined" autoCapitalize="characters" />
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>Buyer Details</Text>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput label="Buyer Company Name" value={buyerName} onChangeText={setBuyerName} style={styles.input} mode="outlined" />
          <TextInput label="Buyer Address" value={buyerAddress} onChangeText={setBuyerAddress} style={styles.input} mode="outlined" multiline />
          <TextInput label="Buyer GSTIN" value={buyerGst} onChangeText={setBuyerGst} style={styles.input} mode="outlined" autoCapitalize="characters" />
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>Financials</Text>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput label="Item / Service Name" value={itemName} onChangeText={setItemName} style={styles.input} mode="outlined" />
          <TextInput label="Taxable Amount (₹)" value={amount} onChangeText={setAmount} style={styles.input} mode="outlined" keyboardType="numeric" />
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 5 }}>
            * 18% GST will be applied automatically to the Taxable Amount.
          </Text>
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={handleGenerate} loading={loading} style={styles.button} icon="file-pdf-box">
        Generate Custom Invoice PDF
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  sectionTitle: { marginBottom: 8, marginTop: 12, fontWeight: 'bold' },
  card: { marginBottom: 12, backgroundColor: 'white' },
  input: { marginBottom: 10, backgroundColor: 'white' },
  button: { marginTop: 20, paddingVertical: 6, borderRadius: 8 }
});