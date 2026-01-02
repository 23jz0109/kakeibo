import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, List, Bell, User, Plus, ChevronLeft, Trash2 } from "lucide-react";
import { usePreventBack } from "../../hooks/common/usePreventBack";
import styles from "./Layout.module.css";

const Layout = ({ 
  headerContent, 
  mainContent,
  disableDataInputButton = false, 
  redirectPath, 
  state = null, 
  onDeleteButtonClick 
}) => {
  usePreventBack();

  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  // 入力関連ページ
  const isDataInputPage =
    location.pathname === "/input" ||
    location.pathname.startsWith("/input/");

  // 「＋」ボタンを無効化するかどうか
  const isPlusDisabled = disableDataInputButton || isDataInputPage;

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <header className={styles.header}>
        {/* 戻るボタン */}
        {redirectPath && (
          <div className={styles["back-button"]}>
            <ChevronLeft size={24}
              className={styles["icon"]}
              onClick={() => navigate(redirectPath, { state })}
              style={{ cursor: "pointer" }}
            />
          </div>
        )}
        
        {/* ヘッダーの中身（タイトルなど） */}
        {headerContent}
        
        {/* 削除ボタン */}
        {onDeleteButtonClick && (
          <button className={styles["delete-button"]} onClick={() => onDeleteButtonClick()}>
            <Trash2 size={20} />
          </button>
        )}
      </header>

      {/* メインコンテンツ*/}
      <main className={styles.main}>
        {mainContent}
      </main>

      {/* フッターナビゲーション */}
      <footer className={styles.footer}>
        <nav className={styles["footer-nav"]}>
            <Link to="/history" className={`${styles["nav-item"]} ${isActive("/history") ? styles.active : ""}`}>
              <List className={styles["nav-icon"]} size={20} />
              <span className={styles["nav-label"]}>履歴</span>
            </Link>

            <Link to="/budget" className={`${styles["nav-item"]} ${isActive("/budget") ? styles.active : ""}`}>
              <Wallet className={styles["nav-icon"]} size={20} />
              <span className={styles["nav-label"]}>予算</span>
            </Link>

            {/* ＋ボタン */}
            {isPlusDisabled ? (
              <button className={`${styles["navigate-datainput"]} ${styles.disabled}`} disabled>
                <Plus size={16} />
              </button>
            ) : (
              <Link to="/dataInput">
                <button className={styles["navigate-datainput"]}>
                  <Plus size={16} />
                </button>
              </Link>
            )}

            <Link to="/notification" className={`${styles["nav-item"]} ${isActive("/notification") ? styles.active : ""}`}>
              <Bell className={styles["nav-icon"]} size={20} />
              <span className={styles["nav-label"]}>通知</span>
            </Link>

            <Link to="/mypage" className={`${styles["nav-item"]} ${isActive("/mypage") ? styles.active : ""}`}>
              <User className={styles["nav-icon"]} size={24} />
              <span className={styles["nav-label"]}>マイページ</span>
            </Link>
        </nav>
      </footer>
    </div>
  );
};

export default Layout;