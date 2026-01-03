import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Plus, CircleAlert, X } from "lucide-react";
import DayPicker from "./DayPicker";
import DropdownModal from "./DropdownModal";
import Categories from "./Categories";
import SubmitButton from "../common/SubmitButton";
import { useReceiptForm } from "../../hooks/dataInput/useReceiptForm";
import styles from "./ReceiptForm.module.css";

const ReceiptHeader = ({ receipt, updateReceiptInfo }) => (
  <div className={styles.inputSection}>
    <div className={styles.inputRow}>
      <label className={styles.label}>店舗名</label>
      <input
        type="text"
        className={styles.cleanInput}
        placeholder="未入力"
        value={receipt.shop_name}
        onChange={(e) => updateReceiptInfo("shop_name", e.target.value)}/>
    </div>
    <div className={styles.divider}></div>
    <div className={styles.inputRow}>
      <label className={styles.label}>メモ</label>
      <input
        type="text"
        className={styles.cleanInput}
        placeholder="備考 (任意)"
        value={receipt.memo}
        onChange={(e) => updateReceiptInfo("memo", e.target.value)}/>
    </div>
  </div>
);

const ReceiptSummary = ({ calculated, priceMode, setPriceMode }) => {
  const tax8 = calculated.taxByRate["8"] || 0;
  const tax10 = calculated.taxByRate["10"] || 0;
  const displaySubTotal = calculated.totalAmount - (tax8 + tax10);

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryRow}>
        <span>小計 (税抜)</span><span>¥{displaySubTotal.toLocaleString()}</span>
      </div>
      <div className={styles.summaryRow}>
        <span>消費税 (8%)</span><span>¥{tax8.toLocaleString()}</span>
      </div>
      <div className={styles.summaryRow}>
        <span>消費税 (10%)</span><span>¥{tax10.toLocaleString()}</span>
      </div>
      <div className={styles.summaryTotalRow}>
        <span>合計金額</span>
        <span className={styles.summaryTotalAmount}>¥{calculated.totalAmount.toLocaleString()}</span>
      </div>
      <div className={styles.modeSwitchContainer}>
        <button
          type="button"
          className={`${styles.modeButton} ${priceMode === "exclusive" ? styles.modeActiveExclusive : ""}`}
          onClick={() => setPriceMode("exclusive")}>
          税抜
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${priceMode === "inclusive" ? styles.modeActiveInclusive : ""}`}
          onClick={() => setPriceMode("inclusive")}>
          税込
        </button>
      </div>
    </div>
  );
};

const ReceiptItemPreview = ({ item, categories }) => {
  const unitPrice = Number(item.product_price) || 0;
  const quantity = Number(item.quantity) || 1;
  const discount = Number(item.discount) || 0;
  const finalPrice = (unitPrice * quantity) - discount;

  let categoryData = item.category;
  if (!categoryData && item.category_id && categories.length > 0) {
    categoryData = categories.find(c => String(c.ID || c.id) === String(item.category_id));
  }
  const catName = categoryData?.CATEGORY_NAME || categoryData?.category_name || "未分類";
  const catColor = categoryData?.CATEGORY_COLOR || categoryData?.category_color || "#9ca3af";

  return (
    <div className={styles.previewContainer} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <div style={{ backgroundColor: catColor, color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', marginRight: '10px', minWidth: '60px', textAlign: 'center' }}>
        {catName}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
        <span className={styles.productName} style={{ width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.product_name || "名称未定"}
        </span>
        {quantity >= 2 && (
          <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
            ¥{unitPrice.toLocaleString()} × {quantity}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '80px' }}>
        <span className={styles.productPrice}>¥{finalPrice.toLocaleString()}</span>
        {discount > 0 && (
          <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '1px' }}>
            -¥{discount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
};

const ReceiptItemModal = ({ mode, item, index, categories, priceMode, onSubmit, onDelete, closeModal }) => {
  const [formData, setFormData] = useState({
    product_name: "", product_price: "", quantity: 1, category_id: "", tax_rate: "10", discount: "",
  });

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        category_id: item.category_id,
        tax_rate: String(item.tax_rate),
        discount: item.discount === 0 ? "" : item.discount,
      });
    }
    else if (mode === "add" && categories.length > 0) {
      setFormData(prev => prev.category_id ? prev : { ...prev, category_id: categories[0].ID || categories[0].id });
    }
  }, [mode, item, categories]);

  const handleSubmit = () => {
    if (!formData.product_name || !formData.product_price) {
      alert("商品名と単価は必須です");
      return;
    }
    let finalCatId = formData.category_id || (categories[0]?.ID || categories[0]?.id);
    const selectedCat = categories.find(c => String(c.ID || c.id) === String(finalCatId));

    const data = {
      ...formData,
      product_price: Number(formData.product_price),
      quantity: Number(formData.quantity),
      discount: formData.discount === "" ? 0 : Number(formData.discount),
      category_id: Number(finalCatId),
      tax_rate: Number(formData.tax_rate),
      category: selectedCat || null,
    };

    mode === "add" ? onSubmit(data) : onSubmit(index, data);
    closeModal();
  };

  const isInclusive = priceMode === "inclusive";

  return (
    <div className={styles.modalDetail}>
      <div className={styles.modalHeader}>
        <span className={styles.modalTitle}>{mode === "edit" ? "編集" : "追加"}</span>
        {mode === "edit" && <button className={styles.deleteButton} onClick={() => { onDelete(index); closeModal(); }}>🗑️</button>}
      </div>
      <div className={styles.staticInputArea}>
        <div className={styles.modalFlexRow}>
             <div style={{flex:2}} className={styles.modalRow}>
                <label className={styles.modalLabel}>商品名</label>
                <input className={styles.modalInput} value={formData.product_name} onChange={e=>setFormData({...formData, product_name:e.target.value})} />
             </div>
             <div style={{flex:1}} className={styles.modalRow}>
                <label className={styles.modalLabel}>個数</label>
                <input className={styles.modalInput} type="number" value={formData.quantity} onChange={e=>setFormData({...formData, quantity:e.target.value})} />
             </div>
        </div>
        <div className={styles.modalFlexRow}>
             <div style={{flex:2}} className={styles.modalRow}>
                <label className={styles.modalLabel}>単価 ({isInclusive ? "税込" : "税抜"})</label>
                <input className={styles.modalInput} type="number" placeholder="0" value={formData.product_price} onChange={e=>setFormData({...formData, product_price:e.target.value})} />
             </div>
             <div style={{flex:1}} className={styles.modalRow}>
                <label className={styles.modalLabel}>割引</label>
                <input className={styles.modalInput} type="number" placeholder="0" value={formData.discount} onChange={e=>setFormData({...formData, discount:e.target.value})} />
             </div>
        </div>
        
        {/* 税率ボタン */}
        <div className={styles.modalRow}>
           <label className={styles.modalLabel}>税率</label>
           <div className={styles.taxSwitchContainer}>
             <button
               type="button"
               className={`${styles.taxButton} ${String(formData.tax_rate) === "10" ? styles.taxActive : ""}`}
               onClick={() => setFormData({ ...formData, tax_rate: "10" })}>
               10%
             </button>
             <button
               type="button"
               className={`${styles.taxButton} ${String(formData.tax_rate) === "8" ? styles.taxActive : ""}`}
               onClick={() => setFormData({ ...formData, tax_rate: "8" })}>
               8%
             </button>
           </div>
        </div>
      </div>

      <div className={styles.scrollableCategoryArea}>
        <label className={styles.categoryLabel}>カテゴリ</label>
        <Categories categories={categories} selectedCategoryId={Number(formData.category_id)} onSelectedCategory={id=>setFormData({...formData, category_id:id})} />
      </div>
      <div className={styles.modalActions}>
        <SubmitButton text={mode === "edit" ? "更新" : "追加"} onClick={handleSubmit} style={{flex: 1}}/>
      </div>
    </div>
  );
};

const ReceiptForm = forwardRef(({ 
  categories, 
  initialData = null,
  onSubmit,
  onUpdate,
  submitLabel = "登録する",
  isSubmitting = false
}, ref) => {
  // 自動保存用のキー
  const persistKey = initialData ? null : "manual_expense_backup";
  
  const {
    receipt,
    priceMode,
    setPriceMode,
    calculated,
    addItem,
    updateItem,
    deleteItem,
    updateReceiptInfo,
    resetForm
  } = useReceiptForm(initialData, persistKey);

  const [validationError, setValidationError] = useState(null);

  // レシート内容変更するたびに保存
  useEffect(() => {
    if (onUpdate) {
      onUpdate(receipt);
    }
  }, [receipt, onUpdate]);

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      if (receipt.products.length > 0 || receipt.shop_name) {
        if (window.confirm("入力中の支出データをすべて消去しますか？")) {
          resetForm();
          if (persistKey) localStorage.removeItem(persistKey);
        }
      }
    },
    forceReset: () => {
      resetForm();
      if (persistKey) localStorage.removeItem(persistKey);
    }
  }));

  // 送信ハンドラ
  const handlePressSubmit = async () => {
    if (receipt.products.length === 0) {
      setValidationError("商品が1つもありません。");
      return;
    }
    
    const success = await onSubmit({
      receipt,
      calculated,
      priceMode
    });

    if (success) {
      resetForm();
      if (persistKey) localStorage.removeItem(persistKey);
    }
  };

  return (
    <>
      <div className={styles.fixedTopArea}>
        <DayPicker date={receipt.purchase_day} onChange={(d) => updateReceiptInfo("purchase_day", d)} />
        <ReceiptHeader receipt={receipt} updateReceiptInfo={updateReceiptInfo} />
      </div>

      <div className={styles.scrollArea}>
        <ReceiptSummary calculated={calculated} priceMode={priceMode} setPriceMode={setPriceMode} />
        
        <div className={styles.itemContainer}>
          <div className={styles.itemList}>
            {receipt.products.map((item, index) => (
              <DropdownModal key={index} title={<ReceiptItemPreview item={item} categories={categories} />}>
                {(close) => (
                  <ReceiptItemModal
                    mode="edit" item={item} index={index} categories={categories}
                    priceMode={priceMode} onSubmit={updateItem} onDelete={deleteItem} closeModal={close}/>
                )}
              </DropdownModal>
            ))}
            <DropdownModal title={
              <div className={styles.addButtonContent}>
                <span className={styles.addIcon}><Plus size={20} color="white"/></span>
                <span className={styles.addText}>項目を追加する</span>
              </div>
            }>
              {(close) => (
                <ReceiptItemModal mode="add" categories={categories} priceMode={priceMode} onSubmit={addItem} closeModal={close} />
              )}
            </DropdownModal>
          </div>
        </div>

        {validationError && (
          <div className={styles.errorContainer}>
            <CircleAlert size={16} />
            <span className={styles.errorMessage}>{validationError}</span>
            <button onClick={() => setValidationError(null)} className={styles.errorClose}><X size={16} /></button>
          </div>
        )}
      </div>

      <div className={styles.fixedBottomArea} style={{padding: '0 0.5rem'}}>
        <SubmitButton text={submitLabel} onClick={handlePressSubmit} disabled={isSubmitting} />
      </div>
    </>
  );
});
// ReceiptForm.displayName = "ReceiptForm";
export default ReceiptForm;