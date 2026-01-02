import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Smartphone, Trash2 } from "lucide-react";
import Layout from "../../components/common/Layout";
import TabButton from "../../components/common/TabButton";
import styles from "./Setting.module.css";
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
  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";
  
  const authToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // タブ設定
  const tabs = [
    { 
      id: "mypage", 
      label: "マイページ",
      icon: <ChevronLeft size={18} /> 
    },
    { 
      id: "setting", 
      label: "通知設定" 
    },
  ];

  const handleTabChange = (id) => {
    if (id === "mypage") navigate("/mypage");
  };

  // ヘッダー
  const headerContent = (
    <TabButton tabs={tabs} activeTab="setting" onTabChange={handleTabChange} />
  );

  // デバイス判定
  const getDeviceName = () => {
    const ua = navigator.userAgent;
    // OS
    let os = "Unknown OS";
    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "Mac";
    if (ua.indexOf("Linux") !== -1) os = "Linux";
    if (ua.indexOf("Android") !== -1) os = "Android";
    if (ua.indexOf("like Mac") !== -1) os = "iOS";
    
    // ブラウザ
    let browser = "Unknown Browser";
    if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
    if (ua.indexOf("Firefox") !== -1) browser = "Firefox";

    // OS BROWSER
    return `${os} (${browser})`;
  };

  // 端末一覧取得
  const fetchDevices = async () => {
    if (!authToken) return;

    // ローディングを挟む
    setIsLoading(true);

    // DBから取得
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        }
      });

      // 取得成功
      if (res.ok) {
        const data = await res.json();
        // 取得したデータをそのままセット
        setDevices(data.device || []);
        // デバッグ用：取得データのキーを確認（F12コンソールに出ます）
        console.log("Fetched Devices:", data.device);
      } 
      
      // 取得失敗
      else {
        console.error("端末一覧取得失敗", res.status);
      }
    }
    // DBエラー
    catch (err) {
      console.error("通信エラー", err);
      setErrorMessage("データの取得に失敗しました");
    }
    finally {
      setIsLoading(false);
    }
  };

  // すぐデバイス一覧を取得
  useEffect(() => {
    fetchDevices();
  }, []);

  // 端末登録
  const registerCurrentDevice = async () => {
    if (!authToken) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
        // ドメイン必須(ローカル無効→FCMの規則)
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
        const res = await fetch(`${API_BASE_URL}/settings`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fcm_token: token,
                device_info: deviceInfo
            })
        });

        const data = await res.json();

        // 登録成功
        if (res.ok) {
            setSuccessMessage("この端末を登録しました");
            fetchDevices(); 
        }
        // 登録失敗
        else {
            // 重複
            if (data.message && data.message.includes("already")) {
                setSuccessMessage("この端末は既に登録されています");
            }
            // その他の失敗
            else {
                setErrorMessage(data.message || "登録に失敗しました");
            }
        }
    }
    catch (err) {
        console.error(err);
        setErrorMessage(err.message || "通信エラーが発生しました");
    }
    finally {
        setIsLoading(false);
    }
  };

  // ON/OFF切り替え(デバイス)
  const toggleNotification = async (device) => {
    // IDの取得
    const targetId = device.ID || device.id;
    if (!targetId) {
        console.error("Device IDが見つかりません", device);
        setErrorMessage("端末IDの取得に失敗しました");
        return;
    }

    // 現在の状態値を取得
    const rawVal = device.DEVICE_NOTIFICATION_ENABLE ?? device.device_notification_enable;
    const currentVal = Number(rawVal);
    const nextVal = currentVal === 1 ? 0 : 1;

    console.log(`Toggle: ID=${targetId}, ${currentVal} -> ${nextVal}`);

    // UI更新
    const originalDevices = [...devices];
    setDevices(prev => prev.map(d => {
        // 値を反転
        const dId = d.ID || d.id;
        if (dId === targetId) {
            return { ...d, DEVICE_NOTIFICATION_ENABLE: nextVal, device_notification_enable: nextVal };
        }
        return d;
    }));

    // DBに更新
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: "PATCH", 
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
          "X-Device-ID": String(targetId)
        },
        body: JSON.stringify({
          enable: nextVal
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error("Server Error:", errData);
        throw new Error(errData.message || "更新失敗");
      }
      
      console.log("通知設定を更新しました");

    }
    // 失敗したらUIを元に戻す
    catch (err) {
      console.error(err);
      setErrorMessage("設定の更新に失敗しました");
      setDevices(originalDevices);
    }
  };

  // 端末削除
  const deleteDevice = async (deviceId) => {
    if (!window.confirm("この端末の登録を解除しますか？")) return;

    // DB更新
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "X-Device-ID": String(deviceId)
        }
      });

      // 削除成功
      if (res.ok) {
        setDevices(prev => prev.filter(d => (d.ID || d.id) !== deviceId));
        setSuccessMessage("登録を解除しました");
      }
      // 削除失敗
      else {
        const data = await res.json();
        setErrorMessage(data.message || "削除に失敗しました");
      }
    }
    // DBエラー
    catch (err) {
      console.error(err);
      setErrorMessage("通信エラーが発生しました");
    }
  };

  // 画面生成
  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div className={styles.mainContainer}>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>
              <Smartphone size={20} style={{ verticalAlign: "middle", marginRight: "8px" }}/>
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
                <p style={{textAlign:"center", color:"#999", padding:"20px"}}>登録された端末はありません</p>
            ) : (
              <table className={styles.deviceTable}>
                <thead>
                    <tr>
                    <th>端末情報</th>
                    <th style={{width: "60px", textAlign:"center"}}>通知</th>
                    <th style={{width: "50px", textAlign:"center"}}>削除</th>
                    </tr>
                </thead>
                <tbody>
                    {devices.map((device, index) => {
                        // データ取得時のカラム名揺れに対応
                        const deviceId = device.ID || device.id;
                        const deviceInfo = device.DEVICE_INFO || device.device_info;
                        const rawEnable = device.DEVICE_NOTIFICATION_ENABLE ?? device.device_notification_enable;
                        const isEnabled = Number(rawEnable) === 1;

                        return (
                            <tr key={deviceId || index}>
                            <td>
                                <div className={styles.deviceName}>{deviceInfo}</div>
                            </td>
                            <td style={{textAlign:"center"}}>
                                <label className={styles.switch}>
                                <input 
                                    type="checkbox" 
                                    checked={isEnabled} 
                                    onChange={() => toggleNotification(device)}
                                />
                                <span className={styles.slider}></span>
                                </label>
                            </td>
                            <td style={{textAlign:"center"}}>
                                <button 
                                    className={styles.deleteBtn} 
                                    onClick={() => deleteDevice(deviceId)}
                                >
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