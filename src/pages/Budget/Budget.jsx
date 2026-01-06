import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, CheckCircle, Calendar } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./Budget.module.css";
import { useBudgetApi } from "../../hooks/budget/useBudget";
import { useFixedCostApi } from "../../hooks/budget/useFixedCost";

const Budget = () => {
  const [activeTab, setActiveTab] = useState('budget');
  const [data, setData] = useState([]);
 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ name: "", amount: "", date: "" });

  const { 
    fetchBudgets, 
    createBudget, 
    updateBudget, 
    deleteBudget, 
    loading: budgetLoading, 
    error: budgetError 
  } = useBudgetApi();

  const { 
    fetchFixedCosts, 
    createFixedCost, 
    updateFixedCost, 
    deleteFixedCost, 
    loading: fixedCostLoading, 
    error: fixedCostError 
  } = useFixedCostApi();

  const isLoading = activeTab === 'budget' ? budgetLoading : fixedCostLoading;
  const error = activeTab === 'budget' ? budgetError : fixedCostError;

  // データ取得
  const loadData = async () => {
    try {
      if (activeTab === 'budget') {
        const result = await fetchBudgets();
        setData(result);
      } else {
        const result = await fetchFixedCosts();
        setData(result);
      }
    }
    catch (err) {
      console.error("読み込みエラー:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // モーダル操作
  const handleOpenModal = (type, item = null) => {
    if (type === 'edit' && item) {
      setEditItem(item);
      setFormData({
        name: item.name,
        amount: item.amount,
        date: item.date || "",
      });
    } else {
      setEditItem(null);
      setFormData({ name: "", amount: "", date: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 保存処理
  const handleSave = async (e) => {
    e.preventDefault();
    
    // Aデータ整形
    const payload = {
      name: formData.name,
      amount: Number(formData.amount),
      ...(activeTab === 'fixed' && formData.date ? { date: Number(formData.date) } : {})
    };

    try {
      if (activeTab === 'budget') {
        if (editItem) {
          await updateBudget(editItem.id, payload);
        }
        else {
          await createBudget(payload);
        }
      }
      else {
        if (editItem) {
          await updateFixedCost(editItem.id, payload);
        }
        else {
          await createFixedCost(payload);
        }
      }renderBudgetItem
      handleCloseModal();
      loadData(); // リストを更新
    }
    catch (err) {
      alert("保存に失敗しました: " + err.message);
    }
  };

  // 削除処理
  const handleDelete = async (id) => {
    if(!window.confirm("本当に削除しますか？")) return;

    try {
      if (activeTab === 'budget') {
        await deleteBudget(id);
      }
      else {
        await deleteFixedCost(id);
      }
      loadData(); // リストを更新
    }
    catch (err) {
      alert("削除に失敗しました: " + err.message);
    }
  };

  // ヘッダーデザイン
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

        {/* コンテンツ表示エリア */}
        <div className={styles.contentArea}>
          {isLoading ? (
            <div className={styles.loading}>読み込み中...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <div className={styles.listContainer}>
              {data.length === 0 ? (
                <div className={styles.placeholderBox}>データがありません</div>
              ) : (
                data.map((item) => (
                  activeTab === 'budget' 
                    ? renderBudgetItem(item) 
                    : renderFixedItem(item)
                ))
              )}
            </div>
          )}
        </div>

        {/* モーダル */}
        {isModalOpen && renderModal()}
      </div>
    );
  };

  // 予算アイテムのレンダリング
  const renderBudgetItem = (item) => {
    const limit = Number(item.budget_limit) || 0; 
    const spent = Number(item.current_usage) || 0;
    const percent = Number(item.usage_percent) || 0;    
    const isOver = spent > limit;
    const color = item.category_color || "#3b82f6";

    return (
      <div key={item.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <span className={styles.cardIconBox}><CheckCircle size={16} /></span>
            <span className={styles.cardTitle}>{item.category_name}</span>
          </div>
          <div className={styles.cardActions}>
            <button onClick={() => handleOpenModal('edit', item)}><Edit2 size={16} /></button>
            <button onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
          </div>
        </div>
        
        <div className={styles.budgetAmounts}>
          <span className={styles.amountSpent}>¥{spent?.toLocaleString() || 0}</span>
          <span className={styles.amountLimit}> / ¥{limit?.toLocaleString()}</span>
        </div>

        {/* プログレスバー */}
        <div className={styles.progressContainer}>
          <div 
            className={`${styles.progressBar} ${isOver ? styles.progressOver : ''}`} 
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        <div className={styles.progressText}>
          {item.period_message} 
          <span className={styles.percentText}> ({percent}%)</span>
        </div>
      </div>
    );
  };

  // 固定費アイテムのレンダリング
  const renderFixedItem = (item) => {
    return (
      <div key={item.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <span className={`${styles.cardIconBox} ${styles.fixedIconBox}`}><Calendar size={16} /></span>
            <div>
              <span className={styles.cardTitle}>{item.name}</span>
              <div className={styles.fixedDate}>毎月 {item.date}日 支払い</div>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button onClick={() => handleOpenModal('edit', item)}><Edit2 size={16} /></button>
            <button onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
          </div>
        </div>
        <div className={styles.fixedAmount}>
          ¥{item.amount?.toLocaleString()}
        </div>
      </div>
    );
  };

  // モーダル (入力フォーム)
  const renderModal = () => (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{activeTab === 'budget' ? '予算' : '固定費'}を{editItem ? '編集' : '追加'}</h2>
          <button onClick={handleCloseModal} className={styles.closeButton}><X size={24} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label>名称</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              placeholder={activeTab === 'budget' ? "例: 食費" : "例: 家賃"}
              required 
            />
          </div>
          <div className={styles.formGroup}>
            <label>金額</label>
            <input 
              type="number" 
              name="amount" 
              value={formData.amount} 
              onChange={handleInputChange} 
              placeholder="例: 30000"
              required 
            />
          </div>
          {activeTab === 'fixed' && (
            <div className={styles.formGroup}>
              <label>支払日 (毎月)</label>
              <input 
                type="number" 
                name="date" 
                value={formData.date} 
                onChange={handleInputChange} 
                placeholder="例: 25"
                min="1" max="31"
              />
              <span className={styles.inputSuffix}>日</span>
            </div>
          )}
          <div className={styles.modalActions}>
            <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>キャンセル</button>
            <button type="submit" className={styles.saveBtn}>保存</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={renderMainContent()}
    />
  );
};

export default Budget;