// File: src/screens/OrderRefundScreen.tsx
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  IconButton,
  Chip,
  useTheme,
} from "react-native-paper";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import RefundDialog from "../components/RefundDialog";
import { useRefund, RefundRecord } from "../hooks/useRefund";
import { useAppStore } from "../store/appStore";
import { theme as internalTheme } from "../theme";

// ─────────────────────────────────────────────────────────────
// Route params
// ─────────────────────────────────────────────────────────────
export type OrderRefundRouteParams = {
  OrderRefund: {
    orderId: string;
    /** Effective amount charged by DBS (from Order Status API) */
    effectiveAmount: number;
    /** Already refunded amount (from Order Status API → amount_refunded) */
    amountRefunded?: number;
    /** Optional customer id for x-routing-id */
    customerId?: string;
  };
};

type OrderRefundRoute = RouteProp<OrderRefundRouteParams, "OrderRefund">;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const statusColor = (status: string, theme: any) => {
  const s = (status || "").toUpperCase();
  if (s === "SUCCEEDED") return "#10B981";
  if (s === "FAILED") return theme.colors.error;
  if (s === "PENDING") return "#F59E0B";
  return "#64748B";
};

const formatDate = (ts: any) => {
  if (!ts) return "—";
  if (ts.toDate) return ts.toDate().toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return new Date(ts).toLocaleString();
};

export default function OrderRefundScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<OrderRefundRoute>();
  const theme = useTheme();
  const { user } = useAppStore();

  const {
    orderId,
    effectiveAmount,
    amountRefunded = 0,
    customerId,
  } = route.params;

  const [dialogVisible, setDialogVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    history,
    historyLoading,
    fetchHistory,
    reset,
  } = useRefund({
    orderId,
    customerId: customerId || user?.uid,
  });

  // Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
      ),
      title: "Refunds",
    });
  }, [navigation]);

  // Load history on mount
  useEffect(() => {
    void fetchHistory();
    return () => {
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  // Compute max refundable = effective_amount - amount_refunded
  const maxRefundable = Math.max(effectiveAmount - amountRefunded, 0);
  const canRefund = maxRefundable >= 1;

  // ─────────────────────────────────────────────────────────
  // Success callback from the dialog
  // ─────────────────────────────────────────────────────────
  const handleRefundSuccess = (result: any) => {
    setDialogVisible(false);
    setSuccessMessage(
      `Refund queued (${result.unique_request_id}). Status: PENDING. ` +
        `It will be dispatched to the gateway within 15 minutes.`
    );
    void fetchHistory();
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Order Summary */}
        <Card style={styles.card}>
          <Card.Title title="Order Summary" />
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>Order ID</Text>
              <Text style={styles.valueMono}>{orderId}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Amount Paid</Text>
              <Text style={styles.value}>₹{effectiveAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Already Refunded</Text>
              <Text style={styles.value}>₹{amountRefunded.toFixed(2)}</Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: "700" }]}>
                Refundable Amount
              </Text>
              <Text
                style={[
                  styles.value,
                  { color: theme.colors.primary, fontWeight: "700" },
                ]}
              >
                ₹{maxRefundable.toFixed(2)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Success banner */}
        {successMessage && (
          <Card style={[styles.card, { backgroundColor: "#ECFDF5" }]}>
            <Card.Content>
              <Text style={{ color: "#065F46" }}>{successMessage}</Text>
              <Button
                mode="text"
                onPress={() => setSuccessMessage(null)}
                style={{ alignSelf: "flex-end" }}
              >
                Dismiss
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Request Refund button */}
        <Button
          mode="contained"
          icon="cash-refund"
          onPress={() => setDialogVisible(true)}
          disabled={!canRefund}
          style={styles.actionBtn}
          contentStyle={{ height: 50 }}
        >
          {canRefund
            ? "Request Refund"
            : "No Refundable Amount Available"}
        </Button>

        {/* Refund History */}
        <Card style={styles.card}>
          <Card.Title
            title="Refund History"
            right={(props) => (
              <IconButton
                {...props}
                icon="refresh"
                onPress={fetchHistory}
                disabled={historyLoading}
              />
            )}
          />
          <Card.Content>
            {historyLoading && history.length === 0 ? (
              <View style={styles.center}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : history.length === 0 ? (
              <Text style={styles.empty}>
                No refunds have been requested for this order.
              </Text>
            ) : (
              history.map((r, idx) => (
                <View
                  key={r.id || r.uniqueRequestId || idx}
                  style={styles.refundRow}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.refundTopRow}>
                      <Text style={styles.valueMono}>
                        {r.uniqueRequestId || r.id}
                      </Text>
                      <Chip
                        compact
                        textStyle={{ color: "#fff", fontSize: 11 }}
                        style={{
                          backgroundColor: statusColor(r.status, theme),
                        }}
                      >
                        {r.status || "PENDING"}
                      </Chip>
                    </View>
                    <Text style={styles.refundMeta}>
                      ₹{(r.amount ?? 0).toFixed(2)} •{" "}
                      {formatDate(r.createdAt)}
                    </Text>
                    <Text style={styles.refundMeta}>
                      {r.sentToGateway
                        ? "Sent to gateway"
                        : "Queued (sent to gateway shortly)"}
                    </Text>
                    {r.errorMessage && (
                      <Text style={[styles.refundMeta, { color: theme.colors.error }]}>
                        {r.errorCode}: {r.errorMessage}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Info footer */}
        <Text style={styles.footerNote}>
          Refunds are queued at DBS for up to 15 minutes before being sent to
          the gateway. Initial status will be PENDING. You will receive a webhook
          when the gateway processes the refund.
        </Text>
      </ScrollView>

      {/* Refund Dialog */}
      <RefundDialog
        visible={dialogVisible}
        orderId={orderId}
        maxRefundableAmount={maxRefundable}
        customerId={customerId || user?.uid}
        onDismiss={() => setDialogVisible(false)}
        onSuccess={handleRefundSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: internalTheme.spacing.md,
    backgroundColor: internalTheme.colors.background,
    flexGrow: 1,
  },
  card: {
    marginBottom: internalTheme.spacing.md,
    backgroundColor: "#fff",
    borderRadius: internalTheme.radius.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    alignItems: "center",
  },
  label: { color: internalTheme.colors.textSecondary },
  value: { color: internalTheme.colors.textPrimary },
  valueMono: { fontFamily: "monospace", color: internalTheme.colors.textPrimary },
  actionBtn: {
    marginBottom: internalTheme.spacing.md,
    borderRadius: internalTheme.radius.md,
  },
  center: { paddingVertical: 20, alignItems: "center" },
  empty: {
    textAlign: "center",
    color: internalTheme.colors.textSecondary,
    paddingVertical: 20,
  },
  refundRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  refundTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  refundMeta: {
    fontSize: 12,
    color: internalTheme.colors.textSecondary,
    marginTop: 2,
  },
  footerNote: {
    fontSize: 12,
    color: internalTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
});