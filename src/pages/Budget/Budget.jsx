import React, { useState, useEffect, useMemo } from "react";
import { Edit2, Trash2, X, CheckCircle, Calendar, AlertCircle, Bell, BellOff } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./Budget.module.css";
import Categories from "../../components/dataInput/Categories";
import { getIcon } from "../../constants/categories";
import { useBudgetApi } from "../../hooks/budget/useBudget";
import { useFixedCostApi } from "../../hooks/budget/useFixedCost";
import { useCategories } from "../../hooks/common/useCategories";


// セレクトボックス
const CustomDropdown = ({ value, options, onChange, placeholder = "選択してください" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 現在選択されているもののラベルを取得
  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className={styles.dropdownWrapper} ref={wrapperRef}>
      <div
        className={`${styles.dropdownDisplay} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}>
        {/* 選択されていればラベル、なければプレースホルダー */}
        <span style={{ color: selectedOption ? '#374151' : '#9ca3af' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={styles.arrow}>▾</span>
      </div>

      {isOpen && (
        <div className={styles.dropdownList}>
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`${styles.dropdownItem} ${String(opt.value) === String(value) ? styles.selected : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Budget = () => {
  const [activeTab, setActiveTab] = useState('budget');
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // ルール一覧用のState
  const [budgetRules, setBudgetRules] = useState([]);
  const [fixedCostRules, setFixedCostRules] = useState([]);

  //ドロップダウン用の汎用ハンドラー
  const handleDropdownChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // フォームデータ
  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",

    // 予算用
    budgetRuleId: "",
    notificationStatus: false,
    customDays: "",

    // 固定費用
    fixedCostRuleId: "",
  });

  const [fixedRuleType, setFixedRuleType] = useState("");
  const [transactionType, setTransactionType] = useState(2);

  // API Hooks
  const {
    fetchBudgets,
    fetchRules: fetchBudgetRulesApi,
    createBudget,
    updateBudget,
    deleteBudget,
    toggleBudget,
    loading: budgetLoading,
    error: budgetError
  } = useBudgetApi();

  const {
    fetchFixedCosts,
    fetchRules: fetchFixedCostRulesApi,
    createFixedCost,
    updateFixedCost,
    deleteFixedCost,
    toggleFixedCost,
    loading: fixedCostLoading,
    error: fixedCostError
  } = useFixedCostApi();

  const { categories, fetchCategories, addCategory } = useCategories();
  const isLoading = activeTab === 'budget' ? budgetLoading : fixedCostLoading;
  const error = activeTab === 'budget' ? budgetError : fixedCostError;

  // 初期データロード
  const loadData = async () => {
    try {
      if (activeTab === 'budget') {
        const res = await fetchBudgets();
        setData(res);
        const rules = await fetchBudgetRulesApi();
        setBudgetRules(rules);
      }
      else {
        const res = await fetchFixedCosts();
        setData(res);
        const rules = await fetchFixedCostRulesApi();
        setFixedCostRules(rules);
      }
    }
    catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (isModalOpen) {
      fetchCategories(transactionType);
    }
  }, [transactionType, fetchCategories, isModalOpen]);

  // IDから固定費タイプを特定
  const getFixedRuleTypeById = (id, rules) => {
    const found = rules.find(r => String(r.id) === String(id));
    return found ? found.rule_name : "";
  };

  // オンオフボタン
  const handleToggle = async (item) => {
    const newStatus = Number(item.notification_enable) === 1 ? 0 : 1;

    // 見た目更新
    setData(prevData => prevData.map(d =>
      d.id === item.id ? { ...d, notification_enable: newStatus } : d
    ));

    try {
      if (activeTab === 'budget') {
        await toggleBudget(item.id);
      }
      else {
        await toggleFixedCost(item.id);
      }
    }
    catch (err) {
      setData(prevData => prevData.map(d =>
        d.id === item.id ? { ...d, notification_enable: item.notification_enable } : d
      ));
      alert("更新に失敗しました: " + err.message);
    }
  };

  // モーダルオープン
  const handleOpenModal = (type, item = null) => {
    if (type === 'edit' && item) {
      setEditItem(item);

      if (activeTab === 'budget') {
        setTransactionType(2);

        // ルールIDがない場合、ルール名からIDを探す
        let targetRuleId = item.budget_rule_id;
        if (!targetRuleId && item.rule_name) {
          const rule = budgetRules.find(r => r.rule_name === item.rule_name);
          if (rule) targetRuleId = rule.id;
        }

        setFormData({
          categoryId: String(item.category_id || ""),
          amount: String(item.budget_limit || ""),    
          budgetRuleId: targetRuleId ? String(targetRuleId) : "",
          notificationStatus: Number(item.notification_enable) === 1, 
          customDays: item.custom_days || (item.rule_name === 'custom' ? item.rule_days : ""),
          fixedCostRuleId: "",
        });
      }
      else {
        const typeId = item.type_id ? Number(item.type_id) : 2;
        setTransactionType(typeId);

        // 固定費ルールIDがない場合、ルール名と日数からIDを探す
        let currentRuleId = item.fixed_cost_rule_id;
        if (!currentRuleId && item.rule_name) {
          const rule = fixedCostRules.find(r => {
            if (r.rule_name !== item.rule_name) return false;
            // 日付指定・曜日指定の場合は日数も一致する必要がある
            if (['fixed_day', 'week_day'].includes(r.rule_name)) return String(r.rule_days) === String(item.rule_days);
            return true;
          });
          if (rule) currentRuleId = rule.id;
        }

        setFormData({
          categoryId: String(item.category_id || ""), 
          amount: String(item.cost || item.amount || ""), 
          fixedCostRuleId: currentRuleId ? String(currentRuleId) : "",
          budgetRuleId: "",
          notificationStatus: false,
          customDays: "",
        });

        //ルールに応じたタイプをセット
        let currentType = "";
        if (currentRuleId) {
          currentType = getFixedRuleTypeById(currentRuleId, fixedCostRules);
        } else if (item.rule_name) {
          currentType = item.rule_name;
        }

        if (currentType === 'fixed_day') setFixedRuleType('monthly_fixed');
        else if (currentType === 'week_day') setFixedRuleType('weekly_fixed');
        else setFixedRuleType(currentType);
      }
    }
    else {
      // 新規作成
      setEditItem(null);
      setFormData({
        categoryId: "",
        amount: "",
        budgetRuleId: "",
        notificationStatus: false,
        customDays: "",
        fixedCostRuleId: "",
      });
      setFixedRuleType("");
      setTransactionType(2);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategorySelect = (id) => {
    setFormData(prev => ({ ...prev, categoryId: id }));
  };

  const handleAddCategory = async (name, icon, color) => {
    const success = await addCategory(name, transactionType, icon, color);
    if (success) {
      alert("カテゴリを追加しました");
    }
  };

  const handleFixedTypeChangeDropdown = (value) => {
    setFixedRuleType(value);

    if (newType === 'daily') {
      const rule = fixedCostRules.find(r => r.rule_name === 'daily');
      setFormData(prev => ({ ...prev, fixedCostRuleId: rule ? rule.id : "" }));
    }
    else if (newType === 'last_day') {
      const rule = fixedCostRules.find(r => r.rule_name === 'last_day');
      setFormData(prev => ({ ...prev, fixedCostRuleId: rule ? rule.id : "" }));
    }
    else {
      setFormData(prev => ({ ...prev, fixedCostRuleId: "" }));
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!formData.categoryId) {
      alert("カテゴリを選択してください");
      return;
    }
    if (!formData.amount) {
      alert("金額を入力してください");
      return;
    }

    try {
      if (activeTab === 'budget') {
        if (!formData.budgetRuleId) {
          alert("予算ルールを選択してください");
          return;
        }
        const payload = {
          category_id: Number(formData.categoryId),
          budget_rule_id: Number(formData.budgetRuleId),
          budget_limit: Number(formData.amount),
          notification_status: formData.notificationStatus ? 1 : 0,
          custom_days: formData.customDays ? Number(formData.customDays) : null
        };
        if (editItem) await updateBudget(editItem.id, payload);
        else await createBudget(payload);
      }
      else {
        if (!formData.fixedCostRuleId) {
          alert("固定費の日程ルールを選択してください");
          return;
        }
        const payload = {
          type_id: transactionType,
          category_id: Number(formData.categoryId),
          fixed_cost_rule_id: Number(formData.fixedCostRuleId),
          cost: Number(formData.amount)
        };
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

  const handleDelete = async (id) => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      if (activeTab === 'budget') await deleteBudget(id);
      else await deleteFixedCost(id);
      loadData();
    }
    catch (err) {
      alert("削除に失敗しました: " + err.message);
    }
  };

  // 予算アイテム
  const renderBudgetItem = (item) => {
    const limit = Number(item.budget_limit) || 0;
    const spent = Number(item.current_usage) || 0;
    const percent = Number(item.usage_percent) || 0;
    const isOver = spent > limit;
    const color = item.category_color || "#3b82f6";
    const isNotifyOn = Number(item.notification_enable) === 1;;
    const IconComponent = getIcon(item.icon_name);
    const ruleDisplayText = item.rule_name === 'custom' ? `指定 (${item.rule_days}日)` : item.rule_name_jp;

    return (
      <div key={item.id} className={styles.card} style={{ borderLeft: `4px solid ${color}` }}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <span className={styles.cardIconBox} style={{ backgroundColor: color }}>
              <IconComponent size={16} color="#fff" />
            </span>
            <div>
              <div className={styles.cardTitle}>{item.category_name}</div>
              <div className={styles.fixedDate}>
                {ruleDisplayText}
              </div>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button onClick={() => handleToggle(item)}>
              {isNotifyOn ? (
                <Bell size={16} className={styles.iconActive} />
              ) : (
                <BellOff size={16} />
              )}
            </button>
            <button onClick={() => handleOpenModal('edit', item)}><Edit2 size={16} /></button>
            <button onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>

          {/* 進捗バーを上部に配置 */}
          <div className={styles.progressContainer} style={{ marginBottom: '8px' }}>
            <div className={`${styles.progressBar} ${isOver ? styles.progressOver : ''}`}
              style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: isOver ? '#ef4444' : color }}></div>
          </div>

          {/* 金額とメッセージを横並び(Flex)にする */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className={styles.budgetAmounts}>
              <span className={styles.amountSpent}>¥{spent.toLocaleString()}</span>
              <span className={styles.amountLimit}> / ¥{limit.toLocaleString()}</span>
              <span className={styles.amountLimit}>({percent}%)</span>
            </div>

            <div className={styles.periodMessage} style={{ color: color }}>
              <AlertCircle size={14} style={{ marginRight: 4 }} />
              <span>{item.period_message}</span>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // 固定費アイテム
  const renderFixedItem = (item) => {
    const amount = Number(item.cost || item.amount || 0);
    const color = item.category_color || "#ec4899";
    const isNotifyOn = Number(item.notification_enable) === 1;
    const IconComponent = getIcon(item.icon_name);

    return (
      <div key={item.id} className={styles.card} style={{ borderLeft: `4px solid ${color}` }}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <span className={`${styles.cardIconBox}`} style={{ backgroundColor: color }}>
              <IconComponent size={16} color="#fff" />
            </span>
            <div>
              <span className={styles.cardTitle}>{item.category_name}</span>
              {/* 日付/曜日情報 */}
              <div className={styles.fixedDate}>
                {item.rule_name_jp}
              </div>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button onClick={() => handleToggle(item)}>
              {isNotifyOn ? (
                <Bell size={16} className={styles.iconActive} />
              ) : (
                <BellOff size={16} />
              )}
            </button>
            <button onClick={() => handleOpenModal('edit', item)}><Edit2 size={16} /></button>
            <button onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
          </div>
        </div>
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e5e7eb' }}>
          <div className={styles.fixedFooter}>
            <div className={styles.fixedAmount}>¥{amount.toLocaleString()}</div>
            {/* 固定費メッセージ */}
            {item.period_message && (
              <div className={styles.periodMessage} style={{ color: color }}>
                <AlertCircle size={14} style={{ marginRight: 4 }} />
                {item.period_message}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // モーダル
  const renderModal = () => (
    <div className={styles.modalOverlay} onClick={handleCloseModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{activeTab === 'budget' ? '予算' : '固定費'}を{editItem ? '編集' : '追加'}</h2>
          <button onClick={handleCloseModal} className={styles.closeButton}><X size={24} /></button>
        </div>

        <div>
          {/* 収入/支出 切り替え (固定費のみ) */}
          {activeTab === 'fixed' && (
            <div className={styles.typeToggleContainer}>
              <button type="button" className={`${styles.typeButton} ${transactionType === 1 ? styles.typeActiveIncome : ''}`} onClick={() => setTransactionType(1)}>収入</button>
              <button type="button" className={`${styles.typeButton} ${transactionType === 2 ? styles.typeActiveExpense : ''}`} onClick={() => setTransactionType(2)}>支出</button>
            </div>
          )}

          {/* カテゴリ */}
          <div className={styles.categoryCard}>
            <label className={styles.categoryLabel}>カテゴリ</label>
            <Categories
              categories={categories}
              selectedCategoryId={formData.categoryId}
              onSelectedCategory={handleCategorySelect}
              onAddCategory={handleAddCategory} />
          </div>

          {/* 金額 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{activeTab === 'budget' ? '上限額' : '金額'}</label>
            <div className={styles.amountInputWrapper}>
              <span className={styles.yenMark}>¥</span>
              <input type="text" inputMode="numeric" pattern="\d*" name="amount" value={formData.amount}
                onChange={handleInputChange} className={styles.amountInput} placeholder="0" />
            </div>
          </div>

          {/* 予算タブのルール設定 */}
          {activeTab === 'budget' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>予算ルール設定</label>
                <div className={styles.flexRow}>
                  <div className={styles.flexItem}>
                    <select
                      name="budgetRuleId"
                      value={formData.budgetRuleId}
                      onChange={handleInputChange}
                      className={styles.selectInput}>
                      <option value="">選択してください</option>
                      {budgetRules.map(rule => (
                        <option key={rule.id} value={rule.id}>{rule.rule_name_jp}</option>
                      ))}
                    </select>
                  </div>

                  {budgetRules.find(r => String(r.id) === String(formData.budgetRuleId))?.rule_name === 'custom' && (
                    <div className={styles.flexItemSmall}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text" inputmode="numeric" pattern="\d*"
                          name="customDays"
                          value={formData.customDays}
                          onChange={handleInputChange}
                          className={styles.inputField}
                          placeholder="日数"
                          style={{ marginBottom: 0 }} />
                        <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>日</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 固定費タブ */}
          {activeTab === 'fixed' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>発生タイミング</label>
              <div className={styles.flexRow}>
                {/* 左側: 頻度選択 */}
                <div className={styles.flexItem}>
                  <CustomDropdown
                    value={fixedRuleType}
                    onChange={handleFixedTypeChangeDropdown}
                    placeholder="頻度を選択"
                    options={[
                      { value: 'monthly_fixed', label: '毎月 (日付指定)' },
                      { value: 'weekly_fixed', label: '毎週 (曜日指定)' },
                      { value: 'last_day', label: '毎月 (末日)' },
                      { value: 'daily', label: '毎日' },
                    ]}
                  />
                </div>

                {/* 右側: 毎月 */}
                {fixedRuleType === 'monthly_fixed' && (
                  <div className={styles.flexItem}>
                    <CustomDropdown
                      value={formData.fixedCostRuleId}
                      onChange={(val) => handleDropdownChange('fixedCostRuleId', val)}
                      placeholder="日付を選択"
                      options={fixedCostRules
                        .filter(r => r.rule_name === 'fixed_day')
                        .map(rule => ({
                          value: rule.id,
                          label: rule.rule_name_jp
                        }))}
                    />
                  </div>
                )}

                {/* 右側: 毎週 */}
                {fixedRuleType === 'weekly_fixed' && (
                  <div className={styles.flexItem}>
                    <CustomDropdown
                      value={formData.fixedCostRuleId}
                      onChange={(val) => handleDropdownChange('fixedCostRuleId', val)}
                      placeholder="曜日を選択"
                      options={fixedCostRules
                        .filter(r => r.rule_name === 'week_day')
                        .map(rule => ({
                          value: rule.id,
                          label: rule.rule_name_jp
                        }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={styles.saveBtn} disabled={isLoading} onClick={handleSave}>
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const headerContent = (
    <div className={styles.headerWrapper}>
      <h1 className={styles.headerTitle}>予算・固定費</h1>
      <button onClick={() => handleOpenModal('create')} className={styles.addButton}>
        追加
      </button>
    </div>
  );

  const renderMainContent = () => (
    <div className={styles.container}>
      <div className={styles.tabContainer}>
        <button className={`${styles.tabButton} ${activeTab === 'budget' ? styles.active : ''}`} onClick={() => setActiveTab('budget')}>予算管理</button>
        <button className={`${styles.tabButton} ${activeTab === 'fixed' ? styles.active : ''}`} onClick={() => setActiveTab('fixed')}>固定費</button>
      </div>
      <div className={styles.contentArea}>
        {isLoading ? <div className={styles.loading}>読み込み中...</div> : error ? <div className={styles.error}>{error}</div> : (
          <div className={styles.listContainer}>
            {data.length === 0 ? <div className={styles.placeholderBox}>データがありません</div> : (
              data.map((item) => (activeTab === 'budget' ? renderBudgetItem(item) : renderFixedItem(item)))
            )}
          </div>
        )}
      </div>
      {isModalOpen && renderModal()}
    </div>
  );

  return <Layout headerContent={headerContent} mainContent={renderMainContent()} />;
};

export default Budget;