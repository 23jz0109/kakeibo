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
import { useAuthFetch } from "../../hooks/useAuthFetch"; 
// [追加] バリデーション定数とヘルパー関数のインポート
import { 
  VALIDATION_LIMITS, 
  validateAmount, 
  validateTextLength, 
  sanitizeNumericInput 
} from "../../constants/validationsLimits";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

const IncomeInput = () => {
  const navigate = useNavigate();
  const [date, setDate, removeDate] = useFormPersist("income_date", new Date());
  const [amount, setAmount, removeAmount] = useFormPersist("income_amount", "");
  const [memo, setMemo, removeMemo] = useFormPersist("income_memo", "");
  const [categoryId, setCategoryId, removeCategory] = useFormPersist("income_category", null);

  const [errors, setErrors] = useState({ amount: "", memo: "" });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const { categories, fetchCategories, addCategory } = useCategories(); 
  
  // 【追加】フック呼び出し
  const authFetch = useAuthFetch();

  // バリデーション実行関数
  const validateField = (name, value) => {
    let error = "";
    if (name === "amount") {
      if (value !== "" && !validateAmount(value)) {
        error = `金額は0〜${VALIDATION_LIMITS.AMOUNT.MAX.toLocaleString()}円の範囲で入力してください`;
      }
    }
    if (name === "memo") {
      if (!validateTextLength(value, VALIDATION_LIMITS.TEXT.MEMO)) {
        error = `メモは${VALIDATION_LIMITS.TEXT.MEMO}文字以内で入力してください`;
      }
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === "";
  };

  // [変更] 数字チェックハンドラ（サニタイズとバリデーション適用）
  const handleNumericChange = (value) => {
    // 全角→半角、非数字除去
    const sanitizedValue = sanitizeNumericInput(value);
    
    // 値の更新
    setAmount(sanitizedValue === "" ? "" : Number(sanitizedValue));
    
    // バリデーション実行
    validateField("amount", sanitizedValue);
  };

  // [追加] メモ変更ハンドラ
  const handleMemoChange = (e) => {
    const value = e.target.value;
    setMemo(value);
    validateField("memo", value);
  };

  // 保存データを消す
  const handleClear = () => {
    if (window.confirm("入力内容をすべて消去しますか？")) {
      removeDate();
      removeAmount();
      removeMemo();
      removeCategory();
      setErrors({}); // [追加] エラーもクリア
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
    // authFetchの準備確認
    if (!authFetch) return;

    // バリデーション
    // [変更] バリデーションチェック（送信前にも再確認）
    const isAmountValid = validateField("amount", amount);
    const isMemoValid = validateField("memo", memo);

    if (!amount || !categoryId) {
      alert("金額とカテゴリを入力してください");
      return;
    }

    // [追加] エラーがある場合は送信中止
    if (!isAmountValid || !isMemoValid || Object.values(errors).some(e => e)) {
      alert("入力内容にエラーがあります。修正してください。");
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
        purchase_day: date, 
        total_amount: amount,
        memo: memo,
        products: [
          {
            product_name: "収入",
            product_price: amount,
            quantity: 1, // [確認] 定数 QUANTITY.MIN 準拠
            category_id: categoryId
          }
        ]
      }
    ];

    setIsSubmitting(true);

    try {
      // authFetchを使用
      const response = await authFetch(`${API_BASE_URL}/receipt`, {
        method: "POST",
        headers: {
          // Authorizationヘッダーは自動付与されるため不要
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Type-ID": "1" // カスタムヘッダーは維持
        },
        body: JSON.stringify(payload)
      });

      // リダイレクト等の場合は response が null になる
      if (!response) return;

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
      setErrors({}); // [追加]
      
      // 完了後の処理 (1.5秒後に遷移)
      setTimeout(() => {
        setComplete(false);
        navigate("/history");
      }, 1500);

    } catch (error) {
      // リダイレクトのエラーでなければアラート表示
      if (error.message !== "Redirecting...") {
        console.error("通信エラー:", error);
        alert("エラーが発生しました: " + error.message);
      }
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
              {/* [変更] エラー時のスタイル適用 */}
              <div className={`${styles.amountInputWrapper} ${errors.amount ? styles.inputErrorBorder : ''}`}>
                <span className={styles.yenMark}>¥</span>
                <input
                  className={styles.amountInput}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => handleNumericChange(e.target.value)}
                  onBlur={() => validateField("amount", amount)} // [追加] Blur時バリデーション
                />
              </div>
              {/* [追加] エラーメッセージ表示 */}
              {errors.amount && <p className={styles.errorText}>{errors.amount}</p>}
          </div>

          <div className={styles.divider} />

          <div className={styles.inputRow}>
              <label className={styles.label}>メモ</label>
              <textarea
                className={`${styles.memoInput} ${errors.memo ? styles.inputErrorBorder : ''}`}
                placeholder="備考"
                value={memo}
                onChange={handleMemoChange} // [変更] 専用ハンドラを使用
                onBlur={() => validateField("memo", memo)} // [追加]
              />
              {/* [追加] エラーメッセージと文字数カウンタ */}
              <div className={styles.memoFooter}>
                {errors.memo && <p className={styles.errorText}>{errors.memo}</p>}
                <span className={`${styles.charCount} ${memo.length > VALIDATION_LIMITS.TEXT.MEMO ? styles.countError : ''}`}>
                  {memo.length}/{VALIDATION_LIMITS.TEXT.MEMO}
                </span>
              </div>
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
          // [変更] エラーがある場合はボタンを無効化
          disabled={isSubmitting || Object.values(errors).some(e => e !== "")} 
        />
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