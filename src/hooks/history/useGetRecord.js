import { useEffect, useState, useCallback } from "react";
import { useAuthFetch } from "../useAuthFetch";

const BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useGetRecord = (year, month) => {
  const [data, setData] = useState({
    calendarDailySum: [],
    monthlyRecordList: [],
    graphCategorySum: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // useAuthFetch フックを使用
  const authFetch = useAuthFetch();

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
   * 税抜の差額計算
   */
  const fixGraphDataWithTax = (responseData) => {
    const { graph_category_sum, monthly_record_list } = responseData;
    const graphData = graph_category_sum || [];
    const recordList = monthly_record_list || [];

    // --- 型の自動検出 ---
    // グラフデータの中に既存のデータがあれば、その type_id の型(number/string)を調べる
    const sampleItem = graphData.find(item => item.type_id !== undefined);
    const isNumberType = sampleItem && typeof sampleItem.type_id === 'number';
    
    // 支出を表すIDを、既存データの型に合わせる（数値の2 か 文字列の"2" か）
    const EXPENDITURE_ID = isNumberType ? 2 : "2";

    // console.log("Check Tax Logic - Detected Type:", isNumberType ? "Number" : "String");

    // 1. リスト上の本当の合計金額（支出のみ）
    const actualTotal = recordList.reduce((sum, record) => {
      // 緩い比較(==)で判定して合計
      if (record.type_id == 2) {
        return sum + Number(record.total_amount);
      }
      return sum;
    }, 0);

    // 2. 現在のグラフデータの合計（支出のみ）
    const currentGraphTotal = graphData.reduce((sum, category) => {
      if (category.type_id == 2) {
        return sum + Number(category.total_amount);
      }
      return sum;
    }, 0);

    // 3. 差額算出
    const taxAmount = actualTotal - currentGraphTotal;
    // console.log(`Tax Logic: Actual=${actualTotal}, Graph=${currentGraphTotal}, Diff=${taxAmount}`);

    // 4. 差額がある場合、消費税カテゴリを追加
    if (taxAmount > 0) {
      const newGraphData = [
        ...graphData,
        {
          type_id: EXPENDITURE_ID, // ★ここで型を合わせる
          category_id: 9999,       // 数値IDにしておく（安全策）
          category_name: "消費税",
          category_color: "#9ca3af",
          icon_name: "Receipt",
          total_amount: String(taxAmount) // 金額は文字列が無難
        }
      ];
      // console.log("New Graph Data (Fixed):", newGraphData);
      return newGraphData;
    }

    return graphData;
  };

  /**
   * グラフデータ取得
   */
  const fetchHistory = useCallback(async () => {
    // authFetchがまだ準備できていない、または認証中の場合はスキップ
    if (!authFetch) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${BASE_URL}/records`, {
        method: "GET",
        headers: {
          // authFetchが自動でAuthorizationヘッダーを付与しますが、
          // 独自のカスタムヘッダーはここで追加する必要があります
          "X-YearMonth": targetYearMonth,
        },
      });

      // authFetchがリダイレクト処理などをした場合、responseがnullになる可能性があります
      if (!response) return; 

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

      const correctedGraphData = fixGraphDataWithTax(result);

      const formattedData = {
        calendarDailySum: result.calendar_daily_sum || [],
        monthlyRecordList: adjustedRecordList,
        // graphCategorySum: result.graph_category_sum || [],
        graphCategorySum: correctedGraphData,
      };

      setData(formattedData);
    }
    catch (err) {
      // console.error("履歴取得エラー:", err);
      // リダイレクトのエラーでなければエラー表示
      if (err.message !== "Redirecting...") {
        setError(err.message);
      }
    }
    finally {
      setIsLoading(false);
    }
  }, [authFetch, targetYearMonth]);

  /**
   * 収支の詳細表示
   */
  const getRecordDetail = useCallback(async (recordID) => {
    if (!authFetch) return null;

    try {
      const response = await authFetch(`${BASE_URL}/receipt`, {
        method: "GET",
        headers: {
          "X-Record-ID": recordID,
        },
      });

      if (!response) return null;

      if (!response.ok) {
        throw new Error(`Detail API Error: ${response.status}`);
      }

      const result = await response.json();
      return result.data; 

    }
    catch (err) {
      // console.error("詳細取得エラー:", err);
      throw err;
    }
  }, [authFetch]);

  /**
   * 記録削除
   */
  const deleteRecord = useCallback(async (recordID) => {
    if (!authFetch) return false;

    try {
      const response = await authFetch(`${BASE_URL}/records`, {
        method: "DELETE",
        headers: {
          "X-Record-ID": recordID,
        },
      });

      if (!response) return false;

      if (!response.ok) {
        throw new Error(`Delete API Error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        // 削除成功したらリストを再取得
        fetchHistory();
        return true;
      }
      else {
        throw new Error(result.message || "削除に失敗しました");
      }

    }
    catch (err) {
      // console.error("削除エラー:", err);
      alert(err.message);
      return false;
    }
  }, [authFetch, fetchHistory]);

  // 初回レンダリング時、または年月が変更された時に実行
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 手動更新用
  const refetch = () => fetchHistory();

  return {
    isLoading,
    error,
    refetch,
    getRecordDetail,
    deleteRecord,
    ...data
  };
};