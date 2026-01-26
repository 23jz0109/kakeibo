import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Smartphone, Trash2 } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./Setting.module.css";
import { useAuthFetch } from "../../hooks/useAuthFetch";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyDtjnrrDg2MKCL1pWxXJ7_m3x14N8OCbts",
  authDomain: "pushnotification-4ebe3.firebaseapp.com",
  projectId: "pushnotification-4ebe3",
  storageBucket: "pushnotification-4ebe3.firebasestorage.app",
  messagingSenderId: "843469470605",
  appId: "1:843469470605:web:94356b50ab8c7718021bc4"
};

const app = initializeApp(firebaseConfig);

//通知一覧
function Setting() {
  const navigate = useNavigate();
  // フックを使用
  const authFetch = useAuthFetch();

  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // デバイス判定
  const getDeviceName = () => {
    const ua = navigator.userAgent;
    let os = "Unknown OS";
    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "Mac";
    if (ua.indexOf("Linux") !== -1) os = "Linux";
    if (ua.indexOf("Android") !== -1) os = "Android";
    if (ua.indexOf("like Mac") !== -1) os = "iOS";

    let browser = "Unknown Browser";
    if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
    if (ua.indexOf("Firefox") !== -1) browser = "Firefox";

    return `${os} (${browser})`;
  };

  // 強制ログアウト処理 (共通化)
  const handleForceLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("authToken");
    navigate("/");
  };

  // 端末一覧取得
  const fetchDevices = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);

    try {
      // authFetchに変更 (headers不要)
      const res = await authFetch(`${API_BASE_URL}/settings`, {
        method: "GET",
      });

      // 401ならフック内で処理済みなので終了
      if (!res) return;

      if (res.ok) {
        const data = await res.json();
        setDevices(data.device || []);
        console.log("Fetched Devices:", data.device);
      } else {
        console.error("端末一覧取得失敗", res.status);
        // ユーザー削除済み(404)なら強制ログアウト
        if (res.status === 404) {
          handleForceLogout();
        }
      }
    } catch (err) {
      console.error("通信エラー", err);
      setErrorMessage("データの取得に失敗しました");
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  // 初回取得
  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // authFetchは依存配列に入れなくてもOK（入れるならuseCallbackが必要）

  // 端末登録
  const registerCurrentDevice = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      // Service Worker登録 (Firebase周りはそのまま)
      const registration = await navigator.serviceWorker.register("/combine_test/firebase-messaging-sw.js", {
        scope: "/combine_test/"
      }).catch(err => { throw new Error("Service Worker登録失敗: " + err.message); });

      const messaging = getMessaging(app);

      const token = await getToken(messaging, {
        vapidKey: "BH3VSel6Cdam2EREeJ9iyYLoJcOYpqGHd7JXULxSCmfsULrVMaedjv81VF7h53RhJmfcHCsq-dSoJVjHB58lxjQ",
        serviceWorkerRegistration: registration
      });

      if (!token) throw new Error("トークン生成失敗");

      const deviceInfo = getDeviceName();

      // authFetchに変更
      const res = await authFetch(`${API_BASE_URL}/settings`, {
        method: "POST",
        body: JSON.stringify({
          fcm_token: token,
          device_info: deviceInfo
        })
      });

      if (!res) return; // 401 Guard

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("この端末を登録しました");
        fetchDevices(true);
      } else {
        if (res.status === 404) {
           handleForceLogout();
           return;
        }

        if (data.message && data.message.includes("already")) {
          setSuccessMessage("この端末は既に登録されています");
        } else {
          setErrorMessage(data.message || "登録に失敗しました");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // ON/OFF更新 
  const handleToggle = async (item, e) => {
    e.stopPropagation();

    const targetId = item._id || item.id || item.ID;
    const fcmToken = item.fcm_token || item.FCM_TOKEN;

    if (!fcmToken) {
      alert("このデバイスの通知用トークンが取得できていないため、設定を変更できません。");
      return;
    }

    const currentVal = Number(item.DEVICE_NOTIFICATION_ENABLE ?? item.device_notification_enable);
    const nextVal = currentVal === 1 ? 0 : 1;

    // UI更新
    const originalList = [...devices];
    setDevices(prev => prev.map(d => {
      const dId = d._id || d.id || d.ID;
      return dId === targetId
        ? { ...d, DEVICE_NOTIFICATION_ENABLE: nextVal, device_notification_enable: nextVal }
        : d;
    }));

    try {
      // ★authFetchに変更
      const response = await authFetch(`${API_BASE_URL}/settings`, {
        method: "PATCH",
        headers: {
          "X-Device-ID": String(targetId)
        },
        body: JSON.stringify({
          enable: nextVal,
          fcm_token: fcmToken
        })
      });

      if (!response) return; // 401 Guard

      if (!response.ok) {
        if (response.status === 404) {
           handleForceLogout();
           return;
        }
        
        // エラー時は元に戻す
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log("通知設定を更新しました");

    } catch (err) {
      console.error("Fetch Error:", err);
      setDevices(originalList); // エラー時に元の状態に戻す
      setErrorMessage("設定の更新に失敗しました。");
    }
  };

  // 端末削除
  const deleteDevice = async (deviceId) => {
    if (!window.confirm("この端末の登録を解除しますか？")) return;

    try {
      const res = await authFetch(`${API_BASE_URL}/settings`, {
        method: "DELETE",
        headers: {
          "X-Device-ID": String(deviceId)
        }
      });

      if (!res) return; // 401 Guard

      if (res.ok) {
        setDevices(prev => prev.filter(d => (d.ID || d.id) !== deviceId));
        setSuccessMessage("登録を解除しました");
      } else {
        if (res.status === 404) {
           handleForceLogout();
           return;
        }
        const data = await res.json();
        setErrorMessage(data.message || "削除に失敗しました");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("通信エラーが発生しました");
    }
  };

  // ヘッダー
  const headerContent = (
    <div className={styles.headerContainer}>
      <button className={styles.backButton} onClick={() => navigate("/mypage")}>
        <ChevronLeft size={24} />
      </button>
      <h1 className={styles.headerTitle}>デバイス設定</h1>
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div className={styles.mainContainer}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>
              <Smartphone size={20} style={{ verticalAlign: "middle", marginRight: "8px" }} />
              プッシュ通知設定
            </p>
            <p className={styles.description}>
              この端末で通知を受け取るには、下のボタンを押して登録してください。
            </p>

            <button
              className={styles.primaryBtn}
              onClick={registerCurrentDevice}
              disabled={isLoading}>
              <Bell size={18} />
              {isLoading ? "処理中..." : "この端末を通知先に登録"}
            </button>

            {errorMessage && <p className={styles.error}>{errorMessage}</p>}
            {successMessage && <p className={styles.success}>{successMessage}</p>}
          </div>

          <div className={styles.card}>
            <p className={styles.sectionTitle}>登録済み端末一覧</p>

            {devices.length === 0 ? (
              <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>登録された端末はありません</p>
            ) : (
              <table className={styles.deviceTable}>
                <thead>
                  <tr>
                    <th>端末情報</th>
                    <th style={{ width: "60px", textAlign: "center" }}>通知</th>
                    <th style={{ width: "50px", textAlign: "center" }}>削除</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device, index) => {
                    const deviceId = device.ID || device.id;
                    const deviceInfo = device.DEVICE_INFO || device.device_info;
                    const rawEnable = device.DEVICE_NOTIFICATION_ENABLE ?? device.device_notification_enable;
                    const isEnabled = Number(rawEnable) === 1;

                    return (
                      <tr key={deviceId || index}>
                        <td>
                          <div className={styles.deviceName}>{deviceInfo}</div>
                        </td>
                        <td style={{ textAlign: "center" }} className={styles.cardActions}>
                          <button
                            onClick={(e) => handleToggle(device, e)}
                            className={`${styles.toggleBtn} ${isEnabled ? styles.toggleOn : styles.toggleOff}`}
                          >
                            {isEnabled ? "ON" : "OFF"}
                          </button>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => deleteDevice(deviceId)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      }
    />
  );
}

export default Setting;