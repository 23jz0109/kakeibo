import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Trash2, Search, CheckCircle, Settings, X } from 'lucide-react';
import styles from './Notification.module.css';
import { useNotification } from '../../hooks/notification/useNotification';

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
    notifications,
    loading,
    productList,
    suggestedPeriod,
    setSuggestedPeriod,
    fetchNotifications,
    fetchProductCandidates,
    fetchSuggestedInterval,
    saveNotification,
    toggleNotification,
    refillNotification,
    deleteNotification
  } = useNotification();

  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTargetId, setEditTargetId] = useState(null);
  const [originalItem, setOriginalItem] = useState(null);
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
    return dateObj.toLocaleString('ja-JP', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (showModal) {
      fetchProductCandidates();
    }
  }, [showModal, fetchProductCandidates]);

  // ハンドラ
  const handleCardClick = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const openCreateModal = () => {
    setEditTargetId(null);
    setOriginalItem(null);
    setSuggestedPeriod(null);
    setFormData({ title: '', notification_period: '', notification_hour: 9, notification_min: 0 });
    setShowModal(true);
  };

  const openEditModal = (item, e) => {
    e.stopPropagation();
    setEditTargetId(item._id);
    setOriginalItem(item);
    setSuggestedPeriod(null);
    setFormData({
      title: item.product_name || item.title,
      notification_period: String(item.notification_period),
      notification_hour: item._localHour ?? 9,
      notification_min: item._localMin ?? 0
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowSuggestions(false);
  };

  const handleTitleChange = (e) => {
    setFormData({ ...formData, title: e.target.value });
    setShowSuggestions(true);
  };

  const selectProduct = (product) => {
    setFormData({ ...formData, title: product.product_name });
    setShowSuggestions(false);
    const pid = product.id || product.ID;
    if (pid) fetchSuggestedInterval(pid);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert("商品名を入力してください");

    let periodVal = formData.notification_period;
    if (!periodVal && suggestedPeriod) {
      periodVal = suggestedPeriod;
    }
    if (!periodVal) return alert("補充間隔を入力してください");
    const periodNum = parseInt(periodVal);

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

  const filteredProducts = productList.filter(p =>
    p.product_name.toLowerCase().includes(formData.title.toLowerCase())
  );

  // 通知設定
  const renderNotificationList = () => (
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
                  <Settings size={20} color="#888" />
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
                  {/* ここに通知一覧データが入る予定（現在は空白） */}
                </div>
              )}

              {/* 補充通知設定 */}
              {activeTab === 'settings' && (
                <div className={styles.contentWrapper}>
                   {renderNotificationList()}
                </div>
              )}
            </div>
          )}

          {/* モーダル (タブに関係なく表示) */}
          {showModal && (
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

                <form onSubmit={handleFormSubmit}>
                  {/* 商品名 */}
                  <div className={styles.formRow}>
                    <label className={styles.rowLabel}>商品名</label>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        className={styles.rowInput}
                        value={formData.title}
                        onChange={handleTitleChange}
                        onFocus={() => setShowSuggestions(true)}
                        required
                        placeholder="商品名を入力" />
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
                  <div className={styles.formRow}>
                    <label className={styles.rowLabel}>間隔(日)</label>
                    <input
                      type="text"
                      pattern="\d*"
                      className={styles.rowInput}
                      value={formData.notification_period}
                      onChange={(e) => setFormData({ ...formData, notification_period: e.target.value.replace(/\D/g, "") })}
                      placeholder={suggestedPeriod ? `${suggestedPeriod}` : ""} />
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
                    <button type="submit" className={styles.submitButton}>
                      保存する
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      }/>
    );
  };

export default Notification;
