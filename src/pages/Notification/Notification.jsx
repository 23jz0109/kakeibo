import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Layout from '../../components/common/Layout';
import { Trash2, Plus, Search, CheckCircle, Clock } from 'lucide-react';
import styles from './Notification.module.css';

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

// --- 時間選択コンポーネント (変更なし) ---
function NotificationHourSelect({ selectedHour, setSelectedHour }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const options = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i}:00`
  }));

  const selected = options.find(opt => opt.value === selectedHour);

  const handleSelect = (val) => {
    setSelectedHour(val);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.categorySelectWrapper} ref={wrapperRef}>
      <div
        className={styles.selectedCategory}
        onClick={() => setIsOpen(prev => !prev)}>
        <span className={`${styles.selectedText} ${!selected ? styles.unselected : ""}`}>
          {selected ? selected.label : "通知する時間を選択"}
        </span>
        <span className={styles.arrow}>▼</span>
      </div>

      {isOpen && (
        <div className={styles.dropdownList}>
          {options.map(opt => (
            <div
              key={opt.value}
              className={styles.dropdownItem}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Notification = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- モーダル用 State ---
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', 
    notification_period: '',
    notification_hour: 9 
  });

  const authToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // --- データ取得 (GET) ---
  const fetchNotifications = async (isSilent = false) => {
    if (!authToken) return;
    
    if (!isSilent) {
      setLoading(true);
    }

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
      console.log(data);
      
      const list = data.notification || data.notifications || data || [];

      if (Array.isArray(list)) {
        const normalized = list.map(n => {
          const timestamp = n.notification_timestamp || n.NOTIFICATION_TIMESTAMP;
          
          const scheduledDate = timestamp
             ? new Date(timestamp.replace(" ", "T")) 
             : new Date();
          
          return {
            ...n,
            _id: n.id || n.ID,
            _hour: n.notification_hour || n.NOTIFICATION_HOUR || 9,
            _scheduledDate: scheduledDate
          };
        });

        normalized.sort((a, b) => {
            const dateDiff = new Date(a._scheduledDate) - new Date(b._scheduledDate);
            if (dateDiff !== 0) return dateDiff;
            return (a._hour) - (b._hour);
        });

        setNotifications(normalized);
      }
    } catch (err) {
      console.error(err);
      if (!isSilent) setError("通信エラーが発生しました");
    } finally {
      // isSilentが false の時だけローディングを解除
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // 初回ロード時はローディングを出す (isSilent = false)
    fetchNotifications();
  }, []);

  // --- 新規登録 (POST) ---
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert("商品名を入力してください");

    try {
      const bodyData = {
        product_name: formData.title,
        notification_period: parseInt(formData.notification_period),
        notification_hour: formData.notification_hour,
        notification_min: 0
      };

      const response = await fetch(`${API_BASE_URL}/notification`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(bodyData)
      });

      const resData = await response.json();

      if (response.ok) {
        alert("通知を設定しました");
        setShowModal(false);
        setFormData({ title: '', notification_period: '', notification_hour: 9 });
        // 新規作成時はリストが増えるのでローディングを出しても良いが、好みで true にしてもOK
        fetchNotifications();
      } else {
        alert(`登録失敗: ${resData.message || '入力内容を確認してください'}`);
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました");
    }
  };

  // --- トグル切り替え (POST / toggle) ---
  const handleToggle = async (item) => {
    const targetId = item.id || item.ID || item._id;
    const rawVal = item.notification_enable ?? item.NOTIFICATION_ENABLE;
    const currentVal = Number(rawVal);
    const nextVal = currentVal === 1 ? 0 : 1;

    console.log(`Toggle: ID=${targetId}, ${currentVal} -> ${nextVal}`);

    if (!targetId) {
        console.error("IDが見つかりません", item);
        return;
    }

    // ★UI楽観的更新（クリックした瞬間に見た目を変える）
    const originalList = [...notifications];
    setNotifications(prev => prev.map(n => {
        const nId = n.id || n.ID || n._id;
        if (nId === targetId) {
            return { 
                ...n, 
                notification_enable: nextVal, 
                NOTIFICATION_ENABLE: nextVal 
            };
        }
        return n;
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/notification/toggle`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Notification-ID": String(targetId)
        },
        body: JSON.stringify({
          id: targetId,
          enable: nextVal // 0 or 1
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("Server Error:", errData);
        throw new Error("Server Error");
      }
      
      console.log("通知オンオフ変更成功");
      
      // ★変更点2: ガタつき防止のため裏読み込み (trueを渡す)
      fetchNotifications(true); 

    } 
    catch (err) {
      console.error(err);
      // 失敗したら元に戻す
      setNotifications(originalList);
      alert("設定の更新に失敗しました");
    }
  };

  // --- 補充完了 (PATCH) ---
  const handleRefill = async (item) => {
    const targetId = item.id || item.ID || item._id;
    const name = item.product_name || item.PRODUCT_NAME || item.title;
    const period = item.notification_period || item.NOTIFICATION_PERIOD;

    if(!window.confirm(`${name} を補充しましたか？\n次回通知日が更新されます。`)) return;

    const today = new Date();
    const nextResetDay = new Date(today);
    nextResetDay.setDate(today.getDate() + Number(period));
    const formattedDate = nextResetDay.toISOString().slice(0, 19).replace('T', ' ');

    try {
      const response = await fetch(`${API_BASE_URL}/notification`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Notification-ID": String(targetId)
        },
        body: JSON.stringify({
          notification_enable: 1, 
          notification_period: period,
          reset_day: formattedDate 
        })
      });

      if (response.ok) {
        alert("次回通知日を更新しました！");
        // ★変更点3: ここも裏読み込み (trueを渡す)
        fetchNotifications(true); 
      } else {
        const resData = await response.json();
        alert("更新に失敗しました: " + (resData.message || ""));
      }
    } catch (err) {
      console.error(err);
      alert("通信エラー");
    }
  };

  // --- 削除処理 (DELETE) ---
  const handleDelete = async (item) => {
    const targetId = item.id || item.ID || item._id;
    if(!window.confirm("この通知設定を削除しますか？")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notification`, {
        method: "DELETE", 
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/json",
          "X-Notification-ID": String(targetId) 
        }
      });

      if (response.ok) {
        // 削除時はstateからフィルタリングで消すだけで十分
        setNotifications(prev => prev.filter(n => (n.id || n.ID || n._id) !== targetId));
      } else {
        alert("削除に失敗しました");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- 価格検索ページへ遷移 ---
  const handleSearchPrice = (productName) => {
    navigate(`/price/${encodeURIComponent(productName)}`);
  };

  // --- ユーティリティ: 表示用日付 ---
  const formatDate = (dateObj) => {
    if (!dateObj) return "---";
    return new Date(dateObj).toLocaleString('ja-JP', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Layout
      headerContent={
        <div className={styles.headerContainer}>
          <h1 className={styles.headerTitle}>通知設定</h1>
          <div className={styles.headerButtons}>
            <button onClick={() => setShowModal(true)} className={styles.iconButton}>
              <Plus size={26} color="#3b82f6" />
            </button>
          </div>
        </div>
      }
      mainContent={
        <div className={styles.mainContainer}>
          
          {/* ローディング表示 */}
          {loading && <p className={styles.loadingText}>読み込み中...</p>}
          
          {error && <p className={styles.errorText}>{error}</p>}
          {!loading && !error && notifications.length === 0 && (
            <p className={styles.emptyText}>設定された通知はありません。</p>
          )}

          <div className={styles.listContainer}>
            {notifications.map((item) => {
              const itemId = item._id; 
              const rawEnable = item.notification_enable ?? item.NOTIFICATION_ENABLE;
              const isEnabled = Number(rawEnable) === 1;
              const name = item.product_name || item.PRODUCT_NAME || item.title;
              const period = item.notification_period || item.NOTIFICATION_PERIOD;
              const hour = item.notification_hour || item.NOTIFICATION_HOUR || 9;

              return (
                <div key={itemId} className={`${styles.card} ${isEnabled ? styles.cardActive : styles.cardInactive}`}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{name}</h3>
                    <button
                      onClick={() => handleToggle(item)}
                      className={`${styles.toggleButton} ${isEnabled ? styles.toggleOn : styles.toggleOff}`}
                    >
                      {isEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div className={styles.infoText}>
                      <div><Clock size={14} style={{marginBottom:-2}}/> 周期: {period}日ごと / 通知: {hour}:00</div>
                      <div style={{fontWeight: 'bold', marginTop: '6px', color: isEnabled ? '#333' : '#999'}}>
                          次回: {formatDate(item._scheduledDate)}
                      </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <button 
                      className={styles.refillButton}
                      onClick={() => handleRefill(item)}
                    >
                      <CheckCircle size={16} />
                      補充した
                    </button>

                    <div className={styles.actionButtons}>
                      <button 
                        className={`${styles.cardIcon} ${styles.searchIcon}`} 
                        onClick={() => handleSearchPrice(name)}
                        title="価格を調べる"
                      >
                        <Search size={20} />
                      </button>
                      
                      <button 
                        className={`${styles.cardIcon} ${styles.deleteIcon}`} 
                        onClick={() => handleDelete(item)}
                        title="削除"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --- 新規追加モーダル --- */}
          {showModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h2 className={styles.modalTitle}>通知を追加</h2>
                <form onSubmit={handleCreate}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>商品名</label>
                    <input 
                      type="text" 
                      className={styles.input}
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                      placeholder="例: 牛乳"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>補充間隔 (日数)</label>
                    <input 
                      type="text" 
                      pattern="\d*"
                      className={styles.input}
                      value={formData.notification_period}
                      onChange={(e) => setFormData({...formData, notification_period: e.target.value.replace(/\D/g, "")})}
                      required
                      placeholder="数字を入力 (例: 7)"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>通知する時間帯</label>
                    <NotificationHourSelect 
                      selectedHour={formData.notification_hour}
                      setSelectedHour={(h) => setFormData({...formData, notification_hour: h})}
                    />
                  </div>

                  <div className={styles.modalButtons}>
                    <button type="button" onClick={() => setShowModal(false)} className={styles.cancelButton}>
                      キャンセル
                    </button>
                    <button type="submit" className={styles.submitButton}>
                      保存
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