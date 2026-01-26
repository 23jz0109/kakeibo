import { useState, useCallback } from "react";
import { useAuthFetch } from "../useAuthFetch";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();

  /**
   * カテゴリ一覧を取得する (入力画面用: 共通 + 個人)
   */
  const fetchCategories = useCallback(async (typeId) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`${API_BASE_URL}/category`, {
        method: "GET",
        headers: {
          "X-Type-ID": typeId,
        },
      });
      
      if (!res) return; // リダイレクト時は中断

      if (!res.ok) {
        throw new Error("カテゴリの取得に失敗しました");
      }

      const data = await res.json();
      setCategories(data.category || []); 
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        console.error("Fetch Categories Error:", err);
        setError(err);
      }
    }
    finally {
      setLoading(false);
    }
  }, [authFetch]);

  /**
   * 個人作成カテゴリのみ取得する (マイページ編集用)
   */
  const fetchPersonalCategories = useCallback(async (typeId) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(`${API_BASE_URL}/category/personal`, {
        method: "GET",
        headers: {
          "X-Type-ID": typeId,
        },
      });

      if (!res) return;

      if (!res.ok) {
        throw new Error("カテゴリの取得に失敗しました");
      }

      const data = await res.json();
      setCategories(data.category || []);
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        console.error("Fetch Personal Categories Error:", err);
        setError(err);
      }
    }
    finally {
      setLoading(false);
    }
  }, [authFetch]);

  /**
   * カテゴリを追加する
   */
  const addCategory = useCallback(async (categoryName, typeId, iconName, color) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/category`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          type_id: typeId,
          category_name: categoryName,
          icon_name: iconName, 
          category_color: color
        }),
      });

      if (!res) return false;

      if (!res.ok) {
        throw new Error("カテゴリの登録に失敗しました");
      }

      await fetchCategories(typeId);
      return true;
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        console.error("Add Category Error:", err);
        alert("カテゴリの追加に失敗しました。");
      }
      return false;
    }
  }, [authFetch, fetchCategories]);

  /**
   * カテゴリ更新
   */
  const updateCategory = useCallback(async (categoryId, categoryName, iconName, color, typeId) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/category`, { 
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Category-ID": categoryId,
        },
        body: JSON.stringify({
          type_id: typeId,
          category_name: categoryName,
          icon_name: iconName,
          category_color: color
        }),
      });

      if (!res) return false;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "更新失敗");
      }
      
      await fetchCategories(typeId);
      return true;
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        console.error("Update Category Error:", err);
        alert("カテゴリの更新に失敗しました。");
      }
      return false;
    }
  }, [authFetch, fetchCategories]);

  /**
   * カテゴリ削除
   */
  const deleteCategory = useCallback(async (categoryId, typeId) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/category`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "X-Category-ID": categoryId,
        },
      });

      if (!res) return false;

      if (!res.ok) {
        throw new Error("削除失敗");
      }

      await fetchCategories(typeId);
      return true;
    }
    catch (err) {
      if (err.message !== "Redirecting...") {
        console.error("Delete Category Error:", err);
        alert("削除できませんでした。");
      }
      return false;
    }
  }, [authFetch, fetchCategories]);

  return { 
    categories, 
    loading, 
    error, 
    fetchCategories, 
    fetchPersonalCategories,
    addCategory,
    updateCategory,
    deleteCategory
  };
};