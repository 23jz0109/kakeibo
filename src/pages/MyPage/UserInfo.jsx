import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, X, Lock, Calendar, LogOut } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./UserInfo.module.css";
// バリデーション関数と定数をインポート
import { VALIDATION_LIMITS, validateAlphanumeric } from "../../constants/validationsLimits";
import { useAuthFetch } from "../../hooks/useAuthFetch";

//年選択コンポーネント
function YearSelect({ selectedYear, setSelectedYear }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const options = Array.from({ length: 100 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: `${year}年` };
  });
  const selected = options.find((opt) => opt.value === Number(selectedYear));

  // 元の「外側クリックで閉じる処理」に戻しました
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

// メインコンポーネント
function UserInfo() {
  const navigate = useNavigate();
  // フックを使用
  const authFetch = useAuthFetch();
  
  // APIのベースURL
  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";
  
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
  
  // エラー状態管理
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
    birthYear: ""
  });

  const [passwordMessage, setPasswordMessage] = useState("");

  const [tempBirthYear, setTempBirthYear] = useState("");
  const [birthYearMessage, setBirthYearMessage] = useState("");

  // ユーザー情報取得 
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/me`, {
          method: "GET",
        });

        // 401でフック側が処理した場合はここで終了
        if (!response) return;

        // 成功時
        if (response.ok) {
          const data = await response.json();
          setUserData({
            birthYear: data.year_of_born || data.YEAR_OF_BORN || null,
          });
          setTempBirthYear(data.year_of_born || data.YEAR_OF_BORN || "");
        } 
        // 【失敗時】ここを強化します！
        else {
          console.error("ユーザー情報の取得に失敗:", response.status);

          if (response.status === 404 || response.status === 500) {
            alert("ユーザー情報が見つかりません。ログアウトします。");
            sessionStorage.clear();
            localStorage.removeItem("authToken");
            navigate("/");
          }
        }
      }
      catch (error) {
        console.error("通信エラー", error);
      }
    };

    fetchUserInfo();
  }, [authFetch, navigate]);

  // バリデーション関数
  const validateField = (name, value, relatedValue = null) => {
    let error = "";
    switch (name) {
      case "currentPassword":
        if (!value) error = "現在のパスワードを入力してください";
        break;
      case "newPassword":
        const { MIN, MAX } = VALIDATION_LIMITS.TEXT.PASSWORD;
        if (!value) {
          error = "新しいパスワードを入力してください";
        } else if (value.length < MIN || value.length > MAX) {
          error = `${MIN}文字以上${MAX}文字以内で入力してください`;
        } else if (!validateAlphanumeric(value)) {
          error = "半角英数字で入力してください";
        }
        break;
      case "newPasswordConfirm":
        if (value !== relatedValue) {
          error = "パスワードが一致しません";
        }
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error === "";
  };

  // 入力ハンドラ（バリデーション付き）
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "currentPassword") {
      setTempCurrentPassword(value);
      validateField(name, value);
    } else if (name === "newPassword") {
      setTempNewPassword(value);
      validateField(name, value);
      // 確認用フィールドも再チェック
      if (tempNewPasswordConfirm) {
        validateField("newPasswordConfirm", tempNewPasswordConfirm, value);
      }
    } else if (name === "newPasswordConfirm") {
      setTempNewPasswordConfirm(value);
      validateField(name, value, tempNewPassword);
    }
    
    setPasswordMessage("");
  };

  // ポップアップを閉じる処理
  const closeModals = () => {
    setIsPasswordModalOpen(false);
    setIsYearModalOpen(false);
    setPasswordMessage("");
    setBirthYearMessage("");
    setErrors({}); // エラーリセット
    setTempCurrentPassword(""); setTempNewPassword(""); setTempNewPasswordConfirm("");
    setTempBirthYear(userData.birthYear); 
  };

  // パスワード更新 
  const updatePassword = async () => {
    // 最終チェック
    const isCurrentValid = validateField("currentPassword", tempCurrentPassword);
    const isNewValid = validateField("newPassword", tempNewPassword);
    const isConfirmValid = validateField("newPasswordConfirm", tempNewPasswordConfirm, tempNewPassword);

    if (!isCurrentValid || !isNewValid || !isConfirmValid) return;

    try {
      const res = await authFetch(`${API_BASE_URL}/user`, {
        method: "PATCH",
        // headers は自動付与されるので body だけでOK
        body: JSON.stringify({ 
          password: tempCurrentPassword,
          new_password: tempNewPassword
        }),
      });

      if (!res) return; // ログアウト判定時は終了

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
        // サーバーサイドエラーの表示
        setErrors(prev => ({ ...prev, currentPassword: data.message || "更新に失敗しました" }));
      }
    }
    catch (e) {
      console.error(e);
      setErrors(prev => ({ ...prev, currentPassword: "サーバーエラーが発生しました" }));
    }
  };

  // 生年更新 
  const updateBirthYear = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/user`, {
        method: "PATCH",
        body: JSON.stringify({ 
          year_of_born: tempBirthYear ? parseInt(tempBirthYear, 10) : null 
        }),
      });
      
      if (!res) return; // ログアウト判定時は終了

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
        // エラー表示（アラートまたはメッセージ）
        setBirthYearMessage("");
        alert(data.message || "更新に失敗しました");
      }
    }
    catch (e) {
      alert("サーバーエラーが発生しました");
    }
  };

  // 退会処理 
  const handleWithdraw = async () => {
    if (!window.confirm("本当に退会しますか？\n保存されたデータは全て削除され、復元できません。")) {
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/user`, {
        method: "DELETE",
      });
      
      if (!res) return; // 既にトークン切れ等の場合

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

  // パスワード変更モーダルの保存ボタン有効無効判定
  const isPasswordFormValid = 
    tempCurrentPassword && 
    tempNewPassword && 
    tempNewPasswordConfirm && 
    !errors.currentPassword && 
    !errors.newPassword && 
    !errors.newPasswordConfirm;

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
                  onClick={() => {
                    setErrors({});
                    setIsPasswordModalOpen(true);
                  }}>
                  変更
                </button>
              </div>
            </li>

            {/* 生まれた年 */}
            <li className={styles.infoItem}>
              <div className={styles.label}>
                <Calendar size={18} />
                <span>生年月日(年)</span>
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
                      name="currentPassword"
                      placeholder="現在のパスワード"
                      value={tempCurrentPassword}
                      className={`${styles.inputLarge} ${errors.currentPassword ? styles.inputErrorBorder : ''}`}
                      onChange={handleInputChange}
                    />
                    {errors.currentPassword && <p className={styles.errorText}>{errors.currentPassword}</p>}

                    <input
                      type="password"
                      name="newPassword"
                      placeholder="新しいパスワード"
                      value={tempNewPassword}
                      className={`${styles.inputLarge} ${errors.newPassword ? styles.inputErrorBorder : ''}`}
                      onChange={handleInputChange}
                    />
                    {errors.newPassword && <p className={styles.errorText}>{errors.newPassword}</p>}

                    <input
                      type="password"
                      name="newPasswordConfirm"
                      placeholder="新しいパスワード（確認）"
                      value={tempNewPasswordConfirm}
                      className={`${styles.inputLarge} ${errors.newPasswordConfirm ? styles.inputErrorBorder : ''}`}
                      onChange={handleInputChange}
                    />
                    {errors.newPasswordConfirm && <p className={styles.errorText}>{errors.newPasswordConfirm}</p>}
                    
                    {passwordMessage && <p className={styles.successMessage}>{passwordMessage}</p>}
                    
                    <button 
                      className={styles.updateButton} 
                      onClick={updatePassword}
                      disabled={!isPasswordFormValid}
                    >
                      更新する
                    </button>
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