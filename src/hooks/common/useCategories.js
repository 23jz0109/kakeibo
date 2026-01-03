import { useState, useCallback } from "react";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * カテゴリ一覧を取得する (入力画面用: 共通 + 個人)
   * @param {number} typeId - 1: 収入, 2: 支出
   */
  const fetchCategories = useCallback(async (typeId) => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (!token) {
        setLoading(false);
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/category`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "X-Type-ID": typeId,
        },
      });

      if (!response.ok) {
        throw new Error("カテゴリの取得に失敗しました");
      }

      const data = await response.json();
      setCategories(data.category || []); 

    }
    catch (err) {
      console.error("Fetch Categories Error:", err);
      setError(err);
    }
    finally {
      setLoading(false);
    }
  }, []);

  /**
   * 個人作成カテゴリのみ取得する (マイページ編集用)
   * @param {number} typeId - 1: 収入, 2: 支出
   */
  const fetchPersonalCategories = useCallback(async (typeId) => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (!token) return;

    try {
      // コントローラーの personal メソッドに対応するURL
      // ※ route定義が /categories/personal だと仮定
      const response = await fetch(`${API_BASE_URL}/category/personal`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "X-Type-ID": typeId,
        },
      });

      if (!response.ok) {
        throw new Error("カテゴリの取得に失敗しました");
      }

      const data = await response.json();
      setCategories(data.category || []);

    }
    catch (err) {
      console.error("Fetch Personal Categories Error:", err);
      setError(err);
    }
    finally {
      setLoading(false);
    }
  }, []);

  return { 
    categories, 
    loading, 
    error, 
    fetchCategories, 
    fetchPersonalCategories 
  };
};