import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { Plus, CircleAlert, X, Trash2 } from "lucide-react";
import DayPicker from "./DayPicker";
import DropdownModal from "./DropdownModal";
import Categories from "./Categories";
import SubmitButton from "../common/SubmitButton";
import { useReceiptForm } from "../../hooks/dataInput/useReceiptForm";
import { useCategories } from "../../hooks/common/useCategories";
import { getIcon } from "../../constants/categories";
import { 
  VALIDATION_LIMITS, 
  validateAmount, 
  validateTextLength, 
  sanitizeNumericInput 
} from "../../constants/validationsLimits";
import { useSuggestion } from "../../hooks/dataInput/useSuggestion"; 
import styles from "./ReceiptForm.module.css";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

// 店舗名・メモの入力部分（サジェスト機能 + バリデーション機能の統合版）
const ReceiptHeader = ({ receipt, updateReceiptInfo, shopList = [], errors, validateField }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 候補選択ハンドラ
  const selectShop = (shopName) => {
    updateReceiptInfo("shop_name", shopName);
    setShowSuggestions(false);
    // 候補選択時にもバリデーションを実行（エラーがあれば消すため）
    validateField("shop_name", shopName);
  };

  // ブラー時のハンドラ（サジェスト非表示 と バリデーション を両立）
  const handleBlur = (e) => {
    // 1. サジェストを遅延して閉じる
    setTimeout(() => setShowSuggestions(false), 200);
    // 2. バリデーション実行
    validateField("shop_name", e.target.value);
  };

  const filteredShops = shopList.filter(shop => {
    const name = shop.shop_name || shop.name || "";
    return name.toLowerCase().includes((receipt.shop_name || "").toLowerCase());
  });

  return (
    <div className={styles.inputSection}>
      <div className={styles.inputRow}>
        <label className={styles.label}>店舗名</label>
        <div className={styles.relativeInputArea}>
          {/* 入力欄 */}
          <input
            type="text"
            // クラス名：基本スタイル + エラー時の赤枠
            className={`${styles.cleanInput} ${errors.shop_name ? styles.inputErrorBorder : ''}`}
            placeholder="未入力"
            value={receipt.shop_name}
            onChange={(e) => {
              updateReceiptInfo("shop_name", e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            autoComplete="off"
          />
          {/* 候補表示 */}
          {showSuggestions && receipt.shop_name && filteredShops.length > 0 && (
            <ul className={styles.suggestionList}>
              {filteredShops.map((shop, idx) => (
                <li 
                  key={shop.id || idx} 
                  className={styles.suggestionItem} 
                  onClick={() => selectShop(shop.shop_name || shop.name)}
                >
                  {shop.shop_name || shop.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* エラーメッセージ表示 */}
        {errors.shop_name && <p className={styles.errorText}>{errors.shop_name}</p>}
        {/* 文字数カウント */}
        <span className={`${styles.charCount} ${receipt.shop_name.length > VALIDATION_LIMITS.TEXT.SHOP_NAME ? styles.countError : ''}`}>
          {receipt.shop_name.length}/{VALIDATION_LIMITS.TEXT.SHOP_NAME}
        </span>
      </div>

      <div className={styles.divider}></div>
      
      {/* メモ欄 */}
      <div className={styles.inputRow}>
        <label className={styles.label}>メモ</label>
        <textarea
          className={`${styles.memoInput} ${errors.memo ? styles.inputErrorBorder : ''}`}
          placeholder="備考"
          value={receipt.memo}
          onChange={(e) => updateReceiptInfo("memo", e.target.value)}
          onBlur={(e) => validateField("memo", e.target.value)}
        />
        {errors.memo && <p className={styles.errorText}>{errors.memo}</p>}
        <span className={`${styles.charCount} ${receipt.memo.length > VALIDATION_LIMITS.TEXT.MEMO ? styles.countError : ''}`}>
          {receipt.memo.length}/{VALIDATION_LIMITS.TEXT.MEMO}
        </span>
      </div>
    </div>
  );
};

const ReceiptSummary = ({ calculated, priceMode, setPriceMode, pointsUsage, onPointsChange, errors, validateField }) => {
  const tax8 = calculated.taxByRate["8"] || 0;
  const tax10 = calculated.taxByRate["10"] || 0;
  const points = Number(pointsUsage) || 0;
  const displaySubTotal = calculated.totalAmount - (tax8 + tax10);
  const finalPaymentAmount = Math.max(0, calculated.totalAmount - points);
  
  const handlePointsChange = (e) => {
    const sanitizedValue = sanitizeNumericInput(e.target.value);
    onPointsChange(sanitizedValue);
    validateField("point_usage", sanitizedValue); // 入力時にチェック
  };

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.summaryRow}>
        <span>小計 (税抜)</span><span>¥{displaySubTotal.toLocaleString()}</span>
      </div>
      {tax8 > 0 && (
        <div className={styles.summaryRow}>
          <span>消費税 (8%)</span><span>¥{tax8.toLocaleString()}</span>
        </div>
      )}
      {tax10 > 0 && (
        <div className={styles.summaryRow}>
          <span>消費税 (10%)</span><span>¥{tax10.toLocaleString()}</span>
        </div>
      )}

      {/* ポイント利用入力欄 */}
      <div className={styles.summaryRow} style={{ alignItems: "center", flexWrap: "wrap" }}>
        <span>ポイント利用</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "14px"}}>-</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            placeholder="0"
            value={pointsUsage || ""}
            onChange={handlePointsChange}
            onBlur={() => validateField("point_usage", pointsUsage)}
            className={`${styles.cleanInput} ${errors.point_usage ? styles.inputErrorBorder : ''}`}
            style={{ 
              textAlign: "right", 
              width: "80px", 
              fontSize: "16px", 
              padding: "4px",
              borderBottom: "1px solid #e5e7eb" 
            }}
          />
          <span style={{ fontSize: "14px" }}>P</span>
        </div>
        {/* エラー表示 */}
        {errors.point_usage && <p className={styles.errorText} style={{textAlign: "right"}}>{errors.point_usage}</p>}
      </div>

      <div className={styles.summaryTotalRow}>
        <span>合計金額</span>
        <span className={styles.summaryTotalAmount}>¥{finalPaymentAmount.toLocaleString()}</span>
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
const ReceiptItemPreview = ({ item, categories, onToggleTax }) => {
  const unitPrice = Number(item.product_price) || 0;
  const quantity = Number(item.quantity) || 1;
  const discount = Number(item.discount) || 0;
  const finalPrice = (unitPrice * quantity) - discount;
  const taxRate = Number(item.tax_rate) || 10;

  let categoryData = item.category;
  if (!categoryData && item.category_id && categories.length > 0) {
    categoryData = categories.find(c => String(c.ID || c.id) === String(item.category_id));
  }
  const catColor = categoryData?.CATEGORY_COLOR || categoryData?.category_color || "#9ca3af";
  const iconName = categoryData?.CATEGORY_ICON || categoryData?.category_icon || categoryData?.icon_name;
  const IconComponent = getIcon(iconName);

  return (
    <div className={styles.previewContainer}>
      <div 
        className={styles.iconContainer} 
        onClick={(e) => {
          e.stopPropagation();
          onToggleTax(e);
        }}>
        <div className={styles.categoryIcon} style={{ backgroundColor: catColor }}>
          <IconComponent size={16} />
        </div>
        {taxRate === 8 && (<span className={styles.taxBadge}>8%</span>)}
      </div>
      <div className={styles.info}>
        <span className={styles.productName}>
          {item.product_name || "名称未定"}
        </span>
        {quantity >= 2 && (
          <span className={styles.quantity}>
            ¥{unitPrice.toLocaleString()} × {quantity}
          </span>
        )}
      </div>
      <div className={styles.priceColumn}>
        <span className={styles.productPrice}>¥{finalPrice.toLocaleString()}</span>
        {discount > 0 && (
          <span className={styles.discount}>
            -¥{discount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
};

// レシート項目入力モーダル
const ReceiptItemModal = ({ mode, item, index, categories, productList = [], priceMode, onSubmit, onDelete, closeModal, onCategoryRefresh, typeId = 2 }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "", product_price: "", quantity: 1, category_id: "", tax_rate: "10", discount: "",
  });
  // モーダル内ローカルエラー
  const [localErrors, setLocalErrors] = useState({});

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

  // モーダル内バリデーション
  const validateModalField = (name, value) => {
    let error = "";
    switch (name) {
      case "product_name":
        if (!value) error = "必須です";
        else if (!validateTextLength(value, VALIDATION_LIMITS.TEXT.PRODUCT_NAME)) 
          error = `${VALIDATION_LIMITS.TEXT.PRODUCT_NAME}文字以内`;
        break;
      case "product_price":
        if (value === "") error = "必須です";
        else if (!validateAmount(value)) error = "金額が不正です";
        break;
      case "quantity":
        if (!value || Number(value) < VALIDATION_LIMITS.QUANTITY.MIN) error = "1以上";
        else if (Number(value) > VALIDATION_LIMITS.QUANTITY.MAX) error = "多すぎます";
        break;
      case "discount":
        if (value && !validateAmount(value)) error = "金額が不正です";
        break;
      default:
        break;
    }
    setLocalErrors(prev => ({ ...prev, [name]: error }));
    return error === "";
  };

  const handleNumericChange = (key, value) => {
    const sanitizedValue = sanitizeNumericInput(value);
    setFormData(prev => ({ ...prev, [key]: sanitizedValue }));
    validateModalField(key, sanitizedValue);
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, product_name: value });
    setShowSuggestions(true);
    validateModalField("product_name", value);
  };

  const selectProduct = (product) => {
    const pCatId = product.category_id || product.CATEGORY_ID;
    const matchedCategory = categories.find(c => String(c.ID || c.id) === String(pCatId));
    const validCategoryId = matchedCategory ? (matchedCategory.ID || matchedCategory.id) : (formData.category_id || categories[0]?.ID);

    setFormData({
      ...formData,
      product_name: product.product_name || product.PRODUCT_NAME,
      category_id: validCategoryId
    });
    setLocalErrors(prev => ({ ...prev, product_name: "" }));
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
    validateModalField("product_name", formData.product_name);
  };

  const handleSubmit = () => {
    // 全フィールドチェック
    const isNameValid = validateModalField("product_name", formData.product_name);
    const isPriceValid = validateModalField("product_price", formData.product_price);
    const isQtyValid = validateModalField("quantity", formData.quantity);

    if (!isNameValid || !isPriceValid || !isQtyValid) {
      return; // エラーがあれば中断
    }

    // 割引チェック
    const totalItemPrice = Number(formData.product_price) * Number(formData.quantity);
    if (Number(formData.discount) > totalItemPrice) {
      alert("割引額が商品合計を超えています");
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

  const handleAddCategory = async (newCategoryName, newIconName, newColor) => {
    const success = await addCategory(newCategoryName, typeId, newIconName, newColor);
    if (success) {
      if (onCategoryRefresh) onCategoryRefresh();
    }
  };

  const isInclusive = priceMode === "inclusive";
  const filteredProducts = productList.filter(p => 
    p.product_name && p.product_name.toLowerCase().includes(formData.product_name.toLowerCase())
  );

  return createPortal(
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalDetail} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{mode === "edit" ? "商品編集" : "商品追加"}</span>
          {mode === "edit" && 
            <button 
              className={styles.deleteBtn} 
              onClick={() => { onDelete(index); closeModal(); }}>
              <Trash2 size={16} />
            </button>
          }
        </div>
        <div className={styles.staticInputArea}>
          <div className={styles.modalFlexRow}>
              <div style={{flex:2}} className={`${styles.modalRow} ${styles.inputGroup}`}>
                <label className={styles.modalLabel}>商品名</label>
                <input 
                  className={`${styles.modalInput} ${localErrors.product_name ? styles.inputErrorBorder : ''}`}
                  value={formData.product_name} 
                  placeholder="商品名"
                  onChange={handleNameChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={handleBlur}
                  autoComplete="off"/>
                {localErrors.product_name && <span className={styles.modalErrorText}>{localErrors.product_name}</span>}
                
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
              <div style={{flex:1}} className={`${styles.modalRow} ${styles.inputGroup}`}>
                <label className={styles.modalLabel}>個数</label>
                <input 
                  className={`${styles.modalInput} ${localErrors.quantity ? styles.inputErrorBorder : ''}`}
                  type="text" 
                  inputMode="numeric" 
                  pattern="\d*" 
                  placeholder="個数" 
                  value={formData.quantity} 
                  onChange={(e) => handleNumericChange("quantity", e.target.value)}
                  onBlur={() => validateModalField("quantity", formData.quantity)}
                />
                {localErrors.quantity && <span className={styles.modalErrorText}>{localErrors.quantity}</span>}
              </div>
          </div>
          <div className={styles.modalFlexRow}>
              <div style={{flex:2}} className={`${styles.modalRow} ${styles.inputGroup}`}>
                <label className={styles.modalLabel}>単価 ({isInclusive ? "税込" : "税抜"})</label>
                <input 
                  className={`${styles.modalInput} ${localErrors.product_price ? styles.inputErrorBorder : ''}`}
                  type="text" 
                  inputMode="numeric" 
                  pattern="\d*" 
                  placeholder="0円" 
                  value={formData.product_price} 
                  onChange={(e) => handleNumericChange("product_price", e.target.value)}
                  onBlur={() => validateModalField("product_price", formData.product_price)}
                />
                {localErrors.product_price && <span className={styles.modalErrorText}>{localErrors.product_price}</span>}
              </div>
              <div style={{flex:1}} className={`${styles.modalRow} ${styles.inputGroup}`}>
                <label className={styles.modalLabel}>割引</label>
                <input 
                  className={`${styles.modalInput} ${localErrors.discount ? styles.inputErrorBorder : ''}`}
                  type="text" 
                  inputMode="numeric" 
                  pattern="\d*" 
                  placeholder="0円" 
                  value={formData.discount} 
                  onChange={(e) => handleNumericChange("discount", e.target.value)}
                  onBlur={() => validateModalField("discount", formData.discount)}
                />
                {localErrors.discount && <span className={styles.modalErrorText}>{localErrors.discount}</span>}
              </div>
          </div>
          
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

        <label className={styles.categoryLabel}>カテゴリ</label>
        <div className={styles.scrollableCategoryArea}>
          <Categories 
            categories={categories} 
            selectedCategoryId={Number(formData.category_id)} 
            onSelectedCategory={id=>setFormData({...formData, category_id:id})}
            onAddCategory={handleAddCategory} 
          />
        </div>
        
        <div className={styles.modalActions}>
          <SubmitButton 
            text={mode === "edit" ? "更新" : "追加"} 
            onClick={handleSubmit} 
            style={{flex: 1}}
            // エラーがある場合はボタン無効化
            disabled={Object.values(localErrors).some(e => e !== "")}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

const ReceiptForm = forwardRef(({ 
  categories, 
  initialData = null,
  onSubmit,
  onUpdate,
  submitLabel = "登録する",
  isSubmitting = false,
  formId = "default",
  onCategoryRefresh
}, ref) => {
  const storageKey = `kakeibo_tax_mode_${formId}`;
  const persistKey = formId;

  // useSuggestionフック（データ取得）とエラー管理（バリデーション）の統合
  const { productList, shopList, fetchProductCandidates, fetchShopCandidates } = useSuggestion();
  
  // バリデーション用のエラー状態管理
  const [errors, setErrors] = useState({
    shop_name: "",
    memo: "",
    point_usage: ""
  });

  // フック経由でデータを取得
  useEffect(() => {
    fetchProductCandidates();
    fetchShopCandidates();
  }, [fetchProductCandidates, fetchShopCandidates]);
  
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

  useEffect(() => {
    const savedMode = localStorage.getItem(storageKey);
    if (savedMode === "inclusive" || savedMode === "exclusive") {
      setPriceMode(savedMode);
    }
  }, [setPriceMode, storageKey]);

  const handleSwitchPriceMode = (mode) => {
    setPriceMode(mode);
    localStorage.setItem(storageKey, mode);
  };

  const toggleTaxRate = (e, index) => {
    const currentItem = receipt.products[index];
    const currentRate = currentItem.tax_rate ?? 10; 
    const newRate = currentRate === 10 ? 8 : 10;
    updateItem(index, { ...currentItem, tax_rate: newRate });
  };

  useEffect(() => {
    if (onUpdate) {
      onUpdate({ 
        ...receipt, 
        price_mode: priceMode 
      });
    }
  }, [receipt, priceMode, onUpdate]);

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      resetForm();
      setErrors({}); // エラーもリセット
      setValidationError(null);
    },
    forceReset: () => {
      resetForm();
      setErrors({});
      setValidationError(null);
    }
  }));

  // バリデーション実行関数
  const validateField = (name, value) => {
    let error = "";
    if (name === "shop_name") {
      if (!validateTextLength(value, VALIDATION_LIMITS.TEXT.SHOP_NAME)) {
        error = `${VALIDATION_LIMITS.TEXT.SHOP_NAME}文字以内で入力してください`;
      }
    }
    if (name === "memo") {
      if (!validateTextLength(value, VALIDATION_LIMITS.TEXT.MEMO)) {
        error = `${VALIDATION_LIMITS.TEXT.MEMO}文字以内で入力してください`;
      }
    }
    if (name === "point_usage") {
      if (value !== "" && !validateAmount(value)) {
        error = "ポイントは数値で入力してください";
      }
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === "";
  };

  const handlePressSubmit = async () => {
    // 送信前バリデーション
    const isShopValid = validateField("shop_name", receipt.shop_name);
    const isMemoValid = validateField("memo", receipt.memo);
    const isPointValid = validateField("point_usage", receipt.point_usage);
    
    // エラーがある場合は中止
    if (!isShopValid || !isMemoValid || !isPointValid || Object.values(errors).some(e => e)) {
      setValidationError("入力内容にエラーがあります。");
      return;
    }

    if (receipt.products.length === 0) {
      setValidationError("商品が1つもありません。");
      return;
    }
    
    // ポイントが合計金額を超えていないか最終チェック
    const points = Number(receipt.point_usage) || 0;
    if (points > calculated.totalAmount) {
      setValidationError(`ポイント利用額が合計金額(¥${calculated.totalAmount.toLocaleString()})を超えています。`);
      return;
    }

    const success = await onSubmit({
      receipt,
      calculated,
      priceMode
    });

    if (success) {
      resetForm();
      setErrors({});
      setValidationError(null);
    }
  };

  return (
    <>
      <div className={styles.fixedTopArea}>
        <DayPicker date={receipt.purchase_day} onChange={(d) => updateReceiptInfo("purchase_day", d)} />
        {/* サジェストリストとバリデーション関数の両方を渡す */}
        <ReceiptHeader 
          receipt={receipt} 
          updateReceiptInfo={updateReceiptInfo} 
          shopList={shopList}
          errors={errors}
          validateField={validateField}
        />
      </div>

      <div className={styles.scrollArea}>
        <ReceiptSummary
          calculated={calculated}
          priceMode={priceMode}
          setPriceMode={handleSwitchPriceMode}
          pointsUsage={receipt.point_usage}
          onPointsChange={(val) => updateReceiptInfo("point_usage", val)}
          errors={errors}
          validateField={validateField}
        />
        
        <div className={styles.itemContainer}>
          <div className={styles.itemList}>
            {receipt.products.map((item, index) => (
              <DropdownModal
                key={index}
                title={
                  <ReceiptItemPreview
                    item={item}
                    categories={categories} 
                    onToggleTax={(e) => toggleTaxRate(e, index)}/>
                }
              >
                {(close) => (
                  <ReceiptItemModal
                    mode="edit" item={item} index={index} categories={categories}
                    productList={productList}
                    priceMode={priceMode} onSubmit={updateItem} onDelete={deleteItem} closeModal={close}
                    onCategoryRefresh={onCategoryRefresh}
                  />
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
                <ReceiptItemModal 
                  mode="add" 
                  categories={categories} 
                  productList={productList} 
                  priceMode={priceMode} 
                  onSubmit={addItem} 
                  closeModal={close} 
                  onCategoryRefresh={onCategoryRefresh}
                />
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

      <div className={styles.fixedBottomArea}>
        <SubmitButton 
          text={submitLabel} 
          onClick={handlePressSubmit} 
          // 送信中またはエラーが存在する場合は無効化
          disabled={isSubmitting || Object.values(errors).some(e => e !== "")} 
        />
      </div>
    </>
  );
});

export default ReceiptForm;