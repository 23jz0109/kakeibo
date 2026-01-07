import { useState, useMemo, useEffect } from "react";

/**
 * 商品リスト、合計金額計算(税込・税抜)、データ整形
 * @param {*} initialData 編集モード時の初期データ
 * @param {string|null} persistKey 自動保存するためのLocalStorageキー
 */
export const useReceiptForm = (initialData = null, persistKey = null) => {
  
  // デフォルトの初期値
  const defaultReceipt = {
    shop_name: "",
    shop_address: "",
    purchase_day: new Date(),
    memo: "",
    products: [], 
  };

  // Stateの初期化
  const [receipt, setReceipt] = useState(() => {
    // 編集モードなどで initialData が渡された場合はそれを優先
    if (initialData) return initialData;

    // 自動保存キーがあり、localStorageにデータがあれば復元
    if (persistKey) {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // JSONから戻すとDateは文字列になるため、Dateオブジェクトに再変換
          if (parsed.purchase_day) {
            parsed.purchase_day = new Date(parsed.purchase_day);
          }
          return parsed;
        }
        catch (e) {
          console.error("Failed to parse saved receipt:", e);
        }
      }
    }
    return defaultReceipt;
  });

  // 税率計算モード: 'inclusive'(内税/税込) か 'exclusive'(外税/税抜)
  const [priceMode, setPriceMode] = useState("inclusive");

  // 自動保存
  useEffect(() => {
    if (persistKey && receipt) {
      localStorage.setItem(persistKey, JSON.stringify(receipt));
    }
  }, [receipt, persistKey]);

  // データクリア用
  const resetForm = () => {
    setReceipt(defaultReceipt);
    if (persistKey) {
      localStorage.removeItem(persistKey);
    }
  };

  // 操作
  // 商品追加
  const addItem = (product) => {
    setReceipt((prev) => ({
      ...prev,
      products: [...prev.products, product],
    }));
  };

  // 商品更新
  const updateItem = (index, updatedProduct) => {
    setReceipt((prev) => {
      const newProducts = [...prev.products];
      newProducts[index] = updatedProduct;
      return { ...prev, products: newProducts };
    });
  };

  // 商品削除
  const deleteItem = (index) => {
    setReceipt((prev) => {
      const newProducts = prev.products.filter((_, i) => i !== index);
      return { ...prev, products: newProducts };
    });
  };

  // レシートヘッダー情報（店名、日付など）の更新
  const updateReceiptInfo = (field, value) => {
    setReceipt((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 税率別の計算ロジック
  const calculated = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    let taxByRate = { 8: 0, 10: 0 };

    // 税率ごとの税抜小計
    let baseByRate = { 8: 0, 10: 0 };

    receipt.products.forEach((item) => {
      const price = Number(item.product_price) || 0;
      const qty = Number(item.quantity) || 1;
      const discount = Number(item.discount) || 0;
      const rate = Number(item.tax_rate) || 10;
      const lineTotal = (price * qty) - discount;

      subTotal += lineTotal;

      if (priceMode === "exclusive") {
        baseByRate[rate] = (baseByRate[rate] || 0) + lineTotal;
      }
      else {
        const tax = Math.floor(lineTotal * rate / (100 + rate));
        taxByRate[rate] += tax;
      }
    });

    if (priceMode === "exclusive") {
      Object.keys(baseByRate).forEach((rate) => {
        const tax = Math.floor(baseByRate[rate] * rate / 100);
        taxByRate[rate] = tax;
        totalTax += tax;
      });
    }

    const totalAmount =
      priceMode === "exclusive" ? subTotal + totalTax : subTotal;

    return {
      subTotal,
      taxByRate,
      totalAmount,
    };
  }, [receipt.products, priceMode]);

  // 送信用のデータ整形
  const getPayload = () => {
    return {
      ...receipt,
      total_amount: calculated.totalAmount,
      taxRate: 10 
    };
  };

  return {
    receipt,
    setReceipt,
    priceMode,
    setPriceMode,
    calculated,
    addItem,
    updateItem,
    deleteItem,
    updateReceiptInfo,
    getPayload,
    resetForm
  };
};