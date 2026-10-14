// File: src/components/RefundDialog.tsx
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Portal,
  Dialog,
  Text,
  Button,
  TextInput,
  RadioButton,
  HelperText,
  Divider,
  useTheme,
} from "react-native-paper";

import { useRefund } from "../hooks/useRefund";
import type { JuspayRefundResult } from "../services/payment";

interface RefundDialogProps {
  visible: boolean;
  orderId: string;
  /** Maximum refundable amount, e.g. from Order Status → effective_amount - amount_refunded */
  maxRefundableAmount: number;
  /** Optional customer id for x-routing-id consistency */
  customerId?: string;
  /** Optional default reason */
  defaultReason?: string;
  onDismiss: () => void;
  onSuccess?: (result: JuspayRefundResult) => void;
}

export default function RefundDialog({
  visible,
  orderId,
  maxRefundableAmount,
  customerId,
  defaultReason = "",
  onDismiss,
  onSuccess,
}: RefundDialogProps) {
  const theme = useTheme();
  const { requestRefund, loading, error, clearError } = useRefund({
    orderId,
    customerId,
  });

  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState(defaultReason);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetForm = () => {
    setMode("full");
    setPartialAmount("");
    setReason(defaultReason);
    setValidationError(null);
    clearError();
  };

  const handleDismiss = () => {
    if (loading) return;
    resetForm();
    onDismiss();
  };

  const handleSubmit = async () => {
    setValidationError(null);

    let amount: number | undefined = undefined;

    if (mode === "partial") {
      const parsed = Number(partialAmount);
      if (!partialAmount || isNaN(parsed)) {
        setValidationError("Please enter a valid amount.");
        return;
      }
      if (parsed < 1) {
        setValidationError("Minimum refund amount is ₹1.");
        return;
      }
      if (parsed > maxRefundableAmount) {
        setValidationError(
          `Amount cannot exceed ₹${maxRefundableAmount.toFixed(2)}.`
        );
        return;
      }
      amount = parsed;
    }

    if (!reason.trim()) {
      setValidationError("Please provide a reason for the refund.");
      return;
    }

    const result = await requestRefund(amount, reason.trim(), {
      description: reason.trim(),
      refund_mode: mode,
    });

    if (result.success) {
      onSuccess?.(result);
      resetForm();
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} dismissable={!loading}>
        <Dialog.Title>Request Refund</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Order ID: <Text style={styles.mono}>{orderId}</Text>
          </Text>
          <Text variant="bodySmall" style={styles.helper}>
            Maximum refundable: ₹{maxRefundableAmount.toFixed(2)}
          </Text>

          <Divider style={styles.divider} />

          {/* Refund mode */}
          <RadioButton.Group
            onValueChange={(v) => setMode(v as "full" | "partial")}
            value={mode}
          >
            <View style={styles.radioRow}>
              <RadioButton value="full" />
              <Text onPress={() => setMode("full")}>Full Refund</Text>
            </View>
            <View style={styles.radioRow}>
              <RadioButton value="partial" />
              <Text onPress={() => setMode("partial")}>Partial Refund</Text>
            </View>
          </RadioButton.Group>

          {/* Partial amount input */}
          {mode === "partial" && (
            <View style={{ marginTop: 8 }}>
              <TextInput
                label="Refund Amount (₹)"
                value={partialAmount}
                onChangeText={setPartialAmount}
                keyboardType="decimal-pad"
                mode="outlined"
                disabled={loading}
                left={<TextInput.Affix text="₹" />}
              />
            </View>
          )}

          {/* Reason */}
          <TextInput
            label="Reason for Refund"
            value={reason}
            onChangeText={setReason}
            mode="outlined"
            multiline
            numberOfLines={3}
            disabled={loading}
            style={{ marginTop: 12 }}
            placeholder="e.g. Damaged item, customer request, duplicate charge"
          />

          {/* Async notice */}
          <View style={styles.notice}>
            <Text variant="bodySmall" style={styles.noticeText}>
              ℹ️ Refunds are queued for up to 15 minutes before being sent to the
              gateway. Status will initially be{" "}
              <Text style={styles.bold}>PENDING</Text>.
            </Text>
          </View>

          {/* Validation error */}
          {validationError && (
            <HelperText type="error" visible>
              {validationError}
            </HelperText>
          )}

          {/* Server error */}
          {error && (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          )}
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={handleDismiss} disabled={loading}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
          >
            {loading ? "Processing..." : "Request Refund"}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginBottom: 4 },
  helper: { color: "#64748B", marginBottom: 4 },
  mono: { fontFamily: "monospace", fontWeight: "600" },
  divider: { marginVertical: 12 },
  radioRow: { flexDirection: "row", alignItems: "center" },
  notice: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
  },
  noticeText: { color: "#92400E", lineHeight: 18 },
  bold: { fontWeight: "700" },
});