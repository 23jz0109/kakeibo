import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import styles from "./CategorySetting.module.css";
import Layout from "../../components/common/Layout";
import { useCategories } from "../../hooks/common/useCategories";
import iconMap, { getIcon } from "../../constants/categories";
import { ChevronLeft, Check, Trash2, Edit2, Save, X } from "lucide-react";
import { VALIDATION_LIMITS } from "../../constants/validationsLimits";

// アイコン選択肢
const ICON_OPTIONS = Object.keys(iconMap).map((key) => ({
  name: key,
  component: iconMap[key]
}));

// カラーパレット
const COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#d946ef",
  "#f43f5e",
  "#6b7280",
];

const CategorySettings = () => {
  const navigate = useNavigate();
  const { categories, loading, fetchPersonalCategories, addCategory, updateCategory, deleteCategory } = useCategories();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(2); // 1: 収入, 2: 支出

  // フォームデータ
  const [editTargetId, setEditTargetId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "ShoppingBag",
    color: "#6b7280"
  });

  // エラー状態管理
  const [errors, setErrors] = useState({});

  // カテゴリを取得
  useEffect(() => {
    fetchPersonalCategories(activeTab);
  }, [activeTab, fetchPersonalCategories]);

  // バリデーション関数
  const validateField = (name, value) => {
    let error = "";
    if (name === "name") {
      if (!value || !value.trim()) {
        error = "カテゴリ名を入力してください";
      } else if (value.length > VALIDATION_LIMITS.TEXT.PRODUCT_NAME) {
        // 便宜上 PRODUCT_NAME (40文字) の制限を使用、必要なら定数定義を変更してください
        error = `カテゴリ名は${VALIDATION_LIMITS.TEXT.PRODUCT_NAME}文字以内で入力してください`;
      }
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === "";
  };

  const handleCreateClick = () => {
    setEditTargetId(null);
    setErrors({}); // エラーリセット
    setFormData({ name: "", icon: "ShoppingBag", color: "#6b7280" });
    setIsModalOpen(true);
  };

  const handleEditClick = (cat) => {
    setEditTargetId(cat.id);
    setErrors({}); // エラーリセット
    setFormData({
      name: cat.category_name,
      icon: cat.icon_name || "HelpCircle",
      color: cat.category_color || "#6b7280"
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditTargetId(null);
    setErrors({});
  };

  // 入力変更ハンドラ
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, name: val }));
    validateField("name", val);
  };

  // 保存
  const handleSave = async () => {
    // [追加] 保存前バリデーション
    const isNameValid = validateField("name", formData.name);

    if (!isNameValid) return;

    let success = false;
    if (editTargetId) {
      // 更新
      success = await updateCategory(editTargetId, formData.name, formData.icon, formData.color, activeTab);
    } else {
      // 追加
      success = await addCategory(formData.name, activeTab, formData.icon, formData.color);
    }

    if (success) {
      await fetchPersonalCategories(activeTab);
      handleCloseModal();
    }
  };

  // 削除
  const handleDelete = async () => {
    if (!window.confirm("このカテゴリを削除しますか？")) return;

    const success = await deleteCategory(editTargetId, activeTab);
    if (success) {
      await fetchPersonalCategories(activeTab);
      setIsModalOpen(false);
    }
  };

  // モーダル
  const renderModal = () => {
    const IconPreview = getIcon(formData.icon);
    return createPortal(
      <div className={styles.modalOverlay} onClick={handleCloseModal}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          {/* ヘッダー */}
          <div className={styles.modalHeader}>
            <div className={styles.modalTitleGroup}>
              <h2>{editTargetId ? "カテゴリ編集" : "カテゴリ追加"}</h2>
              {/* 編集時のみ削除ボタンを表示 */}
              {editTargetId && (
                <button onClick={handleDelete} className={styles.deleteButton}>
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <button onClick={handleCloseModal} className={styles.closeButton}>
              <X size={24} />
            </button>
          </div>

          
          {/* プレビュー & 名前入力 */}
          <div className={styles.previewSection}>
            <div className={styles.iconPreviewCircle} style={{ backgroundColor: formData.color }}>
              <IconPreview size={32} color="#fff" />
            </div>
            <div style={{ width: '100%' }}>
              <input
                type="text"
                // エラー時に赤枠スタイルを適用
                className={`${styles.nameInput} ${errors.name ? styles.inputError : ''}`}
                value={formData.name}
                onChange={handleNameChange}
                placeholder="カテゴリ名"
              />
              {/* エラーメッセージ表示 */}
              {errors.name && <p className={styles.errorMessage}>{errors.name}</p>}
            </div>
          </div>
          <div className={styles.scrollAreaInside}>
            {/* アイコン選択 */}
            <h3 className={styles.sectionTitle}>アイコン</h3>
            <div className={styles.iconGrid}>
              {ICON_OPTIONS.map((opt) => {
                const IconComp = opt.component;
                const isSelected = formData.icon === opt.name;
                return (
                  <div
                    key={opt.name}
                    className={`${styles.iconItem} ${isSelected ? styles.selectedIcon : ''}`}
                    onClick={() => setFormData({ ...formData, icon: opt.name })}
                  >
                    <IconComp size={20} color={isSelected ? "#fff" : "#555"} />
                  </div>
                );
              })}
            </div>

            {/* カラー選択 */}
            <h3 className={styles.sectionTitle}>カラー</h3>
            <div className={styles.colorGrid}>
              {COLOR_PALETTE.map((c) => {
                const isSelected = formData.color === c;
                return (
                  <div
                    key={c}
                    className={`${styles.colorItem} ${isSelected ? styles.selectedColor : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormData({ ...formData, color: c })}
                  >
                    {isSelected && <Check size={16} color="#fff" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 保存ボタンエリア */}
          <div className={styles.modalFooter}>
            <button className={styles.saveButton} onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ヘッダーコンテンツ
  const headerContent = (
    <div className={styles.headerContainer}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          className={styles.backButton}
          onClick={() => navigate("/mypage")}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.headerTitle}>カテゴリ設定</h1>
      </div>
      <button onClick={handleCreateClick} className={styles.addButton}>
        追加
      </button>
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div className={styles.container}>
          <div className={styles.tabArea}>
            {/* タブ切り替え */}
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tab} ${activeTab === 2 ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(2)}
              >
                支出
              </button>
              <button
                className={`${styles.tab} ${activeTab === 1 ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(1)}
              >
                収入
              </button>
            </div>
          </div>

          <div className={styles.scrollArea}>
            {/* リスト */}
            <div className={styles.listContainer}>
              {loading ? (
                <div className={styles.loading}>読み込み中...</div>
              ) : categories.length === 0 ? (
                <div className={styles.emptyState}>カテゴリがありません</div>
              ) : (
                <div className={styles.categoryList}>
                  {categories.map((cat) => {
                    const IconComp = getIcon(cat.icon_name);
                    return (
                      <div
                        key={cat.id}
                        className={styles.listItem}
                        onClick={() => handleEditClick(cat)}
                      >
                        <div className={styles.itemLeft}>
                          <span className={styles.listIcon} style={{ backgroundColor: cat.category_color }}>
                            <IconComp size={20} color="#fff" />
                          </span>
                          <span className={styles.listName}>{cat.category_name}</span>
                        </div>
                        <Edit2 size={16} className={styles.editIcon} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {/* モーダル表示 */}
          {isModalOpen && renderModal()}
        </div>
      }
    />
  );
};

export default CategorySettings;