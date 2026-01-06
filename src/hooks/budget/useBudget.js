import { useState, useCallback } from "react";

const BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useBudgetApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = () => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) throw new Error("認証トークンがありません");

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // 共通レスポンス処理
  const handleResponse = async (res) => {
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
      const res = await fetch(`${BASE_URL}/budget`, {
        method: "GET",
        headers: getHeaders(),
      });
      const json = await handleResponse(res);
      return json.data || [];
    }
    catch (err) {
      setError(err.message);
      throw err;
    }
    finally {
      setLoading(false);
    }
  }, []);

  // ルール一覧取得
  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/budget/rules`, {
        method: "GET",
        headers: getHeaders(),
      });
      const json = await handleResponse(res);
      return json.data || [];
    }
    catch (err) {
      console.error("Rules fetch error", err);
      return [];
    }
  }, []);

  // 作成
  const createBudget = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/budget`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      await handleResponse(res);
    }
    catch (err) {
      setError(err.message);
      throw err;
    }
    finally {
      setLoading(false);
    }
  }, []);

  // 更新
  const updateBudget = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const headers = {
        ...getHeaders(),
        "X-Budget-ID": id,
      };
      const res = await fetch(`${BASE_URL}/budget`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data),
      });
      await handleResponse(res);
    }
    catch (err) {
      setError(err.message);
      throw err;
    }
    finally {
      setLoading(false);
    }
  }, []);

  // 削除
  const deleteBudget = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const headers = {
        ...getHeaders(),
        "X-Budget-ID": id,
      };
      const res = await fetch(`${BASE_URL}/budget`, {
        method: "DELETE",
        headers,
      });
      await handleResponse(res);
    }
    catch (err) {
      setError(err.message);
      throw err;
    }
    finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchBudgets,
    fetchRules,
    createBudget,
    updateBudget,
    deleteBudget,
  };
};
