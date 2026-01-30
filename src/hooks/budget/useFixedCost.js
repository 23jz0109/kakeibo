import { useState, useCallback } from "react";
import { useAuthFetch } from "../useAuthFetch";

const BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useFixedCostApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();

  const handleResponse = async (res) => {
    if (!res) throw new Error("Redirecting...");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || "API Error");
    }
    return json;
  };

  // 固定費一覧取得
  const fetchFixedCosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/fixedcost`, {
        method: "GET",
      });
      if (!res) return [];

      const json = await handleResponse(res);
      return json.data || [];
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        setError(err.message);
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  }, [authFetch]);

  // ルール一覧取得
  const fetchRules = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/fixedcost/rules`, {
        method: "GET",
      });
      if (!res) return [];

      const json = await handleResponse(res);
      return json.data || [];
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        setError(err.message);
      }
      return [];
    }
  }, [authFetch]);

  // 新規作成
  const createFixedCost = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/fixedcost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res) return;

      await handleResponse(res);
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        setError(err.message);
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  }, [authFetch]);

  // 更新
  const updateFixedCost = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/fixedcost`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Fixed-Cost-ID": id,
        },
        body: JSON.stringify(data),
      });
      if (!res) return;

      await handleResponse(res);
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        setError(err.message);
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  }, [authFetch]);

  // 通知オンオフ
  const toggleFixedCost = useCallback(async (id) => {
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/fixedcost/toggle`, {
        method: "POST",
        headers: {
          "X-Fixed-Cost-ID": id,
        },
      });
      if (!res) return;

      await handleResponse(res);
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        setError(err.message);
      }
      throw err;
    }
  }, [authFetch]);

  // 削除
  const deleteFixedCost = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/fixedcost`, {
        method: "DELETE",
        headers: {
          "X-Fixed-Cost-ID": id,
        },
      });
      if (!res) return;

      await handleResponse(res);
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        setError(err.message);
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  }, [authFetch]);

  return {
    fetchFixedCosts,
    fetchRules,
    createFixedCost,
    updateFixedCost,
    toggleFixedCost,
    deleteFixedCost,
    loading,
    error
  };
};