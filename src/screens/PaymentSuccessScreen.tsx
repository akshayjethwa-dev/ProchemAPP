// src/screens/PaymentSuccessScreen.tsx

import React, { useState } from 'react';
import { View, StyleSheet, Platform, Alert, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PaymentSuccessScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // 📦 1. Get the order details passed from CheckoutScreen
  const { orderId, totalAmount, productName, quantity, unit, utr, buyerName, date } = route.params || {};

  const [isGenerating, setIsGenerating] = useState(false);

  // 🖨️ 2. Function to generate and download the Professional PDF
  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Clean, professional, B2B-standard HTML template
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Receipt - Prochem</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; }
                .invoice-box { max-width: 800px; margin: auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                
                /* Header */
                .header-table { width: 100%; margin-bottom: 40px; }
                .company-name { color: #004AAD; margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 1px; }
                .company-sub { margin: 5px 0 0; color: #64748b; font-size: 14px; font-weight: bold; }
                .company-address { margin: 2px 0 0; color: #64748b; font-size: 12px; }
                .receipt-title { margin: 0; font-size: 28px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
                
                /* Info Section */
                .info-table { width: 100%; margin-bottom: 40px; }
                .section-title { margin: 0 0 8px; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
                .billed-name { margin: 0; font-size: 18px; font-weight: bold; color: #0f172a; }
                .meta-table { width: 100%; border-collapse: collapse; }
                .meta-table td { padding: 4px 0; font-size: 14px; }
                .meta-label { color: #64748b; }
                .meta-val { text-align: right; font-weight: bold; color: #0f172a; }
                
                /* Items Table */
                .item-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .item-table th { background-color: #f8fafc; color: #475569; padding: 12px; text-align: left; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; font-size: 12px; font-weight: bold; }
                .item-table td { padding: 16px 12px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #334155; }
                
                /* Totals */
                .totals-wrapper { width: 50%; float: right; margin-bottom: 40px; }
                .totals-table { width: 100%; border-collapse: collapse; }
                .totals-table th, .totals-table td { padding: 10px 12px; text-align: right; font-size: 15px; }
                .grand-total th, .grand-total td { font-size: 20px; font-weight: bold; color: #004AAD; border-top: 2px solid #0f172a; padding-top: 16px; }
                .clear { clear: both; }
                
                /* Terms & Footer */
                .terms { background: #f8fafc; padding: 20px; border-left: 4px solid #004AAD; border-radius: 4px; margin-bottom: 40px; }
                .terms h4 { margin: 0 0 10px; font-size: 14px; color: #0f172a; text-transform: uppercase; }
                .terms ul { margin: 0; font-size: 12px; color: #475569; line-height: 1.6; padding-left: 20px; }
                .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 24px; }
                .footer a { color: #004AAD; text-decoration: none; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <table class="header-table">
                    <tr>
                        <td style="vertical-align: top;">
                            <h1 class="company-name">PROCHEM</h1>
                            <p class="company-sub">By AAPA Capital Private Limited</p>
                            <p class="company-address">Anand - Vallabh Vidyanagar, Gujarat, India</p>
                        </td>
                        <td style="text-align: right; vertical-align: top;">
                            <h2 class="receipt-title">PAYMENT RECEIPT</h2>
                            <p style="margin: 8px 0 2px; font-size: 14px; color: #64748b;">Receipt #: <strong>${orderId}</strong></p>
                            <p style="margin: 2px 0 0; font-size: 14px; color: #64748b;">Date: <strong>${date}</strong></p>
                        </td>
                    </tr>
                </table>

                <table class="info-table">
                    <tr>
                        <td style="vertical-align: top; width: 50%;">
                            <h3 class="section-title">Received From (Buyer)</h3>
                            <p class="billed-name">${buyerName}</p>
                        </td>
                        <td style="vertical-align: top; width: 50%;">
                            <table class="meta-table">
                                <tr><td class="meta-label">Payment Method:</td><td class="meta-val">Bank Transfer (RTGS/NEFT)</td></tr>
                                <tr><td class="meta-label">UTR / Ref No:</td><td class="meta-val">${utr}</td></tr>
                                <tr><td class="meta-label">Payment Status:</td><td class="meta-val" style="color: #d97706;">Pending Verification</td></tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <table class="item-table">
                    <thead>
                        <tr>
                            <th style="width: 55%;">Description</th>
                            <th style="text-align: center; width: 20%;">Qty</th>
                            <th style="text-align: right; width: 25%;">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>${productName}</strong><br/><span style="font-size: 12px; color: #64748b;">Order Ref: ${orderId}</span></td>
                            <td style="text-align: center;">${quantity} ${unit}</td>
                            <td style="text-align: right;">₹${totalAmount}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="totals-wrapper">
                    <table class="totals-table">
                        <tr class="grand-total">
                            <th style="text-align: left;">Total Received</th>
                            <td>₹${totalAmount}</td>
                        </tr>
                    </table>
                </div>
                <div class="clear"></div>

                <div class="terms">
                    <h4>Terms & Conditions</h4>
                    <ul>
                        <li>This receipt acknowledges the submission of your payment reference. The order will be officially confirmed upon successful realization of funds in AAPA Capital Private Limited's bank account.</li>
                        <li>Logistics and freight charges are not included in this payment and will be billed separately prior to dispatch.</li>
                        <li>For any discrepancies regarding this transaction, please notify us within 24 hours.</li>
                        <li>All disputes are subject to the exclusive jurisdiction of the courts in Anand, Gujarat.</li>
                    </ul>
                </div>

                <div class="footer">
                    <p style="margin: 0 0 8px;">This is a computer-generated document and does not require a physical signature.</p>
                    <p style="margin: 0; font-size: 14px;">For support, contact us at: <a href="mailto:sales@prochem.org.in">sales@prochem.org.in</a></p>
                </div>
            </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (Platform.OS === 'web') {
         await Print.printAsync({ html: htmlContent });
      } else {
         const canShare = await Sharing.isAvailableAsync();
         if (canShare) {
           await Sharing.shareAsync(uri, {
             mimeType: 'application/pdf',
             dialogTitle: `Prochem_Receipt_${orderId}.pdf`,
           });
         } else {
           Alert.alert('Error', 'Sharing/Downloading is not available on this device');
         }
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      Alert.alert('Error', 'Could not generate receipt.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 🚀 3. CORRECTED: Navigate back to Orders Tab
  const handleGoToOrders = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{
          name: 'BuyerTabs',
          state: {
            routes: [{ name: 'Orders' }], // Explicitly pushes the state into the 'Orders' tab route
          },
        }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Content style={styles.content}>
            
            <View style={styles.headerArea}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="check" size={50} color="white" />
              </View>
              <Text variant="headlineSmall" style={styles.title}>Payment Submitted</Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                We are verifying your UTR details. You will receive an update once the payment clears.
              </Text>
            </View>

            <View style={styles.receiptPaper}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptTitle}>Prochem</Text>
                <Text style={styles.receiptSub}>Order Receipt</Text>
              </View>
              
              <Divider style={styles.dashedDivider} />

              <View style={styles.row}>
                 <Text style={styles.label}>Order ID</Text>
                 <Text style={styles.value}>{orderId}</Text>
              </View>
              <View style={styles.row}>
                 <Text style={styles.label}>Date</Text>
                 <Text style={styles.value}>{date}</Text>
              </View>
              <View style={styles.row}>
                 <Text style={styles.label}>UTR No</Text>
                 <Text style={styles.value}>{utr}</Text>
              </View>
              
              <Divider style={styles.dashedDivider} />

              <View style={styles.totalRow}>
                 <Text style={styles.totalLabel}>Amount Paid</Text>
                 <Text style={styles.totalValue}>₹{totalAmount}</Text>
              </View>
            </View>

            <View style={styles.actionArea}>
              <Button 
                mode="contained" 
                icon="file-download" 
                loading={isGenerating}
                disabled={isGenerating}
                onPress={generatePDF} 
                style={styles.downloadButton}
                contentStyle={styles.btnContent}
                labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
              >
                Download PDF Receipt
              </Button>

              <Button 
                mode="text" 
                onPress={handleGoToOrders} 
                style={styles.ordersButton}
                textColor="#64748B"
              >
                Return to Orders
              </Button>
            </View>

          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#004AAD' }, 
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: { borderRadius: 24, backgroundColor: 'white', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  content: { padding: 10 },
  
  headerArea: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 4 },
  title: { fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  subtitle: { color: '#64748B', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  
  receiptPaper: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 30 },
  receiptHeader: { alignItems: 'center', marginBottom: 10 },
  receiptTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 2 },
  receiptSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  
  dashedDivider: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: 'transparent', marginVertical: 15 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#64748B', fontSize: 14 },
  value: { fontWeight: 'bold', color: '#0F172A', fontSize: 14 },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#004AAD' },
  
  actionArea: { paddingHorizontal: 10 },
  downloadButton: { width: '100%', backgroundColor: '#004AAD', borderRadius: 12, marginBottom: 12 },
  btnContent: { paddingVertical: 8 },
  ordersButton: { width: '100%' }
});