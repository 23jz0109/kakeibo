import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Trash2, Search, CheckCircle, Edit2, X } from 'lucide-react';
import styles from './Notification.module.css';
import { useNotification } from '../../hooks/notification/useNotification';
import { useSuggestion } from '../../hooks/dataInput/useSuggestion';
import { 
  VALIDATION_LIMITS, 
  validateTextLength, 
  sanitizeNumericInput 
} from '../../constants/validationsLimits';
import SubmitButton from '../../components/common/SubmitButton';

// 時間選択用の汎用プルダウンコンポーネント
const TimeDropdown = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.dropdownWrapper} ref={wrapperRef}>
      <div
        className={`${styles.dropdownDisplay} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}>
        <span>{String(value).padStart(2, '0')}</span>
        <span className={styles.arrow}>▾</span>
      </div>

      {isOpen && (
        <div className={styles.dropdownList}>
          {options.map((opt) => (
            <div
              key={opt}
              className={`${styles.dropdownItem} ${opt === value ? styles.selected : ''}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}>
              {String(opt).padStart(2, '0')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* 時間選択のオプション定義 */
const hourOptions = Array.from({ length: 24 }, (_, i) => i);
const minOptions = [0, 15, 30, 45];

const Notification = () => {
  const navigate = useNavigate();
  // タブの状態管理 (初期値: 通知一覧)
  const [activeTab, setActiveTab] = useState("list");

  const {
    notificationHistory,
    notifications,
    loading,
    suggestedPeriod,
    setSuggestedPeriod,
    fetchNotificationHistory,
    fetchNotifications,
    fetchSuggestedInterval,
    markAsRead,
    deleteHistoryItem,
    saveNotification,
    toggleNotification,
    refillNotification,
    deleteNotification
  } = useNotification();

  const { productList, fetchProductCandidates } = useSuggestion();
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTargetId, setEditTargetId] = useState(null);
  const [originalItem, setOriginalItem] = useState(null);
  
  const [errors, setErrors] = useState({
    title: '',
    notification_period: ''
  });

  const [formData, setFormData] = useState({
    title: '',
    notification_period: '',
    notification_hour: 9,
    notification_min: 0
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 日付フォーマット
  const formatDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "--/-- --:--";
    return dateObj.toLocaleString(undefined, {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  // 初期/タブ切り替え時の読み込み
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchNotifications();
    }
    else {
      fetchNotificationHistory();
    }
  }, [activeTab, fetchNotifications, fetchNotificationHistory]);

  useEffect(() => {
    if (showModal) {
      fetchProductCandidates();
    }
  }, [showModal, fetchProductCandidates]);

  // ハンドラ
  const handleCardClick = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const validateField = (name, value) => {
    let error = "";
    if (name === "title") {
      if (!value) error = ""; // 必須チェックは送信時
      else if (!validateTextLength(value, VALIDATION_LIMITS.TEXT.PRODUCT_NAME)) {
        error = `${VALIDATION_LIMITS.TEXT.PRODUCT_NAME}文字以内で入力してください`;
      }
    }
    if (name === "notification_period") {
      if (value !== "") {
        const days = Number(value);
        if (days < VALIDATION_LIMITS.DAYS.MIN || days > VALIDATION_LIMITS.DAYS.MAX) {
          error = `${VALIDATION_LIMITS.DAYS.MIN}〜${VALIDATION_LIMITS.DAYS.MAX}日の間で入力してください`;
        }
      }
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === "";
  };

  const openCreateModal = () => {
    setEditTargetId(null);
    setOriginalItem(null);
    setSuggestedPeriod(null);
    setFormData({ title: '', notification_period: '', notification_hour: 9, notification_min: 0 });
    setErrors({ title: '', notification_period: '' }); // エラーリセット
    setShowModal(true);
  };

  const openEditModal = (item, e) => {
    e.stopPropagation();
    setEditTargetId(item._id);
    setOriginalItem(item);
    setSuggestedPeriod(null);
    setErrors({ title: '', notification_period: '' }); // エラーリセット

    let initHour = 9;
    let initMin = 0;

    if (item.notification_timestamp) {
      const utcString = item.notification_timestamp.replace(' ', 'T') + 'Z';
      const dateObj = new Date(utcString);

      if (!isNaN(dateObj.getTime())) {
        initHour = dateObj.getHours();
        initMin = dateObj.getMinutes();
      }
    }

    setFormData({
      title: item.product_name || item.title,
      notification_period: String(item.notification_period),
      notification_hour: initHour,
      notification_min: initMin
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowSuggestions(false);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, title: val });
    setShowSuggestions(true);
    validateField('title', val); // 入力時にチェック
  };

  const selectProduct = (product) => {
    setFormData({ ...formData, title: product.product_name });
    setErrors(prev => ({ ...prev, title: '' })); // エラー消去
    setShowSuggestions(false);
    const pid = product.id || product.ID;
    if (pid) fetchSuggestedInterval(pid);
  };

  const handlePeriodChange = (e) => {
    const val = sanitizeNumericInput(e.target.value);
    setFormData({ ...formData, notification_period: val });
    validateField('notification_period', val);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const isTitleValid = validateField('title', formData.title);
    const isPeriodValid = validateField('notification_period', formData.notification_period);

    if (!formData.title) {
        alert("商品名を入力してください");
        return;
    }
    if (!isTitleValid || !isPeriodValid || Object.values(errors).some(e => e)) {
        return; // エラーがあれば中断
    }

    let periodVal = formData.notification_period;
    if (!periodVal && suggestedPeriod) {
      periodVal = suggestedPeriod;
    }
    if (!periodVal) return alert("補充間隔を入力してください");
    
    // 間隔の範囲チェック(手動入力で空だった場合など)
    const periodNum = parseInt(periodVal);
    if (periodNum < VALIDATION_LIMITS.DAYS.MIN || periodNum > VALIDATION_LIMITS.DAYS.MAX) {
      setErrors(prev => ({ ...prev, notification_period: `${VALIDATION_LIMITS.DAYS.MIN}〜${VALIDATION_LIMITS.DAYS.MAX}日の間で入力してください` }));
      return;
    }

    const result = await saveNotification({
      title: formData.title,
      period: periodNum,
      hour: formData.notification_hour,
      min: formData.notification_min,
      editTargetId,
      originalItem
    });

    if (result.success) {
      closeModal();
    }
    else {
      alert(`保存失敗: ${result.message || '入力内容を確認してください'}`);
    }
  };

  const handleToggle = async (item, e) => {
    e.stopPropagation();
    const result = await toggleNotification(item);
    if (!result.success) alert(result.message);
  };

  const handleRefill = async (item, e) => {
    e.stopPropagation();
    if (!window.confirm(`「${item.product_name || item.title}」を補充しましたか？\n次の通知日を更新します。`)) return;
    const result = await refillNotification(item);
    if (!result.success) alert(result.message);
  };

  const handleDelete = async (item, e) => {
    e.stopPropagation();
    if (!window.confirm("この通知設定を削除しますか？")) return;
    const result = await deleteNotification(item);
    if (!result.success) alert(result.message);
  };

  const handleSearchPrice = (name, e) => {
    e.stopPropagation();
    navigate(`/price/${encodeURIComponent(name)}`);
  };

  const handleHistoryClick = (item) => {
    const targetId = item.id || item.ID || item._id;
  
    if (Number(item.is_read) === 0) {
      markAsRead(targetId);
    }
  };

  const filteredProducts = productList.filter(p =>
    p.product_name.toLowerCase().includes(formData.title.toLowerCase())
  );

  // 通知リスト
  const renderNotificationList = () => (
    <div className={styles.listContainer}>
      {notificationHistory.length === 0 && <p className={styles.emptyText}>通知はありません。</p>}
      {notificationHistory.map((item) => {
        const isUnread = Number(item.is_read) === 0;

        return (
          <div
            key={item.id}
            className={`${styles.card} ${isUnread ? styles.historyUnread : styles.historyRead}`}
            onClick={() => handleHistoryClick(item)}>

            <div className={styles.historyHeaderLine}>
              {isUnread && <span className={styles.newBadge}>NEW</span>}

              <span className={`${styles.historyTitle} ${isUnread ? styles.textBold : ''}`}>
                {item.title}
              </span>

              <span className={styles.historyDate}>
                {formatDate(item.created_at)}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUnread) {
                    markAsRead(item.id);
                  }
                  deleteHistoryItem(item.id, e);
                }}
                className={styles.deleteBtnMini}
                title="削除">
                <Trash2 size={16} />
              </button>
            </div>

            <p className={styles.historyMessage}>
              {item.message}
            </p>
          </div>
        );
      })}
    </div>
  );

  // 補充通知設定
  const renderRefillNotificationSettingList = () => (
    <div className={styles.listContainer}>
      {notifications.length === 0 && <p className={styles.emptyText}>設定された通知はありません。</p>}
      {notifications.map((item) => {
        const isEnabled = Number(item.notification_enable) === 1;
        const isExpanded = expandedId === item._id;

        return (
          <div
            key={item._id}
            className={`${styles.card} ${isEnabled ? styles.cardActive : styles.cardInactive}`}
            onClick={() => handleCardClick(item._id)}>
            <div className={styles.cardHeader}>
              <div style={{ flex: 1 }}>
                <h3 className={styles.cardTitle}>
                  {item.product_name || item.title}
                </h3>
                <div className={styles.infoText} style={{ color: isEnabled ? '#444' : '#999' }}>
                  次回: {formatDate(item._scheduledDate)} ({item.notification_period}日/1回)
                </div>
              </div>

              <div className={styles.cardActions}>
                <button
                  onClick={(e) => handleToggle(item, e)}
                  className={`${styles.toggleButton} ${isEnabled ? styles.toggleOn : styles.toggleOff}`}>
                  {isEnabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={(e) => openEditModal(item, e)}
                  className={styles.settingButton}>
                  <Edit2 size={20} color="#888" />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.cardFooter}>
                <div className={styles.footerGrid}>
                  <button
                    onClick={(e) => handleRefill(item, e)}
                    className={styles.actionBtnBlue}>
                    <CheckCircle size={18} /><span>補充</span>
                  </button>
                  <button
                    onClick={(e) => handleSearchPrice(item.product_name, e)}
                    className={styles.actionBtnGray}>
                    <Search size={18} /><span>価格</span>
                  </button>
                  <button
                    onClick={(e) => handleDelete(item, e)}
                    className={styles.actionBtnRed}>
                    <Trash2 size={18} /><span>削除</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Layout
      headerContent={
        <div className={styles.headerWrapper}>
          <h1 className={styles.headerTitle}>通知設定</h1>
          <button onClick={openCreateModal} className={styles.addButton}>
            追加
          </button>
        </div>
      }
      mainContent={
        <div className={styles.mainContainer}>

          {/* タブ切り替えエリア */}
          <div className={styles.tabContainer}>
            <button
              className={`${styles.tabButton} ${activeTab === 'list' ? styles.active : ''}`}
              onClick={() => setActiveTab('list')}>
              通知一覧
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'settings' ? styles.active : ''}`}
              onClick={() => setActiveTab('settings')}>
              補充通知設定
            </button>
          </div>

          {/* ローディング */}
          {loading && <p className={styles.loadingText}>読み込み中...</p>}

          {/* 表示 */}
          {!loading && (
            <div className={styles.viewContainer}>
              {/* 通知一覧 */}
              {activeTab === 'list' && (
                <div className={styles.contentWrapper}>
                  {renderNotificationList()}
                </div>
              )}

              {/* 補充通知設定 */}
              {activeTab === 'settings' && (
                <div className={styles.contentWrapper}>
                  {renderRefillNotificationSettingList()}
                </div>
              )}
            </div>
          )}

          {/* モーダル (Portalを使用してbody直下に描画) */}
          {showModal && createPortal(
            <div className={styles.modalOverlay} onClick={closeModal}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>
                    {editTargetId ? "設定を編集" : "通知を追加"}
                  </h2>
                  <button onClick={closeModal} className={styles.closeButton}>
                    <X size={24} color="#666" />
                  </button>
                </div>

                <form>
                  {/* 商品名 */}
                  <div className={styles.formRow} style={{ alignItems: 'flex-start' }}>
                    <label className={styles.rowLabel} style={{ marginTop: '12px' }}>商品名</label>
                    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      <input
                        type="text"
                        className={`${styles.rowInput} ${errors.title ? styles.inputErrorBorder : ''}`}
                        value={formData.title}
                        onChange={handleTitleChange}
                        onBlur={() => validateField('title', formData.title)}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="商品名を入力" />
                      
                      {errors.title && <p className={styles.errorText}>{errors.title}</p>}

                      {showSuggestions && formData.title && filteredProducts.length > 0 && (
                        <ul className={styles.suggestionList}>
                          {filteredProducts.map(p => (
                            <li key={p.id} onClick={() => selectProduct(p)} className={styles.suggestionItem}>
                              {p.product_name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* 間隔 */}
                  <div className={styles.formRow} style={{ alignItems: 'flex-start' }}>
                    <label className={styles.rowLabel} style={{ marginTop: '12px' }}>間隔(日)</label>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        className={`${styles.rowInput} ${errors.notification_period ? styles.inputErrorBorder : ''}`}
                        value={formData.notification_period}
                        onChange={handlePeriodChange}
                        onBlur={() => validateField('notification_period', formData.notification_period)}
                        placeholder={suggestedPeriod ? `${suggestedPeriod}` : ""} />
                       {errors.notification_period && <p className={styles.errorText}>{errors.notification_period}</p>}
                    </div>
                  </div>

                  {/* 時間 */}
                  <div className={styles.formRow}>
                    <label className={styles.rowLabel}>通知時間</label>
                    <div className={styles.timeSelectContainer}>
                      <TimeDropdown
                        value={formData.notification_hour}
                        options={hourOptions}
                        onChange={(val) => setFormData({ ...formData, notification_hour: val })}
                      />
                      <span style={{ fontWeight: 'bold', color: '#666' }}>:</span>
                      <TimeDropdown
                        value={formData.notification_min}
                        options={minOptions}
                        onChange={(val) => setFormData({ ...formData, notification_min: val })}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '25px' }}>
                    <SubmitButton
                      disabled={Object.values(errors).some(e => e !== "")}
                      text={'保存する'}
                      onClick={handleFormSubmit}
                    />
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}
        </div>
      } />
  );
};

export default Notification;