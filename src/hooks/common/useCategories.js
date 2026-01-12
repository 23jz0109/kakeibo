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

  /**
   * カテゴリを追加する
   * @param {string} categoryName カテゴリ名
   * @param {number} typeId - 1: 収入, 2: 支出
   * @param {string} iconName アイコン名
   * @param {string} color カラーコード
   */
  const addCategory = useCallback(async (categoryName, typeId, iconName, color) => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/category`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
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

      if (!response.ok) {
        throw new Error("カテゴリの登録に失敗しました");
      }

      await fetchCategories(typeId);
      return true;

    }
    catch (err) {
      console.error("Add Category Error:", err);
      alert("カテゴリの追加に失敗しました。");
      return false;
    }
  }, [fetchCategories]);

  /**
   * カテゴリ更新
   */
  const updateCategory = useCallback(async (categoryId, categoryName, iconName, color, typeId) => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/category`, { 
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
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

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "更新失敗");
      }
      
      await fetchCategories(typeId);
      return true;
    }
    catch (err) {
      console.error("Update Category Error:", err);
      alert("カテゴリの更新に失敗しました。");
      return false;
    }
  }, [fetchCategories]);

  /**
   * カテゴリ削除
   */
  const deleteCategory = useCallback(async (categoryId, typeId) => {
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/category`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "X-Category-ID": categoryId,
        },
      });

      if (!response.ok) {
        throw new Error("削除失敗");
      }

      await fetchCategories(typeId);
      return true;
    }
    catch (err) {
      console.error("Delete Category Error:", err);
      alert("削除できませんでした。");
      return false;
    }
  }, [fetchCategories]);

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