import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, CheckCircle, Calendar, AlertCircle } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./Budget.module.css";
import { useBudgetApi } from "../../hooks/budget/useBudget";
import { useFixedCostApi } from "../../hooks/budget/useFixedCost";
import { useCategories } from "../../hooks/common/useCategories";

const Budget = () => {
  const [activeTab, setActiveTab] = useState('budget');
  const [data, setData] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ name: "", amount: "", date: "" });  
  const [transactionType, setTransactionType] = useState(2);

  // APIフック
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

  const { categories, fetchCategories, loading: categoryLoading } = useCategories();

  const isLoading = activeTab === 'budget' ? budgetLoading : fixedCostLoading;
  const error = activeTab === 'budget' ? budgetError : fixedCostError;

  // データ取得
  const loadData = async () => {
    try {
      if (activeTab === 'budget') {
        const result = await fetchBudgets();
        setData(result);
      }
      else {
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

  // 予算・固定費切り替え時のカテゴリ再取得
  useEffect(() => {
    if (isModalOpen) {
        fetchCategories(transactionType);
    }
  }, [transactionType, fetchCategories, isModalOpen]);

  // モーダル操作
  const handleOpenModal = (type, item = null) => {
    if (type === 'edit' && item) {
      setEditItem(item);
      
      // 予算
      if (activeTab === 'budget') {
        setTransactionType(2);
        setFormData({
          categoryId: item.category_id || "", 
          amount: item.budget_limit || "", 
          date: "" 
        });
      }
      // 固定費(収支)
      else {        
        const typeId = item.type_id ? Number(item.type_id) : 2;
        setTransactionType(typeId);

        setFormData({
          categoryId: item.category_id || "",
          amount: item.amount || "",
          date: item.fixed_day || ""
        });
      }
    }
    else {
      setEditItem(null);
      setFormData({ categoryId: "", amount: "", date: "" });
      
      setTransactionType(2); 
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
    
    const payload = {
      category_id: Number(formData.categoryId),
      amount: Number(formData.amount),
      ...(activeTab === 'fixed' ? { 
          fixed_day: Number(formData.date),
          type_id: transactionType
      } : {})
    };

    try {
      if (activeTab === 'budget') {
        if (editItem) await updateBudget(editItem.id, payload);
        else await createBudget(payload);
      }
      else {
        if (editItem) await updateFixedCost(editItem.id, payload);
        else await createFixedCost(payload);
      }
      handleCloseModal();
      loadData();
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
            onClick={() => setActiveTab('budget')}>
            予算管理
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'fixed' ? styles.active : ''}`}
            onClick={() => setActiveTab('fixed')}>
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

  // 予算
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

  // 固定費
  const renderFixedItem = (item) => {
    const amount = Number(item.amount);
    const color = item.category_color || "#ec4899";

    return (
      <div key={item.id} className={styles.card} style={{ borderLeft: `4px solid ${color}` }}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <span className={`${styles.cardIconBox}`} style={{ backgroundColor: color }}>
              <Calendar size={16} color="#fff" />
            </span>
            <div>
              <span className={styles.cardTitle}>{item.category_name}</span>
              <div className={styles.fixedDate}>
                {item.next_payment_date} ({item.rule_name_jp})
              </div>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button onClick={() => handleOpenModal('edit', item)}><Edit2 size={16} /></button>
            <button onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
          </div>
        </div>
        <div className={styles.fixedFooter}>
          <div className={styles.fixedAmount}>
            ¥{amount.toLocaleString()}
          </div>
          <div className={styles.periodMessage} style={{ color: color }}>
            <AlertCircle size={14} style={{ marginRight: 4 }}/>
            {item.period_message}
          </div>
        </div>
      </div>
    );
  };

  // モーダル (入力フォーム)
  const renderModal = () => (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>
            {activeTab === 'budget' ? '予算' : '固定費'}を
            {editItem ? '編集' : '追加'}
          </h2>
          <button onClick={handleCloseModal} className={styles.closeButton}><X size={24} /></button>
        </div>

        <form onSubmit={handleSave}>
          
          {/* 固定費タブのときだけ「収入/支出」切り替えを表示 */}
          {activeTab === 'fixed' && (
            <div className={styles.typeToggleContainer}>
              <button
                type="button"
                className={`${styles.typeButton} ${transactionType === 1 ? styles.typeActiveIncome : ''}`}
                onClick={() => setTransactionType(1)}>
                収入
              </button>
              <button
                type="button"
                className={`${styles.typeButton} ${transactionType === 2 ? styles.typeActiveExpense : ''}`}
                onClick={() => setTransactionType(2)}>
                支出
              </button>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>カテゴリ</label>
            {/* 名前入力(input)ではなく、カテゴリ選択(select)に変更 */}
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              required
              disabled={categoryLoading}>
              <option value="">
                {categoryLoading ? "読み込み中..." : "カテゴリを選択"}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>金額</label>
            <input 
              type="number" 
              name="amount" 
              value={formData.amount} 
              onChange={handleInputChange} 
              required 
            />
          </div>
          
          {activeTab === 'fixed' && (
            <div className={styles.formGroup}>
              <label>支払日/入金日 (1-31)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  name="date" 
                  value={formData.date} 
                  onChange={handleInputChange} 
                  // placeholder="例: 25"
                  min="1" max="31"
                  style={{ flex: 1 }}
                />
                <span className={styles.inputSuffix}>日</span>
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>キャンセル</button>
            <button type="submit" className={styles.saveBtn} disabled={isLoading}>
              {isLoading ? '保存中...' : '保存'}
            </button>
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