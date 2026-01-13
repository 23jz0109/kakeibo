import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Plus, CircleAlert, X, Trash2 } from "lucide-react";
import DayPicker from "./DayPicker";
import DropdownModal from "./DropdownModal";
import Categories from "../../components/dataInput/Categories";
import SubmitButton from "../common/SubmitButton";
import { useReceiptForm } from "../../hooks/dataInput/useReceiptForm";
import { useCategories } from "../../hooks/common/useCategories";
import { getIcon } from "../../constants/categories";
import styles from "./ReceiptForm.module.css";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

// 店舗名・メモの入力部分
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
        placeholder="備考"
        value={receipt.memo}
        onChange={(e) => updateReceiptInfo("memo", e.target.value)}/>
    </div>
  </div>
);

// 小計・消費税・合計表示部分
const ReceiptSummary = ({ calculated, priceMode, setPriceMode }) => {
  const tax8 = calculated.taxByRate["8"] || 0;
  const tax10 = calculated.taxByRate["10"] || 0;
  const displaySubTotal = calculated.totalAmount - (tax8 + tax10);

  // 表示部分生成
  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryRow}>
        <span>小計 (税抜)</span><span>¥{displaySubTotal.toLocaleString()}</span>
      </div>
      {/* 8%の税金がある場合のみ表示 */}
      {tax8 > 0 && (
        <div className={styles.summaryRow}>
          <span>消費税 (8%)</span><span>¥{tax8.toLocaleString()}</span>
        </div>
      )}
      {/* 10%の税金がある場合のみ表示 */}
      {tax10 > 0 && (
        <div className={styles.summaryRow}>
          <span>消費税 (10%)</span><span>¥{tax10.toLocaleString()}</span>
        </div>
      )}
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

