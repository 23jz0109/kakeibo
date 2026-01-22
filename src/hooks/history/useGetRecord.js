import { useEffect, useState, useCallback } from "react";

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
   * データベースの標準時間→ユーザーのローカル時間に変換
   */
  const convertUtcToLocalDate = (dateStr, timeStr) => {
    if (!dateStr) return dateStr;
    const time = timeStr || "00:00";
    
    // "YYYY-MM-DDTHH:mm:00Z" (UTC) としてDateオブジェクトを作成
    const utcDate = new Date(`${dateStr}T${time}:00Z`);
    
    // ユーザーのローカル時間(JSTなど)で年・月・日を取り出す
    const y = utcDate.getFullYear();
    const m = String(utcDate.getMonth() + 1).padStart(2, "0");
    const d = String(utcDate.getDate()).padStart(2, "0");
    
    return `${y}-${m}-${d}`;
  };

  /**
   * グラフデータ取得
   */
  const fetchHistory = useCallback(async (forceRefresh = false) => {
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

      // 時間変換
      const adjustedRecordList = (result.monthly_record_list || []).map(record => {
        const localDate = convertUtcToLocalDate(record.record_date, record.record_time);
        
        return {
          ...record,
          record_date: localDate,
        };
      });

      const formattedData = {
        calendarDailySum: result.calendar_daily_sum || [],
        monthlyRecordList: adjustedRecordList,
        graphCategorySum: result.graph_category_sum || [],
      };

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

  /**
   * 収支の詳細表示
   */
  const getRecordDetail = useCallback(async (recordID) => {
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (!token) throw new Error("認証トークンがありません");

      const response = await fetch("https://t08.mydns.jp/kakeibo/public/api/receipt", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Record-ID": recordID,
        },
      });

      if (!response.ok) {
        throw new Error(`Detail API Error: ${response.status}`);
      }

      const result = await response.json();
      
      return result.data; 

    }
    catch (err) {
      console.error("詳細取得エラー:", err);
      throw err;
    }
  }, []);

  /**
   * 記録削除
   */
  const deleteRecord = useCallback(async (recordID) => {
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (!token) throw new Error("認証トークンがありません");

      const response = await fetch("https://t08.mydns.jp/kakeibo/public/api/records", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Record-ID": recordID,
        },
      });

      if (!response.ok) {
        throw new Error(`Detail API Error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        fetchHistory();
        return true;
      }
      else {
        throw new Error(result.message || "削除に失敗しました");
      }

    }
    catch (err) {
      console.error("削除エラー:", err);
      alert(err.message);
      return false;
    }
  }, [fetchHistory]);

  // 初回レンダリング時、または年月が変更された時に実行
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const refetch = () => fetchHistory(true);

  return {
    isLoading,
    error,
    refetch,
    getRecordDetail,
    deleteRecord,
    ...data
  };
};