import { useEffect, useState, useCallback, useRef } from "react";

// シンプルなメモリ内キャッシュ
const recordCache = {};

export const useGetRecord = (year, month) => {
  const [data, setData] = useState({
    calendarDailySum: [],
    monthlyRecordList: [],
    graphCategorySum: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 二重リクエスト防止用のフラグ
  const isFetching = useRef(false);

  // YYYY-MM 形式の文字列を作成
  const targetYearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

  /**
   * Budget.jsxのloadDataに相当する関数
   * forceRefresh が true の場合はキャッシュを無視してAPIを叩く
   */
  const fetchHistory = useCallback(async () => {
    // すでに取得中なら何もしない
    if (isFetching.current) return;

    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (!token) throw new Error("認証トークンがありません");

      const response = await fetch("https://t08.mydns.jp/kakeibo/public/api/records", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-YearMonth": targetYearMonth,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();

      // 取得したデータをセット
      setData({
        calendarDailySum: result.calendar_daily_sum || [],
        monthlyRecordList: result.monthly_record_list || [],
        graphCategorySum: result.graph_category_sum || [],
      });
    }
    catch (err) {
      console.error("履歴取得エラー:", err);
      setError(err.message);
    }
    finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [targetYearMonth]);

  // 初回レンダリング時、または年月が変更された時に実行
  useEffect(() => {
    fetchHistory(); // 通常の切り替え時はキャッシュを優先
    // クリーンアップ関数でリセット（必要に応じて）
    return () => {
      isFetching.current = false;
    };
  }, [fetchHistory]); // fetchHistory の再生成を検知して実行

  /**
   * 手動更新用（中身はfetchHistoryと同じだが、明示的に呼び出し可能にする）
   */
  const refetch = () => {
    isFetching.current = false; // 強制的にフラグを戻して実行
    fetchHistory();
  };

  return { isLoading, error, refetch, ...data };
};