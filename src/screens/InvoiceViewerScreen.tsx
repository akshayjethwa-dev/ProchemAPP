import React from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { Text, Divider, Button, DataTable, IconButton, FAB, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order } from '../types';

export default function InvoiceViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const theme = useTheme();
  
  const { order } = route.params || {}; 
  // order MUST be passed. If testing, ensure your navigation sends it.

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>No Order Details Found</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  // --- DATA PREPARATION ---
  let shippingAddress: any = {};
  try {
    shippingAddress = typeof order.shippingAddress === 'string' 
      ? JSON.parse(order.shippingAddress) 
      : order.shippingAddress;
  } catch (e) {
    shippingAddress = { street: order.shippingAddress || 'Address unavailable' };
  }

  const subTotal = order.subTotal || (order.totalAmount / 1.18); // fallback calc
  const tax = order.taxAmount || (order.totalAmount - subTotal);
  
  // --- PDF GENERATION ---
  const handlePrint = async () => {
    // HTML Template for the PDF
    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity} ${item.unit}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">₹${item.pricePerUnit}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${(item.quantity * item.pricePerUnit).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #004AAD; padding-bottom: 20px; }
            .brand { font-size: 24px; font-weight: bold; color: #004AAD; }
            .invoice-title { font-size: 30px; font-weight: bold; color: #ddd; text-align: right; }
            .info-box { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .address { font-size: 14px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 10px; background-color: #f4f4f4; border-bottom: 2px solid #ccc; font-size: 12px; text-transform: uppercase; }
            .totals { text-align: right; }
            .total-row { font-size: 18px; font-weight: bold; color: #004AAD; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">PROCHEM APP</div>
            <div>
              <div style="font-size: 12px; color: #666;">Original Tax Invoice</div>
              <div style="font-size: 14px; font-weight: bold;">Order #${order.id.slice(0, 8).toUpperCase()}</div>
              <div style="font-size: 12px;">Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="info-box">
            <div class="address">
              <strong>Billed To:</strong><br>
              ${shippingAddress.label || 'Valued Customer'}<br>
              ${shippingAddress.street || ''}<br>
              ${shippingAddress.city ? shippingAddress.city + ', ' : ''}${shippingAddress.state || ''}<br>
              ${shippingAddress.zipCode || ''}
            </div>
            <div class="address" style="text-align: right;">
              <strong>Sold By:</strong><br>
              ProChem Marketplace<br>
              Gujarat, India<br>
              GSTIN: 24ABCDE1234F1Z5
            </div>
          </div>

          <table>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
            ${itemsHtml}
          </table>

          <div class="totals">
            <p>Subtotal: ₹${subTotal.toFixed(2)}</p>
            <p>IGST (18%): ₹${tax.toFixed(2)}</p>
            ${order.platformFeeBuyer ? `<p>Platform Fee: ₹${order.platformFeeBuyer.toFixed(2)}</p>` : ''}
            <p class="total-row">Grand Total: ₹${order.totalAmount.toFixed(2)}</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleMedium" style={{fontWeight:'bold'}}>Invoice Preview</Text>
        <IconButton icon="share-variant" onPress={handlePrint} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Paper Invoice Look */}
        <View style={styles.paper}>
          <View style={styles.row}>
            <Text variant="headlineSmall" style={{color: theme.colors.primary, fontWeight:'bold'}}>PROCHEM</Text>
            <Text variant="titleMedium" style={{color:'#999'}}>INVOICE</Text>
          </View>
          <Text style={{color:'#666', fontSize:12, marginBottom: 20}}>
            Order ID: {order.id.slice(0, 8).toUpperCase()} • {new Date(order.createdAt).toDateString()}
          </Text>

          <Divider style={{marginBottom: 20}} />

          <View style={styles.row}>
            <View style={{flex:1}}>
              <Text variant="labelMedium" style={{color:'#666'}}>BILLED TO</Text>
              <Text style={{fontWeight:'bold'}}>{shippingAddress.label}</Text>
              <Text style={styles.smallText}>{shippingAddress.street}</Text>
              <Text style={styles.smallText}>{shippingAddress.city}, {shippingAddress.state}</Text>
            </View>
            <View style={{flex:1, alignItems:'flex-end'}}>
              <Text variant="labelMedium" style={{color:'#666'}}>STATUS</Text>
              <Text style={{fontWeight:'bold', color: 'green'}}>{order.paymentStatus?.toUpperCase() || 'PAID'}</Text>
            </View>
          </View>

          <DataTable style={{marginTop: 20}}>
            <DataTable.Header>
              <DataTable.Title>Item</DataTable.Title>
              <DataTable.Title numeric>Qty</DataTable.Title>
              <DataTable.Title numeric>Price</DataTable.Title>
              <DataTable.Title numeric>Total</DataTable.Title>
            </DataTable.Header>

            {order.items.map((item: any, index: number) => (
              <DataTable.Row key={index}>
                <DataTable.Cell style={{flex: 2}}>{item.name}</DataTable.Cell>
                <DataTable.Cell numeric>{item.quantity}</DataTable.Cell>
                <DataTable.Cell numeric>₹{item.pricePerUnit}</DataTable.Cell>
                <DataTable.Cell numeric>₹{(item.quantity * item.pricePerUnit).toFixed(0)}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>

          <Divider style={{marginVertical: 20}} />

          <View style={{alignItems:'flex-end'}}>
            <Text>Subtotal: ₹{subTotal.toFixed(2)}</Text>
            <Text>Tax (18%): ₹{tax.toFixed(2)}</Text>
            {order.platformFeeBuyer && <Text>Platform Fee: ₹{order.platformFeeBuyer.toFixed(2)}</Text>}
            <Text variant="titleMedium" style={{fontWeight:'bold', marginTop: 10, color: theme.colors.primary}}>
              Total: ₹{order.totalAmount.toFixed(2)}
            </Text>
          </View>

        </View>
      </ScrollView>

      <FAB
        icon="printer"
        label="Download PDF"
        style={styles.fab}
        onPress={handlePrint}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#333' }, // Dark background creates contrast for "Paper" look
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 5 },
  scroll: { padding: 20 },
  paper: { backgroundColor: 'white', padding: 20, borderRadius: 8, minHeight: 500 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallText: { fontSize: 12, color: '#555' },
  fab: { position: 'absolute', margin: 20, right: 0, bottom: 0, backgroundColor: '#004AAD' }
});