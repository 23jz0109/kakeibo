import { useEffect, useState } from "react";

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

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      // キャッシュ確認
      if (recordCache[targetYearMonth]) {
        setData(recordCache[targetYearMonth]);
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("authToken");
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
        
        // APIレスポンスを整形して格納
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
        setError(err);
      }
      finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [targetYearMonth]);

  return { isLoading, error, ...data };
};