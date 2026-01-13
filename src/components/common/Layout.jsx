import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, Calendar, Bell, User, Plus, ChevronLeft, Trash2, X, Camera, Edit3, ArrowDownCircle } from "lucide-react";
import { usePreventBack } from "../../hooks/common/usePreventBack";
import styles from "./Layout.module.css";

const Layout = ({
  headerContent,
  mainContent,
  disableDataInputButton = false,
  redirectPath,
  state = null,
  onDeleteButtonClick,
  hideHeader = false,
  hideFooter = false,
}) => {
  usePreventBack();

  const location = useLocation();
  const navigate = useNavigate();
  const [isPlusOpen, setIsPlusOpen] = useState(false);  // 「＋」ボタンの開閉状態
  
  const plusRef = useRef(null);
  const plusButtonRef = useRef(null);
  const mouseDownOutsideRef = useRef(false);

  const isActive = (path) => location.pathname === path;

  const isPlusDisabled = disableDataInputButton;

  // ナビ以外タップで閉じる
  useEffect(() => { 
    const handleMouseDown = (e) => {
      // expandInner の中 → outside ではない
      if (plusRef.current && plusRef.current.contains(e.target)) {
        mouseDownOutsideRef.current = false;
        return;
      }
      // ＋ボタン自身 → outside ではない
      if (plusButtonRef.current && plusButtonRef.current.contains(e.target)) {
        mouseDownOutsideRef.current = false;
        return;
      }
      // それ以外 → outside
      mouseDownOutsideRef.current = true;
    };

    const handleClick = () => { 
      if (mouseDownOutsideRef.current) 
        { setIsPlusOpen(false); mouseDownOutsideRef.current = false; } 
    };
    
    if (isPlusOpen) { 
      document.addEventListener("mousedown", handleMouseDown); 
      document.addEventListener("click", handleClick); 
    } 
    
    return () => { 
      document.removeEventListener("mousedown", handleMouseDown); 
      document.removeEventListener("click", handleClick); 
    }; 
  }, [isPlusOpen]);

  // 画面生成(枠)
  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      {!hideHeader && (
        <header className={styles.header}>
          {/* 戻るボタン */}
          {redirectPath && (
            <div className={styles["back-button"]}>
              <ChevronLeft size={24}
                className={styles["icon"]}
                onClick={() => navigate(redirectPath, { state })}
                style={{ cursor: "pointer" }} />
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
      )}

      {/* メインコンテンツ*/}
      <main className={styles.main}>
        {mainContent}
      </main>

      {/* 展開部分 */}
      {isPlusOpen && (
        <div className={styles.expandBar} onClick={() => setIsPlusOpen(false)}>
          <div ref={plusRef} className={styles.expandInner} onClick={(e) => e.stopPropagation()} >
            {/* 収入 */}
            <button className={`${styles.expandItem} ${styles.income}`} onClick={() => {
              setIsPlusOpen(false);
              navigate("/input/income");
            }}>
              <ArrowDownCircle size={20} />
              <span>収入</span>
            </button>

            {/* カメラ起動 */}
            <button className={`${styles.expandItem} ${styles.expense}`} onClick={() => {
              setIsPlusOpen(false);
              navigate("/input/ocr", { state: { autoCamera: true } });
            }}>
              <Camera size={20} />
              <span>OCR</span>
            </button>

            {/* 支出(手動入力) */}
            <button className={`${styles.expandItem} ${styles.expense}`} onClick={() => {
              setIsPlusOpen(false);
              navigate("/input/manual");
            }}>
              <Edit3 size={20} />
              <span>支出</span>
            </button>
          </div>
        </div>
      )}

      {/* フッターナビゲーション */}
      {!hideFooter && (
        <footer className={`${styles.footer} pb-safe`}>
          <nav className={styles["footer-nav"]}>
            {/* 履歴 */}
            <Link to="/history" className={`${styles["nav-item"]} ${isActive("/history") ? styles.active : ""}`}>
              <Calendar className={styles["nav-icon"]} size={20} />
              <span className={styles["nav-label"]}>履歴</span>
            </Link>

            {/* 予算 */}
            <Link to="/budget" className={`${styles["nav-item"]} ${isActive("/budget") ? styles.active : ""}`}>
              <Wallet className={styles["nav-icon"]} size={20} />
              <span className={styles["nav-label"]}>予算</span>
            </Link>

            {/* ＋ボタン */}
            <div className={styles["nav-item-center"]}>
              <button
                ref={plusButtonRef}
                className={`${styles["navigate-datainput"]} ${ isPlusOpen ? styles.close : "" }`}
                disabled={isPlusDisabled}
                onClick={() => { if (!isPlusDisabled) setIsPlusOpen((prev) => !prev); }}>
                {isPlusOpen ? <X size={20} /> : <Plus size={20} />}
              </button>
            </div>

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
      )}
    </div>
  );
};

export default Layout;