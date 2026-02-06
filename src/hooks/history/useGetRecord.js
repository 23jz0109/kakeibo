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
   * 円グラフ
   * 税抜レシートの差額計算
   * 合計表示の補正
   */
  const fixGraphDataWithTax = (responseData) => {
    const { graph_category_sum, monthly_record_list } = responseData;
    const graphData = graph_category_sum || [];
    const recordList = monthly_record_list || [];

    const sampleItem = graphData.find(item => item.type_id !== undefined);
    const isNumberType = sampleItem && typeof sampleItem.type_id === 'number';

    const EXPENDITURE_ID = isNumberType ? 2 : "2";

    // console.log("Check Tax Logic - Detected Type:", isNumberType ? "Number" : "String");

    // リスト上の本当の合計金額
    const actualTotal = recordList.reduce((sum, record) => {
      if (record.type_id == 2) {
        return sum + Number(record.total_amount);
      }
      return sum;
    }, 0);

    // グラフデータの合計
    const currentGraphTotal = graphData.reduce((sum, category) => {
      if (category.type_id == 2) {
        return sum + Number(category.total_amount);
      }
      return sum;
    }, 0);

    // 差額算出
    const taxAmount = actualTotal - currentGraphTotal;
    // console.log(`Tax Logic: Actual=${actualTotal}, Graph=${currentGraphTotal}, Diff=${taxAmount}`);

    // 消費税カテゴリを追加
    if (taxAmount > 0) {
      const newGraphData = [
        ...graphData,
        {
          type_id: EXPENDITURE_ID,
          category_id: 9999,
          category_name: "消費税",
          category_color: "#9ca3af",
          icon_name: "Receipt",
          total_amount: String(taxAmount)
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
        headers: { "X-Record-ID": recordID },
      });
      if (!response) return null;
      if (!response.ok) throw new Error(`Detail API Error: ${response.status}`);
      
      const result = await response.json();
      const detailData = result.data;

      if (detailData && detailData.receipts && Array.isArray(detailData.receipts)) {
        
        detailData.receipts.forEach(receipt => {
          const totalAmount = Number(receipt.total_amount || 0);
          
          let taxableBase8 = 0;
          let taxableBase10 = 0
          let productsSum = 0;

          if (receipt.products && Array.isArray(receipt.products)) {
            receipt.products.forEach((product) => {
              const price = Number(product.product_price || 0);
              const qty = Number(product.quantity || 1);
              const discount = Number(product.discount || 0);
              const rate = Number(product.tax_rate);

              // 1行の小計 (単価 × 個数 - 割引)
              const lineTotal = (price * qty) - discount;
              productsSum += lineTotal;

              // 税率ごとに振り分け (デフォルトは10%扱いとする)
              if (rate === 8) {
                taxableBase8 += lineTotal;
              } else {
                taxableBase10 += lineTotal;
              }
            });
          }

          // 差額計算(レシート合計 - 商品合計)
          const diff = totalAmount - productsSum;

          // ダミー商品を追加するヘルパー関数
          const addTaxRow = (name, amount, isInternal = false) => {
            if (!isInternal && amount <= 0) return;

            if (!receipt.products) receipt.products = [];
            receipt.products.push({
              product_name: name,
              product_price: String(amount),
              quantity: "1",
              category_id: isInternal ? "tax_internal" : "tax_diff",
              category_name: "消費税",
              icon_name: "Receipt",
              category_color: "#9ca3af",
              tax_rate: "0",
              discount: "0"
            });
          };

          // 税抜
          if (diff > 0) {
            // それぞれの税額を計算 (切り捨て)
            const tax8 = Math.floor(taxableBase8 * 0.08);
            const tax10 = Math.floor(taxableBase10 * 0.10);
            
            addTaxRow("消費税(8%)", tax8);
            addTaxRow("消費税(10%)", tax10);
            
            // 調整用
            const calcTaxTotal = tax8 + tax10;
            const remaining = diff - calcTaxTotal;
            if (remaining > 0) {
              addTaxRow("消費税(調整)", remaining);
            }
          }
          // 税込
          else {
            // 内税計算式: 税込価格 - (税込価格 / (1 + 税率/100))
            const tax8 = Math.floor(taxableBase8 - (taxableBase8 / 1.08));
            const tax10 = Math.floor(taxableBase10 - (taxableBase10 / 1.10));

            if (tax8 > 0) {
              addTaxRow(`(内8%消費税 ¥${tax8.toLocaleString()})`, 0, true);
            }
            if (tax10 > 0) {
              addTaxRow(`(内10%消費税 ¥${tax10.toLocaleString()})`, 0, true);
            }
          }
        });
      }

      return detailData; 
    }
    catch (err) {
      console.error("詳細取得エラー:", err);
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