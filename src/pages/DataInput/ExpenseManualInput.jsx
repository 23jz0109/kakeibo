import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "../../components/common/Layout";
import CompleteModal from "../../components/common/CompleteModal";
import ReceiptForm from "../../components/dataInput/ReceiptForm";
import { useCategories } from "../../hooks/common/useCategories";
import styles from "./ExpenseManualInput.module.css";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";
const STORAGE_KEY = "ocr_receipt_queue_backup";

const ExpenseManualInput = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, fetchCategories } = useCategories();
  
  const [receiptQueue, setReceiptQueue] = useState(() => {
    const incomingData = location.state?.ocrResult;
    if (incomingData && incomingData.data && incomingData.data.receipts) {
      return incomingData.data.receipts.map(r => ({
        shop_name: r.shop_name,
        purchase_day: r.purchase_day ? new Date(r.purchase_day) : new Date(),
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

  // データが変化したら自動保存
  useEffect(() => {
    if (receiptQueue.length > 0 && receiptQueue[0] !== null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(receiptQueue));
    }
  }, [receiptQueue]);

  const handleReceiptUpdate = (updatedReceipt) => {
    setReceiptQueue(prevQueue => {
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
      if (diffX > 0) {
        handleNext();
      } 
      else {
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleHeaderClear = () => {
    if (window.confirm("全てのレシートデータを削除しますか？")) {
      setReceiptQueue([null]);
      localStorage.removeItem(STORAGE_KEY);
      navigate("/history");
    }
  };

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

        if (newQueue.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
          navigate("/history");
        } else {
          setReceiptQueue(newQueue);
          // インデックス調整（最後を消した場合は一つ前に戻る）
          if (currentIndex >= newQueue.length) {
            setCurrentIndex(newQueue.length - 1);
          }
        }
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

  // ヘッダー（ページャー表示）
  const headerContent = (
    <div className={styles.headerWrapper}>
      <h1 className={styles.headerTitle}>
        支出 {receiptQueue.length > 1 ? `(${currentIndex + 1}/${receiptQueue.length})` : ""}
      </h1>
      <button className={styles.clearButton} onClick={handleHeaderClear}>
        全消去
      </button>
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div 
          className={styles.container}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
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
              // keyにcurrentIndexを含めることで、切り替え時に必ず再マウントさせ、initialDataを読み込ませる
              key={`receipt-${currentIndex}-${receiptQueue.length}`} 
              ref={formRef}
              initialData={receiptQueue[currentIndex]}
              categories={categories}
              onSubmit={handleCreateSubmit}
              onUpdate={handleReceiptUpdate} // ★更新用ハンドラを渡す
              isSubmitting={isSubmitting}
              submitLabel={isSubmitting ? "送信中..." : (receiptQueue.length > 1 ? "この1枚を登録" : "登録する")}/>
          )}
          
          {complete && <CompleteModal />}
        </div>
      }
      disableDataInputButton={false}
    />
  );
};

export default ExpenseManualInput;