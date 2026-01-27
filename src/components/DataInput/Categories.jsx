import React, { useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Categories.module.css";
import iconMap, { getIcon } from "../../constants/categories"; 
import { Plus, Check, X, Save } from "lucide-react";
// [追加] バリデーション定数のインポート
import { VALIDATION_LIMITS } from "../../constants/validationsLimits";

const ICON_OPTIONS = Object.keys(iconMap).map((key) => ({
  name: key,
  component: iconMap[key]
}));

// カラーパレット
const COLOR_PALETTE = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#f43f5e", // Rose
  "#6b7280", // Gray
];

const Categories = ({ categories = [], selectedCategoryId, onSelectedCategory, onAddCategory }) => {
  // モーダル表示状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 入力フォームの状態
  const [formData, setFormData] = useState({
    name: "",
    icon: "ShoppingBag",
    color: "#6b7280"
  });

  // [追加] エラー状態管理
  const [errors, setErrors] = useState({});

  // [追加] バリデーション関数
  const validateField = (name, value) => {
    let error = "";
    if (name === "name") {
      if (!value || !value.trim()) {
        error = "カテゴリ名を入力してください";
      } else if (value.length > VALIDATION_LIMITS.TEXT.PRODUCT_NAME) { 
        error = `カテゴリ名は${VALIDATION_LIMITS.TEXT.PRODUCT_NAME}文字以内で入力してください`;
      }
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === "";
  };

  // モーダルを開く
  const handleOpenModal = () => {
    setFormData({
      name: "",
      icon: "ShoppingBag",
      color: "#6b7280"
    });
    setErrors({}); // エラーリセット
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setErrors({});
  };

  // [変更] 入力変更ハンドラ（バリデーション付き）
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, name: val }));
    validateField("name", val);
  };

  // 保存処理
  const handleSave = () => {
    // [追加] 保存前バリデーション
    const isNameValid = validateField("name", formData.name);
    if (!isNameValid) return;

    if (onAddCategory) {
      onAddCategory(formData.name, formData.icon, formData.color);
    }
    handleCloseModal();
  };

  // モーダルの中身
  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleCloseModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>カテゴリ追加</h3>
          <button className={styles.closeButton} onClick={handleCloseModal}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* 名前入力 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>カテゴリ名</label>
            <input
              type="text"
              // [変更] エラー時に赤枠スタイルを適用
              className={`${styles.textInput} ${errors.name ? styles.inputError : ''}`}
              value={formData.name}
              onChange={handleNameChange}
              placeholder="例: 食費"
            />
            {/* [追加] エラーメッセージ表示 */}
            {errors.name && <p className={styles.errorMessage}>{errors.name}</p>}
          </div>

          {/* アイコン選択 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>アイコン</label>
            <div className={styles.iconGrid}>
              {ICON_OPTIONS.map((opt) => {
                const Icon = opt.component;
                const isActive = formData.icon === opt.name;
                return (
                  <div
                    key={opt.name}
                    className={`${styles.iconOption} ${isActive ? styles.activeIcon : ""}`}
                    onClick={() => setFormData({ ...formData, icon: opt.name })}
                  >
                    <Icon size={20} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 色選択 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>カラー</label>
            <div className={styles.colorGrid}>
              {COLOR_PALETTE.map((color) => {
                const isSelected = formData.color === color;
                return (
                  <div
                    key={color}
                    className={styles.colorOption}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  >
                    {isSelected && <Check size={16} color="#fff" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.saveButton} onClick={handleSave}>
            <Save size={18} style={{ marginRight: 4 }} />
            保存
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className={styles["category-grid"]}>
        {/* 既存のカテゴリ一覧 */}
        {categories.map((category) => {
          const isSelected = Number(category.id) === Number(selectedCategoryId);
          const IconComponent = getIcon(category.icon_name);

          return (
            <button
              key={category.id}
              className={`${styles["category-button"]} ${isSelected ? styles["selected"] : ""}`}
              onClick={() => onSelectedCategory(category.id)}>
              <span className={styles["category-icon"]} style={{ backgroundColor: category.category_color || '#666' }}>
                <IconComponent size={20} color="#fff"/>
              </span>
              <span className={styles["category-name"]}>{category.category_name}</span>
            </button>
          );
        })}

        {/* 追加ボタン */}
        <button
          className={`${styles["category-button"]} ${styles["add-button"]}`}
          onClick={handleOpenModal}>
          <span className={styles["category-icon"]} style={{ backgroundColor: '#e5e7eb', color: '#374151' }}>
            <Plus size={20} />
          </span>
          <span className={styles["category-name"]}>追加</span>
        </button>
      </div>

      {/* カテゴリ追加モーダル */}
      {isModalOpen && createPortal(modalContent, document.body)}
    </div>
  );
};

export default Categories;