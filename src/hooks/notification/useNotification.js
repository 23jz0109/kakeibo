import { useState, useCallback } from 'react';

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";
let unread = 0;

export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [unreadCount, setUnreadCount] = useState(unread);
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState([]);
  const [suggestedPeriod, setSuggestedPeriod] = useState(null);

  const getAuthToken = () => localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // UTC -> Local 変換ヘルパー
  const getLocalTimeFromUtc = (utcHour, utcMin) => {
    const date = new Date();
    date.setUTCHours(utcHour, utcMin, 0, 0);
    return { hour: date.getHours(), min: date.getMinutes() };
  };

  // 補充通知設定一覧取得
  const fetchNotifications = useCallback(async (isSilent = false) => {
    const authToken = getAuthToken();
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

          let dbUtcHour = scheduledDate.getUTCHours()
          let dbUtcMin = scheduledDate.getUTCMinutes();
          console.log("UTC time:" + dbUtcHour + ":" + dbUtcMin);

          // ローカル時間に変換
          const localTime = getLocalTimeFromUtc(dbUtcHour, dbUtcMin);
          console.log("JST time:" + localTime.hour + ":" + localTime.min)

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
  }, []);

  // 商品候補リスト取得
  const fetchProductCandidates = useCallback(async () => {
    const authToken = getAuthToken();
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
  }, []);

  // 推奨間隔取得
  const fetchSuggestedInterval = useCallback(async (productId) => {
    const authToken = getAuthToken();
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
  }, []);

  // 補充通知の追加・更新
  const saveNotification = async ({ title, period, hour, min, editTargetId, originalItem }) => {
    const authToken = getAuthToken();

    // 日付計算ロジック
    let targetDate;
    if (editTargetId && originalItem && originalItem._scheduledDate) {
      targetDate = new Date(originalItem._scheduledDate);
      if (isNaN(targetDate.getTime())) {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + period);
      }
    }
    else {
      // 新規
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + period);
    }

    targetDate.setHours(Number(hour), Number(min), 0, 0);

    // UTC文字列作成
    const yyyy = targetDate.getUTCFullYear();
    const mm = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getUTCDate()).padStart(2, "0");
    const hh = String(targetDate.getUTCHours()).padStart(2, "0");
    const mi = String(targetDate.getUTCMinutes()).padStart(2, "0");
    const formattedTimestamp = `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;

    const bodyData = {
      product_name: title,
      notification_period: period,
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
        await fetchNotifications(true); // リスト更新
        return { success: true };
      }
      else {
        return { success: false, message: resData.message };
      }
    }
    catch (err) {
      console.error(err);
      return { success: false, message: "通信エラーが発生しました" };
    }
  };

  // 補充通知のON/OFF切り替え
  const toggleNotification = async (item) => {
    const authToken = getAuthToken();
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
      await fetchNotifications(true);
      return { success: true };
    }
    catch {
      setNotifications(originalList);
      return { success: false, message: "更新に失敗しました" };
    }
  };

  // 補充
  const refillNotification = async (item) => {
    const authToken = getAuthToken();
    const period = Number(item.notification_period);
    console.log("間隔:" + period);

    // 設定時間取得
    let targetLocalHour = item._localHour;
    let targetLocalMin = item._localMin;
    console.log("setting time:" + targetLocalHour + ":" + targetLocalMin)

    if (targetLocalHour === undefined) {
      const utcHour = item._utcHour ?? Number(item.notification_hour) ?? 0;
      const utcMin = item._utcMin ?? Number(item.notification_min) ?? 0;
      const tempDate = new Date();
      tempDate.setUTCHours(utcHour, utcMin, 0, 0);
      targetLocalHour = tempDate.getHours();
      targetLocalMin = tempDate.getMinutes();
    }

    // 期間分の日付を進めます
    let targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + period);

    // 新たな日時をセット
    targetDate.setHours(targetLocalHour, targetLocalMin, 0, 0);

    // UTC文字列を作成
    const yyyy = targetDate.getUTCFullYear();
    const mm = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getUTCDate()).padStart(2, "0");
    const hh = String(targetDate.getUTCHours()).padStart(2, "0");
    const mi = String(targetDate.getUTCMinutes()).padStart(2, "0");
    const formattedTimestamp = `${yyyy}-${mm}-${dd} ${hh}:${mi}:00`;

    const payload = {
      product_name: item.product_name || item.title,
      notification_period: period,
      notification_hour: Number(hh),
      notification_min: Number(mi),
      notification_timestamp: formattedTimestamp
    };

    try {
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
        await fetchNotifications(true);
        return { success: true };
      }
      else {
        return { success: false, message: "更新に失敗しました" };
      }
    }
    catch (err) {
      return { success: false, message: `エラー: ${err.message}` };
    }
  };

  // 補充通知削除
  const deleteNotification = async (item) => {
    const authToken = getAuthToken();
    const targetId = item._id;

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
        return { success: true };
      }
      else {
        return { success: false, message: "削除に失敗しました" };
      }
    }
    catch (err) {
      console.error(err);
      return { success: false, message: "通信エラーが発生しました" };
    }
  };

  // 通知一覧
  const fetchNotificationHistory = useCallback(async (isSilent = false) => {
    const authToken = getAuthToken();
    if (!authToken) return;
    if (!isSilent) setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/notification/list`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rawList = data.notifications || [];

        const formattedList = rawList.map(item => {
          let dateStr = item.created_at;

          if (typeof dateStr === 'string' && !dateStr.endsWith('Z')) {
            dateStr = dateStr.replace(' ', 'T') + 'Z';
          }

          return {
            ...item,
            created_at: new Date(dateStr)
          };
        });

        setNotificationHistory(formattedList);
      }
    }
    catch (err) {
      console.error("履歴取得エラー", err);
      if (!isSilent) alert("データの読み込みに失敗しました");
    }
    finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // 通知を既読にする
  const markAsRead = async (notificationId) => {
    const authToken = getAuthToken();
    const targetIdStr = String(notificationId);

    console.log(`既読処理開始: Target ID = ${targetIdStr}`);

    // 現在の画面（通知一覧）はすぐに書き換える
    setNotificationHistory(prev => 
      prev.map(n => {
        const currentId = String(n.id || n.ID || n._id);
        if (currentId === targetIdStr) {
          return { ...n, is_read: 1, IS_READ: 1, notification_read: 1 }; 
        }
        return n;
      })
    );
    setUnreadCount(prev => Math.max(0, prev - 1));


    try {
      // APIへ送信
      await fetch(`${API_BASE_URL}/notification/list`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
          "X-Notification-ID": targetIdStr
        }
      });

      //  サーバーの更新が終わってから合図を出す
      window.dispatchEvent(new Event("notificationUpdated"));

      await fetchNotificationHistory(true); 

    } catch (err) {
      console.error("既読エラー", err);
    }
  };

  // 通知履歴からの削除
  const deleteHistoryItem = async (notificationId) => {
    const authToken = getAuthToken();
    setNotificationHistory(prev => prev.filter(n => n.id !== notificationId));

    try {
      const response = await fetch(`${API_BASE_URL}/notification/list`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "X-Notification-ID": String(notificationId)
        }
      });

      if (!response.ok) {
        console.error("削除失敗");
        // 失敗したらリロード
      }
    }
    catch (err) {
      console.error("削除エラー", err);
    }
  };

  // 未読件数取得
  const fetchUnreadCount = useCallback(async () => {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notification/count`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();

        // キャッシュにセットする
        unread = data.count;
        setUnreadCount(unread);
      }
    }
    catch (err) {
      console.error("カウント取得エラー", err);
    }
  }, []);

  return {
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
    deleteNotification,
    notificationHistory,
    unreadCount,
    fetchNotificationHistory,
    markAsRead,
    deleteHistoryItem,
    fetchUnreadCount
  };
};