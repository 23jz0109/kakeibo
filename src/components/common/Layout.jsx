import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, List, Bell, User, Plus, ChevronLeft, Trash2, X, Camera, Edit3, ArrowDownCircle } from "lucide-react";
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
  const [isPlusOpen, setIsPlusOpen] = useState(false);  // 「＋」ボタンの開閉状態

  const isActive = (path) => location.pathname === path;

  // 入力関連ページ
  const isDataInputPage =
    location.pathname === "/input" ||
    location.pathname.startsWith("/input/");

  // 「＋」ボタンを無効化するかどうか
  const isPlusDisabled = disableDataInputButton || isDataInputPage;

  // ナビ以外タップで閉じる
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (plusRef.current && !plusRef.current.contains(e.target)) {
        setIsPlusOpen(false);
      }
    };

    if (isPlusOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPlusOpen]);

  // 画面生成(枠)
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
              style={{ cursor: "pointer" }}/>
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

      {/* 展開部分 */}
      {isPlusOpen && (
        <div className={styles.expandBar} onClick={() => setIsPlusOpen(false)}>
          <div className={styles.expandInner} onClick={(e) => e.stopPropagation()} >
            <Link to="/input/income" className={`${styles.expandItem} ${styles.income}`}>
              <ArrowDownCircle size={20} />
              <span>収入</span>
            </Link>
            <Link to="/input/ocr" className={`${styles.expandItem} ${styles.expense}`}>
              <Camera size={20} />
              <span>OCR</span>
            </Link>
            <Link to="/input/manual" className={`${styles.expandItem} ${styles.expense}`}>
              <Edit3 size={20} />
              <span>支出</span>
            </Link>
          </div>
        </div>
      )}

      {/* フッターナビゲーション */}
      <footer className={styles.footer}>
        <nav className={styles["footer-nav"]}>
            {/* 履歴 */}
            <Link to="/history" className={`${styles["nav-item"]} ${isActive("/history") ? styles.active : ""}`}>
              <List className={styles["nav-icon"]} size={20} />
              <span className={styles["nav-label"]}>履歴</span>
            </Link>

            {/* 予算 */}
            <Link to="/budget" className={`${styles["nav-item"]} ${isActive("/budget") ? styles.active : ""}`}>
              <Wallet className={styles["nav-icon"]} size={20} />
              <span className={styles["nav-label"]}>予算</span>
            </Link>

            {/* ＋ボタン */}
            {/* ＋ 展開ボタン */}
            <button
              className={`${styles["navigate-datainput"]} ${
                isPlusOpen ? styles.close : ""
              }`}
              disabled={isPlusDisabled}
              onClick={() => {
                if (!isPlusDisabled) setIsPlusOpen((prev) => !prev);
              }}
            >
              {isPlusOpen ? <X size={20} /> : <Plus size={20} />}
            </button>
            {/* {isPlusDisabled ? (
              <button className={`${styles["navigate-datainput"]} ${styles.disabled}`} disabled>
                <Plus size={16} />
              </button>
            ) : (
              <Link to="/dataInput">
                <button className={styles["navigate-datainput"]}>
                  <Plus size={16} />
                </button>
              </Link>
            )} */}

            {/* 通知 */}
            <Link to="/notification" className={`${styles["nav-item"]} ${isActive("/notification") ? styles.active : ""}`}>
              <Bell className={styles["nav-icon"]} size={20} />
              <span className={styles["nav-label"]}>通知</span>
            </Link>

            {/* マイページ */}
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