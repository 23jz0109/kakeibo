import React, { useEffect, useState, useRef } from "react";
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
  const formRef = useRef();

  // カテゴリ取得
  useEffect(() => {
    fetchCategories(2); // 支出カテゴリ
  }, [fetchCategories]);

  // クリアボタン
  const handleHeaderClear = () => {
    if (formRef.current) {
      formRef.current.clearForm();
    }
  };

  // 送信処理
  const handleCreateSubmit = async ({ receipt, calculated }) => {
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
        discount: Number(p.discount) || 0,
        tax_rate: Number(p.tax_rate) || 10
      }))
    }];

    console.log("【新規登録データ】:", JSON.stringify(payload, null, 2));
    setIsSubmitting(true);

    try {
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

      if (!response.ok) {
        throw new Error("登録に失敗しました");
      }

      console.log("登録成功");
      setComplete(true);

      // 完了後遷移
      setTimeout(() => {
        setComplete(false);
        navigate("/history");
      }, 1500);

      return true;

    } catch (error) {
      console.error(error);
      alert("エラー: " + error.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ヘッダー
  const headerContent = (
    <div className={styles.headerWrapper}>
      <h1 className={styles.headerTitle}>支出</h1>
      <button className={styles.clearButton} onClick={handleHeaderClear}>
        クリア
      </button>
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div className={styles.container}>
          <ReceiptForm 
            ref={formRef}
            categories={categories}
            onSubmit={handleCreateSubmit}
            isSubmitting={isSubmitting}
            submitLabel={isSubmitting ? "送信中..." : "登録する"}
          />
          {complete && <CompleteModal />}
        </div>
      }
      disableDataInputButton={false}
    />
  );
};

export default ExpenseManualInput;