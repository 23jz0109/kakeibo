import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./Budget.module.css";

const Budget = () => {
  // --- State管理 ---
  const [activeTab, setActiveTab] = useState('budget');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // モーダル関連
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // フォーム初期値
  const initialFormState = {
    id: null,
    type_id: '2', 
    category_id: '',
    amount: '',
    memo: '',
    payment_day: '', 
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- API関連 ---
  const getApiUrl = () => {
    const baseUrl = "https://t08.mydns.jp/kakeibo/public/api"; 
    return activeTab === 'budget' ? `${baseUrl}/budget` : `${baseUrl}/fixed_cost`;
  };

  const getCsrfToken = () => {
    const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  };

  const getHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    const token = getCsrfToken();
    if (token) {
      headers['X-XSRF-TOKEN'] = token;
    }
    return headers;
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = getApiUrl();
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', 
        headers: getHeaders()
      });

      if (response.status === 401) throw new Error("認証エラー: ログインし直してください");
      if (!response.ok) throw new Error(`${activeTab}の取得に失敗しました`);

      const data = await response.json();
      setItems(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async (typeId) => {
    try {
      const url = `https://t08.mydns.jp/kakeibo/public/api/category?type_id=${typeId}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders()
      });
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error("カテゴリ取得エラー", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (showModal) {
      fetchCategories(formData.type_id);
    }
  }, [formData.type_id, showModal]);

  // --- ハンドラ ---
  const handleOpenModal = (mode = 'create', data = null) => {
    setIsEditMode(mode === 'edit');
    if (mode === 'edit' && data) {
      setFormData({
        ...data,
        type_id: String(data.type_id || '2'),
      });
    } else {
      setFormData(initialFormState);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormState);
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const url = getApiUrl();
    const method = isEditMode ? 'PATCH' : 'POST'; 
    const bodyData = { ...formData };
    bodyData.amount = Number(bodyData.amount);
    
    try {
      const response = await fetch(url, { 
        method: method,
        credentials: 'include',
        headers: getHeaders(),
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || '保存に失敗しました');
      }

      await fetchData();
      handleCloseModal();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      const url = getApiUrl();
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeaders(),
        body: JSON.stringify({ id: id })
      });
      if (!response.ok) throw new Error("削除に失敗しました");
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- UI構築 ---

  // ヘッダーデザインを Notification と統一
  const headerContent = (
    <div className={styles.headerContainer}>
      <h1 className={styles.headerTitle}>予算・固定費</h1>
      <div className={styles.headerButtons}>
        <button onClick={() => handleOpenModal('create')} className={styles.iconButton}>
          <Plus size={26} color="#3b82f6" />
        </button>
      </div>
    </div>
  );

  const renderMainContent = () => {
    return (
      <div className={styles.container}>
        {/* タブ切り替えエリア */}
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'budget' ? styles.active : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            予算管理
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'fixed' ? styles.active : ''}`}
            onClick={() => setActiveTab('fixed')}
          >
            固定費
          </button>
        </div>

        {/* リスト表示エリア */}
        <div className={styles.listArea}>
          {isLoading ? (
            <div className={styles.loading}>読み込み中...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>データが登録されていません</div>
          ) : (
            <ul className={styles.itemList}>
              {items.map((item) => (
                <li key={item.id} className={styles.itemCard}>
                  <div className={styles.itemInfo}>
                    <span className={styles.categoryName}>
                      {item.category_name || item.category?.name || 'カテゴリ不明'}
                    </span>
                    <span className={styles.itemMemo}>{item.memo}</span>
                  </div>
                  <div className={styles.itemAmount}>
                    ¥{Number(item.amount).toLocaleString()}
                  </div>
                  <div className={styles.itemActions}>
                    <button onClick={() => handleOpenModal('edit', item)} className={styles.listIconBtn}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className={styles.listIconBtnDanger}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* モーダル */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{activeTab === 'budget' ? '予算' : '固定費'} {isEditMode ? '編集' : '登録'}</h3>
                <button onClick={handleCloseModal} className={styles.closeBtn}><X size={24}/></button>
              </div>
              
              <form onSubmit={handleSave}>
                <div className={styles.formGroup}>
                   <label>収支設定</label>
                   <div className={styles.radioGroup}>
                     <label>
                       <input 
                         type="radio" 
                         name="type_id" 
                         value="2" 
                         checked={String(formData.type_id) === '2'}
                         onChange={(e) => setFormData({...formData, type_id: e.target.value})}
                       /> 支出
                     </label>
                     <label>
                       <input 
                         type="radio" 
                         name="type_id" 
                         value="1" 
                         checked={String(formData.type_id) === '1'}
                         onChange={(e) => setFormData({...formData, type_id: e.target.value})}
                       /> 収入
                     </label>
                   </div>
                </div>

                <div className={styles.formGroup}>
                  <label>カテゴリ</label>
                  <select 
                    value={formData.category_id} 
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    required
                  >
                    <option value="">選択してください</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>金額</label>
                  <input 
                    type="number" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="例: 5000"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>メモ</label>
                  <input 
                    type="text" 
                    value={formData.memo || ''} 
                    onChange={(e) => setFormData({...formData, memo: e.target.value})}
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>キャンセル</button>
                  <button type="submit" className={styles.saveBtn}>保存</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout
      headerContent={headerContent}
      mainContent={renderMainContent()}
    />
  );
};

export default Budget;