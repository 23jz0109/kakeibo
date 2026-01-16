import { useEffect, useState, useCallback } from "react";

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

  // YYYY-MM 形式の文字列を作成
  const targetYearMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

  /**
   * Budget.jsxのloadDataに相当する関数
   * forceRefresh が true の場合はキャッシュを無視してAPIを叩く
   */
  const fetchHistory = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    // キャッシュ確認 (強制リフレッシュでない場合のみ)
    if (!forceRefresh && recordCache[targetYearMonth]) {
      setData(recordCache[targetYearMonth]);
      setIsLoading(false);
      return;
    }

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

      const formattedData = {
        calendarDailySum: result.calendar_daily_sum || [],
        monthlyRecordList: result.monthly_record_list || [],
        graphCategorySum: result.graph_category_sum || [],
      };

      // キャッシュに保存
      recordCache[targetYearMonth] = formattedData;
      setData(formattedData);
    }
    catch (err) {
      console.error("履歴取得エラー:", err);
      setError(err.message);
    }
    finally {
      setIsLoading(false);
    }
  }, [targetYearMonth]);

  // 初回レンダリング時、または年月が変更された時に実行
  useEffect(() => {
    fetchHistory(false); // 通常の切り替え時はキャッシュを優先
  }, [fetchHistory]);

  // Budget.jsx のように「手動で最新に更新したい」時のためのメソッドを返す
  const refetch = () => fetchHistory(true);

  return { isLoading, error, refetch, ...data };
};