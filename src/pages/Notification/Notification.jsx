import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Trash2, Plus, Search, CheckCircle, Settings, X } from 'lucide-react';
import styles from './Notification.module.css';

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

// 時間選択用の汎用プルダウンコンポーネント
const TimeDropdown = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef(null);

  // 外側クリックで閉じる処理
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
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* 0埋め表示 */}
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
              }}
            >
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
  const authToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [productList, setProductList] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedPeriod, setSuggestedPeriod] = useState(null);

  // UTC -> Local
  const getLocalTimeFromUtc = (utcHour, utcMin) => {
    const date = new Date();
    date.setUTCHours(utcHour, utcMin, 0, 0);
    return { hour: date.getHours(), min: date.getMinutes() };
  };

  // Local -> UTC
  const getUtcTimeFromLocal = (localHour, localMin) => {
    const date = new Date();
    date.setHours(localHour, localMin, 0, 0);
    return { hour: date.getUTCHours(), min: date.getMinutes() };
  };

  // 日付フォーマット
  const formatDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "--/-- --:--";
    return dateObj.toLocaleString('ja-JP', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  // 通知一覧
  const fetchNotifications = async (isSilent = false) => {
    if (!authToken) return;
    if (!isSilent) setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/notification`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) throw new Error("データの取得に失敗しました");

      const data = await response.json();
      const list = data.notification || data.notifications || data || [];

      if (Array.isArray(list)) {
        const normalized = list.map(n => {
          const timestamp = n.notification_timestamp || n.NOTIFICATION_TIMESTAMP;
          const scheduledDate = timestamp
            ? new Date(timestamp.replace(" ", "T") + "Z")
            : new Date();

          const dbUtcHour = Number(n.notification_hour || n.NOTIFICATION_HOUR || 0);
          const dbUtcMin = Number(n.notification_min || n.NOTIFICATION_MIN || 0);

          // ローカル時間に変換
          const localTime = getLocalTimeFromUtc(dbUtcHour, dbUtcMin);

          return {
            ...n,
            _id: n.id || n.ID,
            _utcHour: dbUtcHour,
            _utcMin: dbUtcMin,
            _localHour: localTime.hour,
            _localMin: localTime.min,
            _scheduledDate: scheduledDate
          };
        });

        // 日付順 -> 時間順でソート
        normalized.sort((a, b) => {
          const dateDiff = a._scheduledDate - b._scheduledDate;
          if (dateDiff !== 0) return dateDiff;
          return a._localHour - b._localHour;
        });

        setNotifications(normalized);
      }
    }
    catch (err) {
      console.error(err);
      if (!isSilent) alert("データの読み込みに失敗しました");
    }
    finally {
      if (!isSilent) setLoading(false);
    }
  };

  // 商品候補
  const fetchProductCandidates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/product`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.products)) {
          setProductList(data.products);
        }
      }
    }
    catch (err) {
      console.error("候補取得エラー", err);
    }
  };

  // 推奨間隔
  const fetchSuggestedInterval = async (productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notification/diff`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "X-Product-ID": String(productId)
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.can_calculate) {
          setSuggestedPeriod(data.suggested_period);
        }
        else {
          setSuggestedPeriod(null);
        }
      }
    }
    catch (err) {
      console.error(err);
      setSuggestedPeriod(null);
    }
  };

  // 初期化
  useEffect(() => {
    fetchNotifications();
  }, []);

  // モーダルが開いた時に候補リストを更新
  useEffect(() => {
    if (showModal) {
      fetchProductCandidates();
    }
  }, [showModal]);

  // UI操作ハンドラ
  const handleCardClick = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const openCreateModal = () => {
    setEditTargetId(null);
    setOriginalItem(null);
    setSuggestedPeriod(null);
    setFormData({ title: '', notification_period: '', notification_hour: 9, notification_min: 0 }); // デフォルトで0900
    setShowModal(true);
  };

  const openEditModal = (item, e) => {
    e.stopPropagation(); 
    setEditTargetId(item._id);
    setOriginalItem(item);
    setSuggestedPeriod(null);

    //  時間の抽出ロジック
    let initHour = 9;
    let initMin = 0;

    // データの日付元を取得
    const dateSource = item.notification_time || item._scheduledDate;

    if (dateSource) {
      const d = new Date(dateSource);
      if (!isNaN(d.getTime())) {
        initHour = d.getHours();
        initMin = d.getMinutes();
      }
    }

    setFormData({
      title: item.product_name || item.PRODUCT_NAME || item.title,
      notification_period: String(item.notification_period || item.NOTIFICATION_PERIOD),
      // 計算した時・分をセット
      notification_hour: initHour,
      notification_min: initMin
    });
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowSuggestions(false);
  };

  // フォーム入力ハンドラ
  const handleTitleChange = (e) => {
    setFormData({ ...formData, title: e.target.value });
    setShowSuggestions(true);
  };

  const selectProduct = (product) => {
    setFormData({ ...formData, title: product.product_name });
    setShowSuggestions(false);

    // 商品IDがあれば推奨間隔を取得
    const pid = product.id || product.ID;
    if (pid) fetchSuggestedInterval(pid);
  };

  // 保存(新規作成/更新)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert("商品名を入力してください");

    // 期間の決定
    let periodVal = formData.notification_period;
    if (!periodVal && suggestedPeriod) {
      periodVal = suggestedPeriod;
    }
    if (!periodVal) return alert("補充間隔を入力してください");
    const periodNum = parseInt(periodVal);

    // Local -> UTC
    let targetDate;
    if (editTargetId && originalItem && originalItem._scheduledDate) {
      targetDate = new Date(originalItem._scheduledDate);
      if (isNaN(targetDate.getTime())) {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + periodNum);
      }
    }
    else {
      // 新規
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + periodNum);
    }

    targetDate.setHours(Number(formData.notification_hour), Number(formData.notification_min), 0, 0);
    const yyyy = targetDate.getUTCFullYear();
    const mm = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getUTCDate()).padStart(2, "0");
    const hh = String(targetDate.getUTCHours()).padStart(2, "0");
    const mi = String(targetDate.getUTCMinutes()).padStart(2, "0");
    const formattedTimestamp = `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;

    const bodyData = {
      product_name: formData.title,
      notification_period: periodNum,
      notification_hour: Number(hh),
      notification_min: Number(mi),
      notification_timestamp: formattedTimestamp
    };

    try {
      const method = editTargetId ? "PATCH" : "POST";
      const headers = {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      if (editTargetId) {
        headers["X-Notification-ID"] = String(editTargetId);
      }

      const response = await fetch(`${API_BASE_URL}/notification`, {
        method,
        headers,
        body: JSON.stringify(bodyData)
      });

      const resData = await response.json();

      if (response.ok) {
        // alert(editTargetId ? "設定を更新しました" : "通知を追加しました");
        closeModal();
        fetchNotifications(true);
      }
      else {
        alert(`保存失敗: ${resData.message || '入力内容を確認してください'}`);
      }
    }
    catch (err) {
      console.error(err);
      alert("通信エラーが発生しました");
    }
  };

  // ON/OFF切り替え
  const handleToggle = async (item, e) => {
    e.stopPropagation();
    const targetId = item._id;
    const currentVal = Number(item.notification_enable ?? item.NOTIFICATION_ENABLE);
    const nextVal = currentVal === 1 ? 0 : 1;
    const originalList = [...notifications];
    setNotifications(prev => prev.map(n => n._id === targetId ? { ...n, notification_enable: nextVal, NOTIFICATION_ENABLE: nextVal } : n));

    try {
      await fetch(`${API_BASE_URL}/notification/toggle`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
          "X-Notification-ID": String(targetId)
        },
        body: JSON.stringify({ enable: nextVal })
      });
      fetchNotifications(true);
    }
    catch {
      setNotifications(originalList);
      alert("更新に失敗しました");
    }
  };

  // 補充
  const handleRefill = async (item, e) => {
    e.stopPropagation();

    if (!window.confirm(`「${item.product_name || item.title}」を補充しましたか？\n次の通知日を更新します。`)) {
      return;
    }

    try {
      const period = Number(item.notification_period) || 30;

      // 期間分進む
      let targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + period);

      // ローカル時間をセット
      const localHour = item._localHour ?? 9;
      const localMin = item._localMin ?? 0;
      targetDate.setHours(localHour, localMin, 0, 0);

      // UTC文字列を作成
      const yyyy = targetDate.getUTCFullYear();
      const mm = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(targetDate.getUTCDate()).padStart(2, "0");
      const hh = String(targetDate.getUTCHours()).padStart(2, "0");
      const mi = String(targetDate.getUTCMinutes()).padStart(2, "0");
      const formattedTimestamp = `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;

      // 送信データ
      const payload = {
        product_name: item.product_name || item.title,
        notification_period: period,
        notification_hour: Number(hh), // UTC時間を送る
        notification_min: Number(mi),
        notification_timestamp: formattedTimestamp
      };

      const response = await fetch(`${API_BASE_URL}/notification`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Notification-ID": String(item._id)
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // alert("更新しました！");
        fetchNotifications(true);
      }
      else {
        alert("更新に失敗しました");
      }
    }
    catch (err) {
      alert(`エラー: ${err.message}`);
    }
  };

  // 削除
  const handleDelete = async (item, e) => {
    e.stopPropagation();
    const targetId = item._id;
    if (!window.confirm("この通知設定を削除しますか？")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/notification`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "X-Notification-ID": String(targetId)
        }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== targetId));
      }
      else {
        alert("削除に失敗しました");
      }
    }
    catch (err) {
      console.error(err);
      alert("通信エラーが発生しました");
    }
  };

  // 相場価格検索
  const handleSearchPrice = (name, e) => {
    e.stopPropagation();
    navigate(`/price/${encodeURIComponent(name)}`);
  };

  // 商品名候補検索
  const filteredProducts = productList.filter(p =>
    p.product_name.toLowerCase().includes(formData.title.toLowerCase())
  );

  return (
    <Layout
      headerContent={
        <div className={styles.headerContainer}>
          <h1 className={styles.headerTitle}>通知設定</h1>
          <div className={styles.headerButtons}>
            <button onClick={openCreateModal} className={styles.iconButton}>
              <Plus size={26} color="#3b82f6" />
            </button>
          </div>
        </div>
      }
      mainContent={
        <div className={styles.mainContainer}>
          {loading && <p className={styles.loadingText}>読み込み中...</p>}
          {!loading && notifications.length === 0 && <p className={styles.emptyText}>設定された通知はありません。</p>}

          <div className={styles.listContainer}>
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

          {/* モーダル */}
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
                          ))
                          }
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
                      {/* 「時」のプルダウン */}
                      <TimeDropdown
                        value={formData.notification_hour}
                        options={hourOptions}
                        onChange={(val) => setFormData({ ...formData, notification_hour: val })}
                      />
                      <span style={{ fontWeight: 'bold', color: '#666' }}>:</span>
                      {/* 「分」のプルダウン */}
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
      }
    />
  );
};

export default Notification;