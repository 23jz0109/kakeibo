// src/hooks/useAuthFetch.js

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const useAuthFetch = () => {
  const navigate = useNavigate();

  // fetchをラップした関数を作成
  const authFetch = useCallback(async (url, options = {}) => {
    // 1. トークンを自動で取得
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    // 2. ヘッダーを自動で結合 (Content-Typeなどは既存指定を優先)
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers, // 呼び出し元で追加したヘッダーがあれば上書き
    };

    try {
      // 3. 実際の通信を実行
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // 4. 【重要】ここで401チェックを共通化！
      if (response.status === 401) {
        console.error("認証切れ: 強制ログアウトします");
        sessionStorage.clear();
        localStorage.removeItem("authToken");
        localStorage.removeItem("savedEmail");
        
        // ログイン画面へ飛ばす
        navigate("/");
        
        // 呼び出し元の処理を中断させるためにnullなどを返すか、エラーを投げる
        return null;
      }

      return response;

    } catch (error) {
      console.error("通信エラー(Common):", error);
      throw error;
    }
  }, [navigate]);

  return authFetch;
};