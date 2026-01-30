import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, ChartBar, UserPen, Tag } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./MyPage.module.css";
import { useAuthFetch } from "../../hooks/useAuthFetch";

const MyPage = () => {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();

  // 状態管理
  const [email, setEmail] = useState("");
  const [greeting, setGreeting] = useState("こんにちは");

  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

  // 時間判定
  useEffect(() => {
    const hour = new Date().getHours();

    // 0500 - 1100
    if (hour >= 5 && hour < 11) {
      setGreeting("おはようございます");
    }
    // 1101? - 1800
    else if (hour >= 11 && hour < 18) {
      setGreeting("こんにちは");
    }
    // 1801? - 0459
    else {
      setGreeting("こんばんは");
    }
  }, []);

  // ユーザー情報取得 (useAuthFetch版)
  useEffect(() => {
    const fetchUserInfo = async () => {
      // トークンの手動取得コードを削除し、authFetchを使用

      try {
        const response = await authFetch(`${API_BASE_URL}/me`, {
          method: "GET",
        });

        // 401エラー（期限切れ）の場合はフック内で処理されるので終了
        if (!response) return;

        // 成功時
        if (response.ok) {
          const data = await response.json();
          setEmail(data.mail_address || "");
        }
        // 失敗時
        else {
          console.error("ユーザー情報の取得に失敗:", response.status);

          if (response.status === 404 || response.status === 500) {
            sessionStorage.clear();
            localStorage.removeItem("authToken");
            navigate("/"); // ログイン画面へ
          }
        }
      }
      catch (error) {
        console.error("通信エラー", error);
      }
    };

    fetchUserInfo();
  }, [authFetch, navigate]); // 依存配列に追加

  // 遷移先
  const goToUserInfo = () => navigate("/userinfo");
  const goToStatistics = () => navigate("/statistics");
  const goSetting = () => navigate("/setting");
  const goToCategories = () => navigate("/categories");

  // ログアウト
  const handleLogout = () => {
    // ローカルストレージ全削除
    localStorage.clear();

    // セッションストレージ全削除
    sessionStorage.clear();

    // ログインページに戻る
    navigate("/");
  };

  // ページのヘッダー
  const headerContent = (
    <h1 style={{ fontSize: "1.2rem", color: "#333", margin: 0 }}>マイページ</h1>
  );

  // メインコンテンツ
  const mainContent = (
    <div className={styles.mainContainer}>

      {/* 挨拶 */}
      <div className={styles.greetingSection}>
        <p className={styles.greetingText}>
          {greeting}、<br />
          <span className={styles.emailText}>{email ? email : "..."}</span> さん
        </p>
      </div>

      {/* メニューリスト */}
      <ul className={styles.menuList}>
        {/* 登録情報 */}
        <li className={styles.menuItem}>
          <button className={styles.menuButton} onClick={goToUserInfo}>
            <div className={styles.labelContent}>
              <UserPen size={20} />
              <span>登録情報</span>
            </div>
          </button>
        </li>

        {/* カテゴリ設定 */}
        <li className={styles.menuItem}>
          <button className={styles.menuButton} onClick={goToCategories}>
            <div className={styles.labelContent}>
              <Tag size={20} />
              <span>カテゴリ設定</span>
            </div>
          </button>
        </li>

        {/* デバイス設定 */}
        <li className={styles.menuItem}>
          <button className={styles.menuButton} onClick={goSetting}>
            <div className={styles.labelContent}>
              <Settings size={20} />
              <span>デバイス設定</span>
            </div>
          </button>
        </li>

        {/* 統計データ */}
        <li className={styles.menuItem}>
          <button className={styles.menuButton} onClick={goToStatistics}>
            <div className={styles.labelContent}>
              <ChartBar size={20} />
              <span>統計データ</span>
            </div>
          </button>
        </li>

        {/* ログアウト */}
        <li className={styles.menuItem}>
          <button
            className={`${styles.menuButton} ${styles.logoutButton}`}
            onClick={handleLogout}>
            <div className={styles.labelContent}>
              <LogOut size={20} />
              <span>ログアウト</span>
            </div>
          </button>
        </li>
      </ul>
    </div>
  );

  return <Layout headerContent={headerContent} mainContent={mainContent} />;
};

export default MyPage;