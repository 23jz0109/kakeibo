import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, X, Lock, Calendar, LogOut } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./UserInfo.module.css";

// 年選択
function YearSelect({ selectedYear, setSelectedYear }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const options = Array.from({ length: 100 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: `${year}年` };
  });
  const selected = options.find((opt) => opt.value === Number(selectedYear));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // プルダウン生成
  return (
    <div className={styles.categorySelectWrapper} ref={wrapperRef}>
      <div className={styles.selectedCategory} onClick={() => setIsOpen((prev) => !prev)}>
        <span className={`${styles.selectedText} ${!selected ? styles.unselected : ""}`}>
          {selected ? selected.label : "生まれた年を選択"}
        </span>
        <span className={styles.arrow}>▾</span>
      </div>
      {isOpen && (
        <div className={styles.dropdownList}>
          {options.map((opt) => (
            <div
              key={opt.value}
              className={styles.dropdownItem}
              onClick={() => { setSelectedYear(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// メイン
function UserInfo() {
  const navigate = useNavigate();
  
  // APIのベースURL
  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";
  
  // トークン取得 (localStorage優先、なければsessionStorage)
  const authToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // データ表示用
  const [userData, setUserData] = useState({
    birthYear: null,
  });

  // ポップアップ
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);

  // 入力欄
  const [tempCurrentPassword, setTempCurrentPassword] = useState("");
  const [tempNewPassword, setTempNewPassword] = useState("");
  const [tempNewPasswordConfirm, setTempNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [tempBirthYear, setTempBirthYear] = useState("");
  const [birthYearError, setBirthYearError] = useState("");
  const [birthYearMessage, setBirthYearMessage] = useState("");

  // ユーザー情報取得
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!authToken) return;

      try {
        const response = await fetch(`${API_BASE_URL}/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        });

        // 取得成功
        if (response.ok) {
          const data = await response.json();
        //   console.log("ユーザー情報取得:", data.id, data.mail_address);
          setUserData({
            birthYear: data.year_of_born || data.YEAR_OF_BORN || null,
          });
          setTempBirthYear(data.year_of_born || data.YEAR_OF_BORN || "");
        } 
        // 取得失敗
        else {
          console.error("ユーザー情報の取得に失敗:", response.status);
          if (response.status === 401) {
            console.error("認証トークンが無効です");
          }
        }
      }
      // 取得失敗
      catch (error) {
        console.error("通信エラー", error);
      }
    };

    fetchUserInfo();
  }, [authToken]);

  // ポップアップを閉じる処理
  const closeModals = () => {
    setIsPasswordModalOpen(false);
    setIsYearModalOpen(false);
    setPasswordMessage(""); setPasswordError("");
    setBirthYearMessage(""); setBirthYearError("");
    setTempCurrentPassword(""); setTempNewPassword(""); setTempNewPasswordConfirm("");
    setTempBirthYear(userData.birthYear); 
  };

  // パスワード更新
  const updatePassword = async () => {
    if (!tempCurrentPassword) {
      setPasswordError("現在のパスワードを入力してください");
      return;
    }
    if (!tempNewPassword || tempNewPassword !== tempNewPasswordConfirm) {
      setPasswordError("新しいパスワードが一致しません");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          password: tempCurrentPassword,
          new_password: tempNewPassword
        }),
      });

      const data = await res.json();

      // 変更成功
      if (res.ok) {
        setPasswordMessage("パスワードを更新しました");
        setTimeout(() => {
          closeModals();
        }, 1500);
      }
      
      // 変更失敗
      else {
        setPasswordError(data.message || "更新に失敗しました");
      }
    }
    // DBエラー
    catch (e) {
      console.error(e);
      setPasswordError("サーバーエラーが発生しました");
    }
  };

  // 生年更新
  const updateBirthYear = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          year_of_born: tempBirthYear ? parseInt(tempBirthYear, 10) : null 
        }),
      });
      
      const data = await res.json();

      // 更新成功
      if (res.ok) {
        setUserData({ ...userData, birthYear: tempBirthYear });
        setBirthYearMessage("更新しました");
        setTimeout(() => {
          closeModals();
        }, 1000);
      }
      
      // 更新失敗
      else {
        setBirthYearError(data.message || "更新に失敗しました");
      }
    }
    // DBエラー
    catch (e) {
      setBirthYearError("サーバーエラーが発生しました");
    }
  };

  // 退会処理
  const handleWithdraw = async () => {
    // 確認
    if (!window.confirm("本当に退会しますか？\n保存されたデータは全て削除され、復元できません。")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/user`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "Accept": "application/json"
        },
      });
      
      // 退会成功
      if (res.ok) {
        alert("退会処理が完了しました。");
        sessionStorage.clear();
        localStorage.removeItem("authToken");
        navigate("/");
      }
      
      // 退会失敗
      else {
        alert("退会処理に失敗しました。");
      }
    }
    // DBエラー
    catch (e) {
      alert("エラーが発生しました。");
    }
  };
  
  // ヘッダー
  const headerContent = (
    <div className={styles.headerContainer}>
      <button className={styles.backButton} onClick={() => navigate("/mypage")}>
        <ChevronLeft size={24} />
      </button>
      <h1 className={styles.headerTitle}>登録情報</h1>
    </div>
  );

  // メインコンテンツ
  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div className={styles.mainContainer}>
          <p className={styles.pageTitle}>基本情報</p>
          <ul className={styles.infoList}>
            {/* パスワード */}
            <li className={styles.infoItem}>
              <div className={styles.label}>
                <Lock size={18} />
                <span>パスワード</span>
              </div>
              <div className={styles.rightContent}>
                <span className={styles.valueText}>********</span>
                <button 
                  className={styles.actionButton} 
                  onClick={() => setIsPasswordModalOpen(true)}>
                  変更
                </button>
              </div>
            </li>

            {/* 生まれた年 */}
            <li className={styles.infoItem}>
              <div className={styles.label}>
                <Calendar size={18} />
                <span>生まれた年</span>
              </div>
              <div className={styles.rightContent}>
                <span className={styles.valueText}>
                  {userData.birthYear ? `${userData.birthYear}年` : "未設定"}
                </span>
                <button 
                  className={styles.actionButton} 
                  onClick={() => {
                      setTempBirthYear(userData.birthYear);
                      setIsYearModalOpen(true);
                  }}>
                  変更
                </button>
              </div>
            </li>

            {/* 退会ボタン */}
            <li className={styles.infoItem} style={{ padding: 0, overflow: 'hidden' }}>
              <button className={styles.withdrawButton} onClick={handleWithdraw}>
                <LogOut size={18} />
                <span>退会する</span>
              </button>
            </li>
          </ul>

          {/* パスワード変更(ポップアップ) */}
          {isPasswordModalOpen && (
            <div className={styles.modalOverlay} onClick={closeModals}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={closeModals}>
                    <X size={24} />
                </button>
                <p className={styles.modalTitle}>パスワード変更</p>
                <div className={styles.modalBody}>
                    <input
                      type="password"
                      placeholder="現在のパスワード"
                      value={tempCurrentPassword}
                      className={styles.inputLarge}
                      onChange={(e) => { setTempCurrentPassword(e.target.value); setPasswordMessage(""); setPasswordError(""); }}
                    />
                    <input
                      type="password"
                      placeholder="新しいパスワード"
                      value={tempNewPassword}
                      className={styles.inputLarge}
                      onChange={(e) => { setTempNewPassword(e.target.value); setPasswordMessage(""); setPasswordError(""); }}
                    />
                    <input
                      type="password"
                      placeholder="新しいパスワード（確認）"
                      value={tempNewPasswordConfirm}
                      className={styles.inputLarge}
                      onChange={(e) => { setTempNewPasswordConfirm(e.target.value); setPasswordMessage(""); setPasswordError(""); }}
                    />
                    {passwordError && <p className={styles.errorMessage}>{passwordError}</p>}
                    {passwordMessage && <p className={styles.successMessage}>{passwordMessage}</p>}
                    
                    <button className={styles.updateButton} onClick={updatePassword}>更新する</button>
                </div>
              </div>
            </div>
          )}

          {/* 生まれた年変更(ポップアップ) */}
          {isYearModalOpen && (
            <div className={styles.modalOverlay} onClick={closeModals}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={closeModals}>
                    <X size={24} />
                </button>
                <p className={styles.modalTitle}>生まれた年を変更</p>
                <div className={styles.modalBody}>
                    <YearSelect selectedYear={tempBirthYear} setSelectedYear={setTempBirthYear} />
                    
                    {birthYearError && <div className={styles.errorMessage}>{birthYearError}</div>}
                    {birthYearMessage && <div className={styles.successMessage}>{birthYearMessage}</div>}
                    
                    <button className={styles.updateButton} onClick={updateBirthYear}>更新する</button>
                </div>
              </div>
            </div>
          )}

        </div>
      }
    />
  );
}

export default UserInfo;