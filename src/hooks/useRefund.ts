// File: src/hooks/useRefund.ts
import { useCallback, useState } from "react";
import {
  initiateJuspayRefund,
  getJuspayRefunds,
  JuspayRefundResult,
} from "../services/payment";

export interface RefundRecord {
  id: string;
  uniqueRequestId: string;
  orderId: string;
  amount: number | null;
  status: string;
  sentToGateway: boolean;
  maxEligibleRefundAmount: number | null;
  createdAt?: any;
  errorCode?: string;
  errorMessage?: string;
}

interface UseRefundOptions {
  orderId: string;
  customerId?: string;
}

export function useRefund({ orderId, customerId }: UseRefundOptions) {
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RefundRecord[]>([]);
  const [lastResult, setLastResult] = useState<JuspayRefundResult | null>(null);

  /**
   * Trigger a refund.
   * Omit `amount` for a full refund.
   * Pass `metadata` for extra context (e.g. ticket ID, damage photos ref, etc.).
   */
  const requestRefund = useCallback(
    async (
      amount?: number,
      reason?: string,
      metadata?: Record<string, any>
    ): Promise<JuspayRefundResult> => {
      setLoading(true);
      setError(null);
      try {
        const result = await initiateJuspayRefund(
          orderId,
          amount,
          reason,
          metadata,
          customerId
        );
        setLastResult(result);
        if (!result.success) {
          setError(result.message || "Refund request failed.");
        } else {
          // Refresh history after a successful request
          void fetchHistory();
        }
        return result;
      } catch (err: any) {
        const msg = err?.message || "Refund request failed.";
        setError(msg);
        return {
          success: false,
          unique_request_id: "",
          order_id: orderId,
          message: msg,
        };
      } finally {
        setLoading(false);
      }
    },
    [orderId, customerId]
  );

  /**
   * Fetch the refund history for the current order.
   */
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await getJuspayRefunds(orderId);
      const mapped: RefundRecord[] = (response.refunds || []).map((r: any) => ({
        id: r.id,
        uniqueRequestId: r.uniqueRequestId ?? r.unique_request_id,
        orderId: r.orderId ?? r.order_id,
        amount: r.amount ?? null,
        status: r.status ?? "PENDING",
        sentToGateway: r.sentToGateway ?? r.sent_to_gateway ?? false,
        maxEligibleRefundAmount:
          r.maxEligibleRefundAmount ?? r.maximum_eligible_refund_amount ?? null,
        createdAt: r.createdAt,
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
      }));
      setHistory(mapped);
      return mapped;
    } catch (err: any) {
      console.error("[useRefund] fetchHistory failed:", err);
      setError(err?.message || "Unable to load refund history.");
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [orderId]);

  const clearError = useCallback(() => setError(null), []);
  const reset = useCallback(() => {
    setError(null);
    setLastResult(null);
  }, []);

  return {
    loading,
    error,
    history,
    historyLoading,
    lastResult,
    requestRefund,
    fetchHistory,
    clearError,
    reset,
  };
}