import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/common/Layout";
import DayPicker from "../../components/dataInput/DayPicker";
import Categories from "../../components/dataInput/Categories";
import SubmitButton from "../../components/common/SubmitButton";
import CompleteModal from "../../components/common/CompleteModal";
import styles from "./IncomeInput.module.css";
import { useCategories } from "../../hooks/common/useCategories";
import { useFormPersist } from "../../hooks/common/useFormPersist";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

const IncomeInput = () => {
  const navigate = useNavigate();
  const [date, setDate, removeDate] = useFormPersist("income_date", new Date());
  const [amount, setAmount, removeAmount] = useFormPersist("income_amount", "");
  const [memo, setMemo, removeMemo] = useFormPersist("income_memo", "");
  const [categoryId, setCategoryId, removeCategory] = useFormPersist("income_category", null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const { categories, fetchCategories, addCategory } = useCategories(); 

  // 保存データを消す
  const handleClear = () => {
    if (window.confirm("入力内容をすべて消去しますか？")) {
      removeDate();
      removeAmount();
      removeMemo();
      removeCategory();
    }
  };

  useEffect(() => {
    fetchCategories(1);
  }, [fetchCategories]);

  useEffect(() => {
    if (categories.length > 0 && categoryId === null) {
      setCategoryId(categories[0].ID || categories[0].id);
    }
  }, [categories, categoryId, setCategoryId]);

  const handleSubmit = async () => {
    // バリデーション
    if (!amount || !categoryId) {
      alert("金額とカテゴリを入力してください");
      return;
    }

    // トークン取得
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!token) {
      alert("ログイン情報がありません。再度ログインしてください。");
      navigate("/"); 
      return;
    }

    // 送信データ作成
    const payload = [
      {
        shop_name: "収入",
        shop_address: "",
        purchase_day: date, // JSON化の際にISO文字列に自動変換されます
        total_amount: amount,
        memo: memo,
        products: [
          {
            product_name: "収入",
            product_price: amount,
            quantity: 1,
            category_id: categoryId
          }
        ]
      }
    ];

    setIsSubmitting(true);

    try {
      // サーバーへ送信
      const response = await fetch(`${API_BASE_URL}/receipt`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Type-ID": "1"
        },
        body: JSON.stringify(payload)
      });

      // エラー判定
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("登録失敗:", response.status, errorData);
        throw new Error(errorData.message || "登録に失敗しました");
      }

      // 成功時
      console.log("登録成功");
      setComplete(true);
      
      // 送信成功時にデータを削除
      removeDate();
      removeAmount();
      removeMemo();
      removeCategory();
      
      // 完了後の処理 (1.5秒後に遷移)
      setTimeout(() => {
        setComplete(false);
        navigate("/history");
      }, 1500);

    } catch (error) {
      console.error("通信エラー:", error);
      alert("エラーが発生しました: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async (name, icon, color) => {
    const success = await addCategory(name, 1, icon, color);
    if (success) {
      fetchCategories(1);
    }
  };

  const headerContent = (
    <div className={styles.headerWrapper}>
      <h1 className={styles.headerTitle}>収入</h1>
      <button className={styles.clearButton} onClick={handleClear}>
        クリア
      </button>
    </div>
  );

  const mainContent = (
    <div className={styles.container}>
      <div className={styles.fixedTopArea}>
        <div className={styles.dayPickerWrapper}>
          <DayPicker date={date} onChange={setDate} />
        </div>

        <div className={styles.compactInputSection}>
          <div className={styles.inputRow}>
              <label className={styles.label}>金額</label>
              <div className={styles.amountInputWrapper}>
                <span className={styles.yenMark}>¥</span>
                <input
                  className={styles.amountInput}
                  type="text" 
                  pattern="\d*"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val === "" ? "" : Number(val));
                  }}
                />
              </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.inputRow}>
              <label className={styles.label}>メモ</label>
              <input
                className={styles.memoInput}
                type="text"
                placeholder="備考"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
          </div>
        </div>
      </div>

      <div className={styles.scrollArea}>
        <div className={styles.categoryCard}>
          <label className={styles.categoryLabel}>カテゴリ</label>
          <Categories
            categories={categories}
            selectedCategoryId={categoryId}
            onSelectedCategory={setCategoryId}
            onAddCategory={handleAddCategory} 
          />
        </div>
      </div>

      <div className={styles.fixedBottomArea}>
        <SubmitButton
          text={isSubmitting ? "送信中..." : "登録する"}
          onClick={handleSubmit}
          disabled={isSubmitting}/>
      </div>

      {complete && <CompleteModal />}
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={mainContent}
      disableDataInputButton={false} 
    />
  );
};

export default IncomeInput;