import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/common/Layout";
import CompleteModal from "../../components/common/CompleteModal";
import ReceiptForm from "../../components/dataInput/ReceiptForm";
import { useCategories } from "../../hooks/common/useCategories";
import styles from "./ExpenseManualInput.module.css";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

const ExpenseManualInput = () => {
  const navigate = useNavigate();
  const { categories, fetchCategories } = useCategories();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  // カテゴリ取得
  useEffect(() => {
    fetchCategories(2);
  }, [fetchCategories]);

  // 送信処理
  const handleCreateSubmit = async ({ receipt, calculated }) => {
    // トークン取得
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      alert("ログイン情報がありません。再度ログインしてください。");
      navigate("/"); 
      return false;
    }

    // 送信データ作成
    const payload = [{
      shop_name: receipt.shop_name || "不明",
      shop_address: "",
      purchase_day: receipt.purchase_day,
      total_amount: calculated.totalAmount,
      memo: receipt.memo,
      products: receipt.products.map(p => ({
        product_name: p.product_name,
        product_price: Number(p.product_price),
        quantity: Number(p.quantity),
        category_id: Number(p.category_id),
      }))
    }];

    console.log("【新規登録データ】:", JSON.stringify(payload, null, 2));
    setIsSubmitting(true);

    try {
      // サーバーへ送信
      const response = await fetch(`${API_BASE_URL}/receipt`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Type-ID": "2"
        },
        body: JSON.stringify(payload)
      });

      // エラー判定
      if (!response.ok) {
        throw new Error("登録に失敗しました");
      }

      // 成功時
      console.log("登録成功");
      setComplete(true);

      // 完了後の処理 (1.5秒後にリセット)
      setTimeout(() => {
        setComplete(false);
        navigate("/history");
      }, 1500);

      return true; // ★成功

    }
    catch (error) {
      console.error(error);
      alert("エラー: " + error.message);
      return false;
    }
    finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout
      headerContent={<h1 className={styles.headerTitle}>支出</h1>}
      mainContent={
        <div className={styles.container}>
          <ReceiptForm 
            categories={categories}
            onSubmit={handleCreateSubmit}
            isSubmitting={isSubmitting}
            submitLabel={isSubmitting ? "送信中..." : "登録する"}
          />
          {complete && <CompleteModal />}
        </div>
      }
      disableDataInputButton={false}/>
  );
};

export default ExpenseManualInput;