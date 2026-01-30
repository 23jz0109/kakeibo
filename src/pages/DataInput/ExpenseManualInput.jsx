import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "../../components/common/Layout";
import CompleteModal from "../../components/common/CompleteModal";
import ReceiptForm from "../../components/DataInput/ReceiptForm";
import { useCategories } from "../../hooks/common/useCategories";
import styles from "./ExpenseManualInput.module.css";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";
const STORAGE_KEY = "expense_form_data";

const ExpenseManualInput = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, fetchCategories } = useCategories();
  const [formVersion, setFormVersion] = useState(0);
  const [receiptQueue, setReceiptQueue] = useState(() => {
    const incomingData = location.state?.ocrResult;
    if (incomingData && incomingData.data && incomingData.data.receipts) {
      return incomingData.data.receipts.map(r => ({
        shop_name: r.shop_name,
        purchase_day: r.purchase_day ? new Date(r.purchase_day) : new Date(),
        point_usage: r.point_usage ? Number(r.point_usage) : 0,
        memo: "",
        products: r.products.map(p => ({
            product_name: p.product_name,
            product_price: Number(p.product_price),
            quantity: Number(p.quantity),
            category_id: Number(p.category_id),
            discount: Number(p.discount) || 0,
            tax_rate: Number(p.tax_rate) || 10
        }))
      }));
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map(r => ({
          ...r,
          purchase_day: new Date(r.purchase_day)
        }));
      }
      catch (e) {
        console.error("Backup load failed", e);
      }
    }
    return [null];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const formRef = useRef();

  // スワイプ用参照
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  useEffect(() => {
    fetchCategories(2);
  }, [fetchCategories]);

  // データが変化したら自動保存、空の場合はNULL
  useEffect(() => {
    if (receiptQueue.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(receiptQueue));
    }
  }, [receiptQueue])

  // レシート内容更新ハンドラ
  const handleReceiptUpdate = (updatedReceipt) => {
    setReceiptQueue(prevQueue => {
      // フォームの修正なし = 保存しない
      if (JSON.stringify(prevQueue[currentIndex]) === JSON.stringify(updatedReceipt)) {
        return prevQueue;
      }
      const newQueue = [...prevQueue];
      newQueue[currentIndex] = updatedReceipt;
      return newQueue;
    });
  };

  const handleNext = () => {
    if (currentIndex < receiptQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    if (Math.abs(diffX) > 120 && Math.abs(diffY) < 80) {
      if (diffX > 0) handleNext();
      else handlePrev();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // 内容を消すボタン
  const handleHeaderClear = () => {
    if (window.confirm("入力内容をすべて消去しますか？")) {
      receiptQueue.forEach((_, index) => {
        const formIdKey = `manual_receipt_${index}`;
        localStorage.removeItem(formIdKey);
        localStorage.removeItem(`kakeibo_tax_mode_${formIdKey}`);
      });
      // 初期状態にリセット
      setReceiptQueue([null]); 
      localStorage.removeItem(STORAGE_KEY); 
      setCurrentIndex(0);
      setFormVersion(prev => prev + 1);
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

    const payload = [{
      shop_name: receipt.shop_name || "不明",
      shop_address: "",
      purchase_day: receipt.purchase_day,
      // total_amount: calculated.totalAmount,
      total_amount: calculated.totalAmount - (Number(receipt.point_usage) || 0),
      memo: receipt.memo,
      point_usage: Number(receipt.point_usage) ?? 0,
      products: receipt.products.map(p => ({
        product_name: p.product_name,
        product_price: Number(p.product_price),
        quantity: Number(p.quantity),
        category_id: Number(p.category_id),
        discount: Number(p.discount) || 0,
        tax_rate: Number(p.tax_rate) || 10
      }))
    }];

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

      if (!response.ok) throw new Error("登録に失敗しました");

      setComplete(true);

      // 送信完了後の処理
      setTimeout(() => {
        setComplete(false);
        
        // 送信したレシートをキューから削除
        const newQueue = receiptQueue.filter((_, idx) => idx !== currentIndex);

        // 送信したレシートを消す
        if (newQueue.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
          // 履歴に遷移
          navigate("/history");
        }
        else {
          setReceiptQueue(newQueue);
          if (currentIndex >= newQueue.length) {
            setCurrentIndex(newQueue.length - 1);
          }
        }
      }, 1500);

      return true;

    } 
    // 送信失敗
    catch (error) {
      console.error(error);
      alert("エラー: " + error.message);
      return false;
    }
    finally {
      setIsSubmitting(false);
    }
  };

  // ヘッダー（ページャー表示）
  const headerContent = (
    <div className={styles.headerWrapper}>
      <h1 className={styles.headerTitle}>
        支出 {receiptQueue.length > 1 ? `(${currentIndex + 1}/${receiptQueue.length})` : ""}
      </h1>
      <button className={styles.clearButton} onClick={handleHeaderClear}>クリア</button>
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div 
          className={styles.container}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}>
          {receiptQueue.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button className={`${styles.navArrow} ${styles.navArrowLeft}`} onClick={handlePrev}>
                  <ChevronLeft size={32} />
                </button>
              )}
              {currentIndex < receiptQueue.length - 1 && (
                <button className={`${styles.navArrow} ${styles.navArrowRight}`} onClick={handleNext}>
                  <ChevronRight size={32} />
                </button>
              )}
            </>
          )}

          {receiptQueue.length > 0 && (
            <ReceiptForm 
              key={`receipt-${currentIndex}-${receiptQueue.length}-${formVersion}`}
              ref={formRef}
              initialData={receiptQueue[currentIndex]}
              categories={categories}
              onSubmit={handleCreateSubmit}
              onUpdate={handleReceiptUpdate}
              isSubmitting={isSubmitting}
              submitLabel={isSubmitting ? "送信中..." : (receiptQueue.length > 1 ? "この1枚を登録" : "登録する")}
              typeId={2}
              formId={`manual_receipt_${currentIndex}`}
              onCategoryRefresh={() => { fetchCategories(2) }}
            />
          )}          
          {complete && <CompleteModal />}
        </div>
      }
      disableDataInputButton={false}
    />
  );
};

export default ExpenseManualInput;