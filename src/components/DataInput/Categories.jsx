import React, { useState } from "react";
import styles from "./Categories.module.css";
import iconMap, { getIcon } from "../../constants/categories"; 
import { Plus, Check, X } from "lucide-react";

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

  // モーダルを開く
  const handleOpenModal = () => {
    setFormData({ name: "", icon: "ShoppingBag", color: "#6b7280" });
    setIsModalOpen(true);
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // 保存処理
  const handleSave = () => {
    if (!formData.name.trim()) {
      alert("カテゴリ名を入力してください");
      return;
    }

    if (typeof onAddCategory === 'function') {
      onAddCategory(formData.name, formData.icon, formData.color);
      setIsModalOpen(false);
    }
    else {
      console.error("onAddCategory 関数が親コンポーネントから渡されていません");
      alert("エラー: カテゴリ追加機能が正しく設定されていません。");
    }
  };

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
                <IconComponent size={20}/>
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
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>カテゴリ追加</h3>
              <button onClick={handleCloseModal} className={styles.closeBtn}><X size={20}/></button>
            </div>

            <div className={styles.modalBody}>
              {/* 名前入力 */}
              <div className={styles.formGroup}>
                <label>カテゴリ名</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="カテゴリ名"
                  className={styles.textInput}/>
              </div>

              {/* アイコン選択 */}
              <div className={styles.formGroup}>
                <label>アイコン</label>
                <div className={styles.iconGrid}>
                  {ICON_LIST.map(({ name, component: Icon }) => (
                    <div 
                      key={name}
                      className={`${styles.iconOption} ${formData.icon === name ? styles.activeIcon : ""}`}
                      onClick={() => setFormData({...formData, icon: name})}>
                      <Icon size={20} />
                    </div>
                  ))}
                </div>
              </div>

              {/* 色選択 */}
              <div className={styles.formGroup}>
                <label>カラー</label>
                <div className={styles.colorGrid}>
                  {COLOR_PALETTE.map((color) => (
                    <div 
                      key={color}
                      className={`${styles.colorOption} ${formData.color === color ? styles.activeColor : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({...formData, color: color})}>
                      {formData.color === color && <Check size={14} color="#fff" strokeWidth={3} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={handleSave} className={styles.saveButton}>
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;