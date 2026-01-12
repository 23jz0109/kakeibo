import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CategorySetting.module.css";
import Layout from "../../components/common/Layout";
import { useCategories } from "../../hooks/common/useCategories";
import iconMap, { getIcon } from "../../constants/categories";
import { ArrowLeft, Check, Trash2, Edit2, Save, X } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState(2);
  
  // フォームデータ
  const [editTargetId, setEditTargetId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "ShoppingBag",
    color: "#6b7280"
  });

  // カテゴリを取得
  useEffect(() => {
    fetchPersonalCategories(activeTab);
  }, [activeTab, fetchPersonalCategories]);

  const handleCreateClick = () => {
    setEditTargetId(null);
    setFormData({ name: "", icon: "ShoppingBag", color: "#6b7280" });
    setIsModalOpen(true);
  };

  const handleEditClick = (cat) => {
    setEditTargetId(cat.id);
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
  };

  // 保存
  const handleSave = async () => {
    if (!formData.name.trim()) return alert("カテゴリ名を入力してください");

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
      setViewMode('list');
    }
  };

  // モーダル (Budgetのスタイルを踏襲)
  const renderModal = () => {
    const IconPreview = getIcon(formData.icon);

    return (
      <div className={styles.modalOverlay} onClick={handleCloseModal}>
        {/* e.stopPropagation() で内部クリック時の閉じる動作を無効化 */}
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

          {/* コンテンツ本体 (スクロール可能エリア) */}
          <div className={styles.modalBody}>
            
            {/* プレビュー & 名前入力 */}
            <div className={styles.previewSection}>
              <div className={styles.iconPreviewCircle} style={{ backgroundColor: formData.color }}>
                <IconPreview size={32} color="#fff" />
              </div>
              <input
                type="text"
                className={styles.nameInput}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="カテゴリ名"
              />
            </div>

            {/* アイコン選択 */}
            <div className={styles.sectionTitle}>アイコン</div>
            <div className={styles.iconGrid}>
              {ICON_OPTIONS.map(({ name, component: Icon }) => (
                <div
                  key={name}
                  className={`${styles.iconItem} ${formData.icon === name ? styles.selectedIcon : ""}`}
                  onClick={() => setFormData({ ...formData, icon: name })}
                >
                  <Icon size={24} color={formData.icon === name ? "#fff" : "#555"} />
                </div>
              ))}
            </div>

            {/* カラー選択 */}
            <div className={styles.sectionTitle}>カラー</div>
            <div className={styles.colorGrid}>
              {COLOR_PALETTE.map((c) => (
                <div
                  key={c}
                  className={`${styles.colorItem} ${formData.color === c ? styles.selectedColor : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setFormData({ ...formData, color: c })}
                >
                  {formData.color === c && <Check size={16} color="#fff" strokeWidth={3} />}
                </div>
              ))}
            </div>
            
            <div style={{ height: 20 }}></div>
          </div>

          {/* フッター (保存ボタン) */}
          <div className={styles.modalFooter}>
            <button className={styles.saveButton} onClick={handleSave}>
              <Save size={18} style={{ marginRight: 8 }} />
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  // リスト表示
  const renderList = () => (
    <div className={styles.listContainer}>
      <div className={styles.tabContainer}>
        <button className={`${styles.tab} ${activeTab === 2 ? styles.activeTab : ''}`} onClick={() => setActiveTab(2)}>支出</button>
        <button className={`${styles.tab} ${activeTab === 1 ? styles.activeTab : ''}`} onClick={() => setActiveTab(1)}>収入</button>
      </div>

      <div className={styles.categoryList}>
        {loading && <p className={styles.loading}>読み込み中...</p>}
        
        {!loading && categories.length === 0 && (
            <div className={styles.emptyState}>
                <p>オリジナルのカテゴリはありません。<br/>右上のボタンから追加できます。</p>
            </div>
        )}

        {!loading && categories.map((cat) => {
          const IconComp = getIcon(cat.icon_name);
          return (
            <div key={cat.id} className={styles.listItem} onClick={() => handleEditClick(cat)}>
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
    </div>
  );

  return (
    <Layout
      headerContent={
        <div className={styles.headerWrapper}>
          <h1 className={styles.headerTitle}>カテゴリ設定</h1>
          <button onClick={handleCreateClick} className={styles.addButton}>
            追加
          </button>
        </div>
      }
      mainContent={
        <div className={styles.container}>
          {renderList()}
          {isModalOpen && renderModal()}
        </div>
      }
    />
  );
};

export default CategorySettings;