// レシート項目表示部分
const ReceiptItemPreview = ({ item, categories }) => {
  const unitPrice = Number(item.product_price) || 0;
  const quantity = Number(item.quantity) || 1;
  const discount = Number(item.discount) || 0;
  const finalPrice = (unitPrice * quantity) - discount;

  let categoryData = item.category;
  if (!categoryData && item.category_id && categories.length > 0) {
    categoryData = categories.find(c => String(c.ID || c.id) === String(item.category_id));
  }
  const catColor = categoryData?.CATEGORY_COLOR || categoryData?.category_color || "#9ca3af";
  const iconName = categoryData?.CATEGORY_ICON || categoryData?.category_icon || categoryData?.icon_name;
  const IconComponent = getIcon(iconName);

  // 表示部分生成
  return (
    <div className={styles.previewContainer}>
      <div className={styles.categoryIcon} style={{ backgroundColor: catColor }}>
        <IconComponent size={16} />
      </div>
      <div className={styles.info}>
        <span className={styles.productName}>
          {item.product_name || "名称未定"}
        </span>
        {quantity >= 2 && (
          <span className={styles.productQuantity}>
            ¥{unitPrice.toLocaleString()} × {quantity}
          </span>
        )}
      </div>
      <div className={styles.priceColumn}>
        <span className={styles.productPrice}>¥{finalPrice.toLocaleString()}</span>
        {discount > 0 && (
          <span className={styles.discount}>-¥{discount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
};

// レシート項目入力部分
const ReceiptItemModal = ({ mode, item, index, categories, productList = [], priceMode, onSubmit, onDelete, closeModal, onCategoryRefresh, typeId = 2 }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "", product_price: "", quantity: 1, category_id: "", tax_rate: "10", discount: "",
  });

  const { addCategory } = useCategories(); 

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

  // 商品名変更ハンドラ
  const handleNameChange = (e) => {
    setFormData({ ...formData, product_name: e.target.value });
    setShowSuggestions(true);
  };

  // 候補選択ハンドラ
  const selectProduct = (product) => {
    const pCatId = product.category_id || product.CATEGORY_ID;
    const matchedCategory = categories.find(c => String(c.ID || c.id) === String(pCatId));
    const validCategoryId = matchedCategory ? (matchedCategory.ID || matchedCategory.id) : (formData.category_id || categories[0]?.ID);

    setFormData({
      ...formData,
      product_name: product.product_name || product.PRODUCT_NAME,
      // product_price: product.product_price || product.price || formData.product_price,
      category_id: validCategoryId
    });
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // 商品追加・編集確定部分
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

  // カテゴリ追加ハンドラ
  const handleAddCategory = async (newCategoryName, newIconName, newColor) => {
    const success = await addCategory(newCategoryName, typeId, newIconName, newColor);
    
    if (success) {
      if (onCategoryRefresh) {
        onCategoryRefresh(); 
      } else {
        alert("カテゴリを追加しました。"); 
      }
    }
  };

  // デフォルト税率
  const isInclusive = priceMode === "inclusive";

  // 候補リストのフィルタリング
  const filteredProducts = productList.filter(p => 
    p.product_name && p.product_name.toLowerCase().includes(formData.product_name.toLowerCase())
  );

  // 表示部分生成
  return (
    <div className={styles.modalDetail}>
      <div className={styles.modalHeader}>
        <span className={styles.modalTitle}>{mode === "edit" ? "商品編集" : "商品追加"}</span>
        {mode === "edit" && 
          <button 
            className={styles.deleteBtn} 
            onClick={() => { 
              onDelete(index); 
              closeModal(); 
            }}>
            <Trash2 size={16} />
          </button>
        }
      </div>
      <div className={styles.staticInputArea}>
        <div className={styles.modalFlexRow}>
             <div style={{flex:2}} className={`${styles.modalRow} ${styles.inputGroup}`}>
                <label className={styles.modalLabel}>商品名</label>
                <input 
                  className={styles.modalInput} 
                  value={formData.product_name} 
                  placeholder="商品名"
                  onChange={handleNameChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={handleBlur}
                  autoComplete="off"
                />
                {/* 候補リスト */}
                {showSuggestions && formData.product_name && filteredProducts.length > 0 && (
                  <ul className={styles.suggestionList}>
                    {filteredProducts.map((p) => (
                      <li key={p.id || p.ID} className={styles.suggestionItem} onClick={() => selectProduct(p)}>
                        <span>{p.product_name}</span>
                      </li>
                    ))}
                  </ul>
                )}
             </div>
             <div style={{flex:1}} className={styles.modalRow}>
                <label className={styles.modalLabel}>個数</label>
                <input className={styles.modalInput} type="text" inputMode="numeric" pattern="\d*" placeholder="個数" value={formData.quantity} onChange={e=>setFormData({...formData, quantity:e.target.value})} />
             </div>
        </div>
        <div className={styles.modalFlexRow}>
             <div style={{flex:2}} className={styles.modalRow}>
                <label className={styles.modalLabel}>単価 ({isInclusive ? "税込" : "税抜"})</label>
                <input className={styles.modalInput} type="text" inputMode="numeric" pattern="\d*" placeholder="0円" value={formData.product_price} onChange={e=>setFormData({...formData, product_price:e.target.value})} />
             </div>
             <div style={{flex:1}} className={styles.modalRow}>
                <label className={styles.modalLabel}>割引</label>
                <input className={styles.modalInput} type="text" inputMode="numeric" pattern="\d*" placeholder="0円" value={formData.discount} onChange={e=>setFormData({...formData, discount:e.target.value})} />
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
        {/* <Categories categories={categories} selectedCategoryId={Number(formData.category_id)} onSelectedCategory={id=>setFormData({...formData, category_id:id})} /> */}
        <Categories 
            categories={categories} 
            selectedCategoryId={Number(formData.category_id)} 
            onSelectedCategory={id=>setFormData({...formData, category_id:id})}
            onAddCategory={handleAddCategory} 
        />
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
  
  const persistKey = null;
  const authToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const [productList, setProductList] = useState([]);

  useEffect(() => {
    const fetchProductCandidates = async () => {
      if (!authToken) return;
      try {
        const response = await fetch(`${API_BASE_URL}/product`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && Array.isArray(data.products)) {
            setProductList(data.products);
          }
        }
      } catch (err) {
        console.error("候補取得エラー", err);
      }
    };

    fetchProductCandidates();
  }, [authToken]);

  
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

  // 税率モード保存
  useEffect(() => {
    const savedMode = localStorage.getItem("kakeibo_price_mode");
    if (savedMode === "inclusive" || savedMode === "exclusive") {
      setPriceMode(savedMode);
    }
  }, [setPriceMode]);

  // 税率モード変換時も保存する
  const handleSwitchPriceMode = (mode) => {
    setPriceMode(mode);
    localStorage.setItem("kakeibo_price_mode", mode);
  };

  // レシート内容変更するたびに保存
  useEffect(() => {
    if (onUpdate) {
      onUpdate(receipt);
    }
  }, [receipt, onUpdate]);

  // クリア
  useImperativeHandle(ref, () => ({
    clearForm: () => {
      resetForm();
    },
    forceReset: () => {
      resetForm();
    }
  }));

  // useImperativeHandle(ref, () => ({
  //   clearForm: () => {
  //     if (receipt.products.length > 0 || receipt.shop_name) {
  //       if (window.confirm("入力中の支出データをすべて消去しますか？")) {
  //         resetForm();
  //         if (persistKey) localStorage.removeItem(persistKey);
  //       }
  //     }
  //   },
  //   forceReset: () => {
  //     resetForm();
  //     if (persistKey) localStorage.removeItem(persistKey);
  //   }
  // }));

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
    }
  };

  return (
    <>
      <div className={styles.fixedTopArea}>
        <DayPicker date={receipt.purchase_day} onChange={(d) => updateReceiptInfo("purchase_day", d)} />
        <ReceiptHeader receipt={receipt} updateReceiptInfo={updateReceiptInfo} />
      </div>

      <div className={styles.scrollArea}>
        <ReceiptSummary calculated={calculated} priceMode={priceMode} setPriceMode={handleSwitchPriceMode} />
        
        <div className={styles.itemContainer}>
          <div className={styles.itemList}>
            {receipt.products.map((item, index) => (
              <DropdownModal key={index} title={<ReceiptItemPreview item={item} categories={categories} />}>
                {(close) => (
                  <ReceiptItemModal
                    mode="edit" item={item} index={index} categories={categories}
                    productList={productList}
                    priceMode={priceMode} onSubmit={updateItem} onDelete={deleteItem} closeModal={close}/>
                )}
              </DropdownModal>
            ))}
            <DropdownModal title={
              <div className={styles.addButtonContent}>
                <span className={styles.addIcon}><Plus size={20} color="#fff"/></span>
                <span className={styles.addText}>項目を追加する</span>
              </div>
            }>
              {(close) => (
                <ReceiptItemModal mode="add" categories={categories} productList={productList} priceMode={priceMode} onSubmit={addItem} closeModal={close} />
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