// hooks/dataInput/useIncomeForm.js
import { useState } from "react";

export const useIncomeForm = (initialIncome = {
  date: new Date().toISOString().split('T')[0],
  categoryId: null,
  amount: 0,
  shop_name: "",
  shop_address: "",
  memo: "",
}) => {
  const [income, setIncome] = useState(initialIncome);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateIncomeInfo = (field, value) => {
    setIncome(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setIncome(initialIncome);
  };

  const validateIncome = () => {
    if (!income.categoryId) {
      alert("カテゴリを選択してください");
      return false;
    }
    if (!income.amount || income.amount <= 0) {
      alert("金額を入力してください");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateIncome()) return;

    setIsSubmitting(true);
    try {
      // APIが期待する支出形式のデータ構造に変換
      const incomeDataForAPI = [{
        shop_name: income.shop_name || "収入元",
        shop_address: income.shop_address || "",
        purchase_day: income.date, // date → purchase_day に変更
        total_amount: income.amount, // amount → total_amount に変更
        products: [ // 収入を1つの商品として扱う
          {
            product_name: income.memo || "収入", // memoを商品名として使用
            product_price: income.amount,
            quantity: 1,
            category_id: income.categoryId
          }
        ]
      }];

      const userId = sessionStorage.getItem("userId");
      
      const response = await fetch("https://t08.mydns.jp/kakeibo/public/api/receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Type-ID": "1", // 収入タイプは1（文字列として送信）
          "X-User-ID": userId,
        },
        body: JSON.stringify(incomeDataForAPI),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("APIエラー詳細:", errorData);
        throw new Error(errorData.message || "収入データの登録に失敗しました");
      }

      const result = await response.json();
      console.log("収入データ登録完了:", result);
      
      // 成功したらフォームをリセット
      resetForm();
      return result;
    } catch (error) {
      console.error("収入データ登録エラー:", error);
      alert(`登録に失敗しました: ${error.message}`);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    income,
    updateIncomeInfo,
    handleSubmit,
    resetForm,
    isSubmitting,
  };
};