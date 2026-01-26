import { useState, useCallback } from 'react';
import { useAuthFetch } from '../useAuthFetch'; 

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";
let unread = 0;

export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [unreadCount, setUnreadCount] = useState(unread);
  const [loading, setLoading] = useState(true);
  const [productList, setProductList] = useState([]);
  const [suggestedPeriod, setSuggestedPeriod] = useState(null);

  const authFetch = useAuthFetch(); // フックを使用

  // UTC -> Local 変換ヘルパー
  const getLocalTimeFromUtc = (utcHour, utcMin) => {
    const date = new Date();
    date.setUTCHours(utcHour, utcMin, 0, 0);
    return { hour: date.getHours(), min: date.getMinutes() };
  };

  // 補充通知設定一覧取得
  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);

    try {
      // authFetch を使用 (Authorizationヘッダーは自動付与)
      const response = await authFetch(`${API_BASE_URL}/notification`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      // authFetch は 401/404 等で null を返す場合がある
      if (!response) {
        if (!isSilent) setLoading(false);
        return;
      }

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
          // console.log("UTC time:" + dbUtcHour + ":" + dbUtcMin);

          // ローカル時間に変換
          const localTime = getLocalTimeFromUtc(dbUtcHour, dbUtcMin);
          // console.log("JST time:" + localTime.hour + ":" + localTime.min)

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

        // IDの降順（大きい順）
        normalized.sort((a, b) => {
          return Number(b._id) - Number(a._id);
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
  }, [authFetch]);

  // 商品候補リスト取得
  const fetchProductCandidates = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/product`, {
        method: "GET"
      });
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.products)) {
          setProductList(data.products);
        }
      }
    }
    catch (err) {
      console.error("候補取得エラー", err);
    }
  }, [authFetch]);

  // 推奨間隔取得
  const fetchSuggestedInterval = useCallback(async (productId) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/notification/diff`, {
        method: "GET",
        headers: {
          "X-Product-ID": String(productId)
        }
      });

      if (response && response.ok) {
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
  }, [authFetch]);

  // 補充通知の追加・更新
  const saveNotification = async ({ title, period, hour, min, editTargetId, originalItem }) => {
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
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      if (editTargetId) {
        headers["X-Notification-ID"] = String(editTargetId);
      }

      const response = await authFetch(`${API_BASE_URL}/notification`, {
        method,
        headers,
        body: JSON.stringify(bodyData)
      });

      if (!response) return { success: false, message: "通信エラー" }; // authFetch失敗時

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
    const targetId = item._id;
    const currentVal = Number(item.notification_enable ?? item.NOTIFICATION_ENABLE);
    const nextVal = currentVal === 1 ? 0 : 1;
    const originalList = [...notifications];
    
    // 楽観的UI更新
    setNotifications(prev => prev.map(n => n._id === targetId ? { ...n, notification_enable: nextVal, NOTIFICATION_ENABLE: nextVal } : n));

    try {
      const response = await authFetch(`${API_BASE_URL}/notification/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Notification-ID": String(targetId)
        },
        body: JSON.stringify({ enable: nextVal })
      });

      if (!response || !response.ok) throw new Error("Failed");

      await fetchNotifications(true);
      return { success: true };
    }
    catch {
      setNotifications(originalList); // ロールバック
      return { success: false, message: "更新に失敗しました" };
    }
  };

  // 補充
  const refillNotification = async (item) => {
    const period = Number(item.notification_period);
    
    // 設定時間取得
    let targetLocalHour = item._localHour;
    let targetLocalMin = item._localMin;

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
      const response = await authFetch(`${API_BASE_URL}/notification`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Notification-ID": String(item._id)
        },
        body: JSON.stringify(payload)
      });

      if (response && response.ok) {
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
    const targetId = item._id;

    try {
      const res = await authFetch(`${API_BASE_URL}/notification`, {
        method: "DELETE",
        headers: {
          "X-Notification-ID": String(targetId)
        }
      });

      if (res && res.ok) {
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

  // 通知一覧 (履歴)
  const fetchNotificationHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/notification/list`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (response && response.ok) {
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
  }, [authFetch]);

  // 通知を既読にする
  const markAsRead = async (notificationId) => {
    // UI更新
    const targetIdStr = String(notificationId);

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
    // 未読カウントを引く
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      // APIへ送信
      const response = await authFetch(`${API_BASE_URL}/notification/list`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Notification-ID": targetIdStr
        }
      });

      if (response) {
        //  サーバーの更新が終わってから合図を出す
        window.dispatchEvent(new Event("notificationUpdated"));
        // await fetchNotificationHistory(true); // 必要なら再取得
      }

    } catch (err) {
      console.error("既読エラー", err);
    }
  };

  // 通知履歴からの削除
  const deleteHistoryItem = async (notificationId) => {
    setNotificationHistory(prev => prev.filter(n => n.id !== notificationId));

    try {
      const response = await authFetch(`${API_BASE_URL}/notification/list`, {
        method: "POST",
        headers: {
          "X-Notification-ID": String(notificationId)
        }
      });

      if (!response || !response.ok) {
        console.error("削除失敗");
        // 失敗したらリロード等の処理が必要かも
      }
    }
    catch (err) {
      console.error("削除エラー", err);
    }
  };

  // 未読件数取得
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/notification/count`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (response && response.ok) {
        const data = await response.json();
        // キャッシュにセットする
        unread = data.count;
        setUnreadCount(unread);
      }
    }
    catch (err) {
      console.error("カウント取得エラー", err);
    }
  }, [authFetch]);

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