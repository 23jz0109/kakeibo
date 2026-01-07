import { useState, useCallback } from "react";

const BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useFixedCostApi = () => {
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

  // 固定費一覧取得
  const fetchFixedCosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/fixedcost`, {
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
      const res = await fetch(`${BASE_URL}/fixedcost/rules`, {
        method: "GET",
        headers: getHeaders(),
      });
      const json = await handleResponse(res);
      return json.data || [];
    }
    catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  // 作成
  const createFixedCost = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/fixedcost`, {
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
  const updateFixedCost = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const headers = {
        ...getHeaders(),
        "X-Fixed-Cost-ID": id,
      };
      const res = await fetch(`${BASE_URL}/fixedcost`, {
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
  const deleteFixedCost = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const headers = {
        ...getHeaders(),
        "X-Fixed-Cost-ID": id,
      };
      const res = await fetch(`${BASE_URL}/fixedcost`, {
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
    fetchFixedCosts,
    fetchRules,
    createFixedCost,
    updateFixedCost,
    deleteFixedCost,
  };
};
