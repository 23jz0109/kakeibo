import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Edit2, Trash2, X, AlertCircle, Bell, BellOff } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./Budget.module.css";
import Categories from "../../components/dataInput/Categories";
import { getIcon } from "../../constants/categories";
import { useBudgetApi } from "../../hooks/budget/useBudget";
import { useFixedCostApi } from "../../hooks/budget/useFixedCost";
import { useCategories } from "../../hooks/common/useCategories";
import { 
  VALIDATION_LIMITS, 
  validateAmount, 
  sanitizeNumericInput 
} from "../../constants/validationsLimits";
import SubmitButton from "../../components/common/SubmitButton";
import ErrorDisplay from "../../components/common/ErrorDisplay"; // ★追加

const CustomDropdown = ({ value, options, onChange, placeholder = "選択してください", hasError }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const handleToggle = (e) => {
    e.stopPropagation();

    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const estimatedMenuHeight = 240;

      const newStyle = {
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        position: 'fixed',
        zIndex: 9999,
        overflowY: 'auto',
      };

      if (spaceBelow < estimatedMenuHeight) {
        newStyle.bottom = `${viewportHeight - rect.top + 4}px`;
        newStyle.top = 'auto'; 
        newStyle.maxHeight = `${Math.min(estimatedMenuHeight, rect.top - 20)}px`;
        newStyle.transformOrigin = 'bottom center';
      } else {
        newStyle.top = `${rect.bottom + 4}px`;
        newStyle.bottom = 'auto';
        newStyle.maxHeight = `${Math.min(estimatedMenuHeight, spaceBelow - 20)}px`;
        newStyle.transformOrigin = 'top center';
      }

      setMenuStyle(newStyle);
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const dropdownList = isOpen ? (
    createPortal(
      <>
        <div className={styles.dropdownBackdrop} onClick={() => setIsOpen(false)} />
        <div 
          className={styles.dropdownMenu}
          style={menuStyle}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`${styles.dropdownItem} ${String(opt.value) === String(value) ? styles.selected : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(opt.value);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </>,
      document.body
    )
  ) : null;

  return (
    <>
      <div 
        ref={triggerRef}
        className={`${styles.dropdownValue} ${hasError ? styles.inputErrorBorder : ''}`} 
        onClick={handleToggle}
      >
        <span 
          className={styles.dropdownLabel} 
          style={{ color: selectedOption ? '#374151' : '#9ca3af' }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={styles.arrow}>▾</span>
      </div>
      
      {dropdownList}
    </>
  );
};

const Budget = () => {
  const [activeTab, setActiveTab] = useState('budget');
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [budgetRules, setBudgetRules] = useState([]);
  const [fixedCostRules, setFixedCostRules] = useState([]);

  const [errors, setErrors] = useState({
    amount: "",
    customDays: "",
    budgetRuleId: "",
    fixedCostRuleId: ""
  });

  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    budgetRuleId: "",
    notificationStatus: false,
    customDays: "",
    fixedCostRuleId: "",
  });

  const [fixedRuleType, setFixedRuleType] = useState("");
  const [transactionType, setTransactionType] = useState(2);

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

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "amount":
        if (value === "") error = "";
        else if (!validateAmount(value)) error = `金額は${VALIDATION_LIMITS.AMOUNT.MAX.toLocaleString()}円以下にしてください`;
        break;
      case "customDays":
        if (value !== "") {
          const days = Number(value);
          if (days < VALIDATION_LIMITS.DAYS.MIN || days > VALIDATION_LIMITS.DAYS.MAX) {
            error = `${VALIDATION_LIMITS.DAYS.MIN}〜${VALIDATION_LIMITS.DAYS.MAX}日の間で入力してください`;
          }
        }
        break;
      case "budgetRuleId":
        if (!value && activeTab === 'budget') error = "ルールを選択してください";
        break;
      case "fixedCostRuleId":
        if (!value && activeTab === 'fixed' && fixedRuleType !== 'daily' && fixedRuleType !== 'last_day') {
          error = "日付・曜日を選択してください";
        }
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === "";
  };

  const handleDropdownChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const getFixedRuleTypeById = (id, rules) => {
    const found = rules.find(r => String(r.id) === String(id));
    return found ? found.rule_name : "";
  };

  const handleToggle = async (item) => {
    const newStatus = Number(item.notification_enable) === 1 ? 0 : 1;
    setData(prevData => prevData.map(d =>
      d.id === item.id ? { ...d, notification_enable: newStatus } : d
    ));
    try {
      if (activeTab === 'budget') await toggleBudget(item.id);
      else await toggleFixedCost(item.id);
    } catch (err) {
      setData(prevData => prevData.map(d =>
        d.id === item.id ? { ...d, notification_enable: item.notification_enable } : d
      ));
      alert("更新に失敗しました: " + err.message);
    }
  };

  const handleOpenModal = (type, item = null) => {
    setErrors({ amount: "", customDays: "", budgetRuleId: "", fixedCostRuleId: "" });

    if (type === 'edit' && item) {
      setEditItem(item);

      if (activeTab === 'budget') {
        setTransactionType(2);
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
        let currentRuleId = item.fixed_cost_rule_id;
        if (!currentRuleId && item.rule_name) {
          const rule = fixedCostRules.find(r => {
            if (r.rule_name !== item.rule_name) return false;
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
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    let cleanValue = value;
    if (name === 'amount' || name === 'customDays') {
      cleanValue = sanitizeNumericInput(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: cleanValue }));
    validateField(name, cleanValue);
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
    let newRuleId = "";
    if (value === 'daily') {
      const rule = fixedCostRules.find(r => r.rule_name === 'daily');
      newRuleId = rule ? rule.id : "";
    }
    else if (value === 'last_day') {
      const rule = fixedCostRules.find(r => r.rule_name === 'last_day');
      newRuleId = rule ? rule.id : "";
    }
    
    setFormData(prev => ({ ...prev, fixedCostRuleId: newRuleId }));
    
    if (value === 'daily' || value === 'last_day') {
      setErrors(prev => ({ ...prev, fixedCostRuleId: "" }));
    }
  };

  const handleSave = async () => {
    const isAmountValid = validateField('amount', formData.amount);
    let isRuleValid = true;
    let isDaysValid = true;

    if (!formData.categoryId) {
      alert("カテゴリを選択してください");
      return;
    }
    if (!formData.amount) {
      alert("金額を入力してください");
      return;
    }
    
    if (activeTab === 'budget') {
      isRuleValid = validateField('budgetRuleId', formData.budgetRuleId);
      const selectedRule = budgetRules.find(r => String(r.id) === String(formData.budgetRuleId));
      if (selectedRule && selectedRule.rule_name === 'custom') {
         isDaysValid = validateField('customDays', formData.customDays);
         if (!formData.customDays) {
           setErrors(prev => ({ ...prev, customDays: "必須です" }));
           isDaysValid = false;
         }
      }
    } else {
      if (fixedRuleType !== 'daily' && fixedRuleType !== 'last_day') {
         isRuleValid = validateField('fixedCostRuleId', formData.fixedCostRuleId);
      }
    }

    if (!isAmountValid || !isRuleValid || !isDaysValid || Object.values(errors).some(e => e)) {
      return;
    }

    try {
      if (activeTab === 'budget') {
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
              <IconComponent size={20} color="#fff" />
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
                <Bell size={18} className={styles.iconActive} />
              ) : (
                <BellOff size={18} />
              )}
            </button>
            <button onClick={() => handleOpenModal('edit', item)}><Edit2 size={18} /></button>
            <button onClick={() => handleDelete(item.id)}><Trash2 size={18} /></button>
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <div className={styles.progressContainer} style={{ marginBottom: '8px' }}>
            <div className={`${styles.progressBar} ${isOver ? styles.progressOver : ''}`}
              style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: isOver ? '#ef4444' : color }}></div>
          </div>

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
              <IconComponent size={20} color="#fff" />
            </span>
            <div>
              <span className={styles.cardTitle}>{item.category_name}</span>
              <div className={styles.fixedDate}>
                {item.rule_name_jp}
              </div>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button onClick={() => handleToggle(item)}>
              {isNotifyOn ? (
                <Bell size={18} className={styles.iconActive} />
              ) : (
                <BellOff size={18} />
              )}
            </button>
            <button onClick={() => handleOpenModal('edit', item)}><Edit2 size={18} /></button>
            <button onClick={() => handleDelete(item.id)}><Trash2 size={18} /></button>
          </div>
        </div>
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e5e7eb' }}>
          <div className={styles.fixedFooter}>
            <div className={styles.fixedAmount}>¥{amount.toLocaleString()}</div>
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

  const renderModal = () => {
    const modalContent = (
      <div className={styles.modalOverlay} onClick={handleCloseModal}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>{activeTab === 'budget' ? '予算' : '固定費'}を{editItem ? '編集' : '追加'}</h2>
            <button onClick={handleCloseModal} className={styles.closeButton}><X size={24} /></button>
          </div>

          <div className={styles.modalBody}>
            {activeTab === 'fixed' && (
              <div className={styles.typeToggleContainer}>
                <button type="button" className={`${styles.typeButton} ${transactionType === 1 ? styles.typeActiveIncome : ''}`} onClick={() => setTransactionType(1)}>収入</button>
                <button type="button" className={`${styles.typeButton} ${transactionType === 2 ? styles.typeActiveExpense : ''}`} onClick={() => setTransactionType(2)}>支出</button>
              </div>
            )}

            <div className={styles.categoryCard}>
              <label className={styles.categoryLabel}>カテゴリ</label>
              <div className={styles.categoryScrollArea}>
                <Categories 
                  categories={categories} 
                  selectedCategoryId={formData.categoryId} 
                  onSelectedCategory={handleCategorySelect} 
                  onAddCategory={handleAddCategory} 
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{activeTab === 'budget' ? '上限額' : '金額'}</label>
              <div className={`${styles.amountInputWrapper} ${errors.amount ? styles.inputErrorBorder : ''}`}>
                <span className={styles.yenMark}>¥</span>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  onBlur={() => validateField('amount', formData.amount)}
                  className={styles.amountInput}
                  placeholder="0" />
              </div>
              {errors.amount && <p className={styles.errorText}>{errors.amount}</p>}
            </div>

            {activeTab === 'budget' ? (
              <div className={styles.formGroup}>
                <label className={styles.label}>予算ルール設定</label>
                <div className={styles.flexRow}>
                  <div className={styles.flexItem}>
                    <CustomDropdown
                      value={formData.budgetRuleId}
                      onChange={(val) => handleDropdownChange('budgetRuleId', val)}
                      placeholder="ルールを選択"
                      options={budgetRules.map(rule => ({
                        value: rule.id,
                        label: rule.rule_name_jp || rule.rule_name
                      }))}
                      hasError={!!errors.budgetRuleId}
                    />
                    {errors.budgetRuleId && <p className={styles.errorText}>{errors.budgetRuleId}</p>}
                  </div>

                  {budgetRules.find(r => String(r.id) === String(formData.budgetRuleId))?.rule_name === 'custom' && (
                    <div className={styles.flexItemSmall}>
                      <div className={`${styles.inputField} ${errors.customDays ? styles.inputErrorBorder : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text" inputMode="numeric" pattern="\d*"
                          name="customDays"
                          value={formData.customDays}
                          onChange={handleInputChange}
                          onBlur={() => validateField('customDays', formData.customDays)}
                          style={{ border: 'none', width: '100%', outline: 'none', textAlign: 'right' }}
                          placeholder="0" />
                        <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>日</span>
                      </div>
                    </div>
                  )}
                </div>
                 {errors.customDays && <p className={styles.errorText} style={{fontSize: '0.65rem'}}>{errors.customDays}</p>}

                <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
                  <label style={{ margin: 0 }}>通知設定</label>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      name="notificationStatus"
                      checked={formData.notificationStatus}
                      onChange={handleInputChange}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.label}>発生タイミング</label>
                <div className={styles.flexRow}>
                  <div className={styles.flexItem7}>
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

                  {(fixedRuleType === 'monthly_fixed' || fixedRuleType === 'weekly_fixed') && (
                    <div className={styles.flexItem3}>
                      <CustomDropdown
                        value={formData.fixedCostRuleId}
                        onChange={(val) => handleDropdownChange('fixedCostRuleId', val)}
                        placeholder={fixedRuleType === 'monthly_fixed' ? "日付" : "曜日"}
                        options={activeFixedOptions}
                        hasError={!!errors.fixedCostRuleId}
                      />
                    </div>
                  )}
                </div>
                {errors.fixedCostRuleId && <p className={styles.errorText}>{errors.fixedCostRuleId}</p>}
              </div>
            )}

            <div className={styles.modalActions}>
              <SubmitButton
                disabled={isLoading || Object.values(errors).some(e => e !== "")}
                onClick={handleSave}
                text={isLoading ? '保存中...' : '保存'}
              />
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

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
        {/* ★ ErrorDisplay 対応 (優先度: Error > Loading > Data) */}
        {error ? (
          <ErrorDisplay onRetry={loadData} />
        ) : isLoading ? (
          <div className={styles.loading}>読み込み中...</div>
        ) : (
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