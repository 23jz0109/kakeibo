import { useState, useCallback } from "react";
import { useAuthFetch } from "../useAuthFetch"; 

const BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useBudgetApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();

  // 共通レスポンス処理
  const handleResponse = async (res) => {
    if (!res) throw new Error("Redirecting..."); 
    
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || "API Error");
    }
    return json;
  };

  // 予算一覧取得
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/budget`, {
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
      const res = await authFetch(`${BASE_URL}/budget/rules`, {
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
  const createBudget = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/budget`, {
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
  const updateBudget = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/budget`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Budget-ID": id,
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
  const toggleBudget = useCallback(async (id) => {
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/budget/toggle`, {
        method: "POST",
        headers: {
          "X-Budget-ID": id,
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
  const deleteBudget = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/budget`, {
        method: "DELETE",
        headers: {
          "X-Budget-ID": id,
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
    fetchBudgets,
    fetchRules,
    createBudget,
    updateBudget,
    toggleBudget,
    deleteBudget,
    loading,
    error
  };
};