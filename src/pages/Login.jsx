// src/pages/Login.jsx
import React, { useState, useRef, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, CircleAlert, Cake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import myIcon from "../../public/icon-192.png";
import SubmitButton from "../components/common/SubmitButton";

/**
 * 新規登録の年選択パーツ
 */
function YearSelect({ selectedYear, setSelectedYear }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const options = Array.from({ length: 100 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: `${year}年` };
  });

  const selected = options.find(opt => opt.value === selectedYear);

  const handleSelect = (val) => {
    setSelectedYear(val);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.customSelectContainer} ref={wrapperRef}>
      <div
        className={`${styles.inputField} ${styles.selectTrigger}`} // inputFieldのスタイルを共通利用
        onClick={() => setIsOpen(!isOpen)}>
        <span className={!selected ? styles.placeholderText : ""}>
          {selected ? selected.label : "生年月日 (年・任意)"}
        </span>
        <span className={styles.arrow}>▾</span>
      </div>

      {isOpen && (
        <div className={styles.dropdownList}>
          {options.map(opt => (
            <div
              key={opt.value}
              className={styles.dropdownItem}
              onClick={() => handleSelect(opt.value)}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ログイン・新規登録部分
 */
const Login = () => {
  const navigate = useNavigate();
  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [year, setYear] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // モバイル対応: 入力欄にフォーカスが当たったら画面中央へスクロール
  const handleFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const validateMailAddress = (val) => {
    if (!val) return true;
    const isWithInMaxLength = val.length <= 255;
    if(!isWithInMaxLength) {
      setErrorMessage("メールアドレスは255文字以内で入力してください。");
    }
    return isWithInMaxLength;
  }

  const validatePassword = (val) => {
    if (!val) return true; 
    const regex = /^[a-zA-Z0-9]{8,16}$/;
    const isValid = regex.test(val);
    if (!isValid) {
      setErrorMessage("パスワードは8～16文字の半角英数字で入力してください");
    }
    return isValid;
  };

  const handleEmailChange = (e) => {
    const newValue = e.target.value;
    setEmail(newValue);
    if (errorMessage) {
      if (errorMessage.includes("入力してください") && newValue) {
        setErrorMessage("");
      } else if (errorMessage.includes("255文字以内") && newValue.length <= 255) {
        setErrorMessage("");
      }
    }
  };

  const handlePasswordChange = (e) => {
    const newValue = e.target.value;
    setPassword(newValue);
    if (errorMessage) {
      if (errorMessage.includes("入力してください") && newValue) {
        setErrorMessage("");
      } else if (errorMessage.includes("8～16文字の半角英数字")) {
        const regex = /^[a-zA-Z0-9]{8,16}$/;
        if (regex.test(newValue)) setErrorMessage("");
      }
    }
  };

  const handleEmailBlur = () => validateMailAddress(email);
  const handlePasswordBlur = () => validatePassword(password);

  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const performLogin = async (loginEmail, loginPassword) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await response.json();

    if (response.ok && data.status === "success") {
      console.log("ログイン成功:", data);
      localStorage.setItem("savedEmail", loginEmail);
      if (rememberMe) {
        localStorage.setItem("authToken", data.token);
      } else {
        sessionStorage.setItem("authToken", data.token);
        localStorage.removeItem("savedEmail");
      }
      navigate("/history", { replace: true });
      return true;
    } else {
      console.error("ログイン失敗:", data);
      setErrorMessage("ログインに失敗しました。");
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("メールアドレスとパスワードを入力してください");
      return;
    }
    if (!validateMailAddress(email) || !validatePassword(password)) {
      return;
    }

    setIsLoading(true);

    try {
      if (activeTab === "login") {
        await performLogin(email, password);
      } else {
        const payload = {
          mail_address: email,
          password: password,
          year_of_born: year,
        };
        const response = await fetch(`${API_BASE_URL}/user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (response.ok) {
          console.log("新規登録成功:", data);
          const loginResult = await performLogin(email, password);
          if (!loginResult) {
            setActiveTab("login");
            setErrorMessage("登録は成功 | ログイン失敗、もう一度やり直してください。");
          }
        } else {
          console.error("登録エラー:", data);
          if (data.errors) {
            if (data.errors.mail_address) {
              const msg = data.errors.mail_address[0];
              if (msg.includes("taken")) {
                setErrorMessage(msg);
              }
              else {
                setErrorMessage("このメールアドレスは既に使用されています。");
              }
            } else if (data.errors.password) {
              setErrorMessage(data.errors.password[0]);
            } else {
              const errorValues = Object.values(data.errors).flat();
              setErrorMessage(errorValues[0] || "入力内容を確認してください。");
            }
          } else if (data.message) {
            setErrorMessage(data.message);
          } else {
            setErrorMessage("登録処理に失敗しました。");
          }
        }
      }
    } catch (error) {
      console.error("通信エラー", error);
      setErrorMessage("サーバーに接続できませんでした。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEmail("");
    setPassword("");
    setErrorMessage("");
    setYear(null);
  };

  return (
    <div className={styles.loginScrollRoot}>
      <div className={styles.loginPageContainer}>
        {/* ログイン・新規登録タブ (モダンデザイン化) */}
        <div className={styles.tabContainer}>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.tabButton} ${activeTab === "login" ? styles.active : ""}`}
              onClick={() => handleTabChange("login")}>
              ログイン
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === "register" ? styles.active : ""}`}
              onClick={() => handleTabChange("register")}>
              新規登録
            </button>
          </div>
        </div>

        <div className={styles.cardWrapper}>
          <div className={styles.mainContainer}>
            <div className={styles.mainInner}>
              <div className={styles.mainHeader}>
              <img src={myIcon} className={styles.myIcon} alt="App Logo" />
              <h1 className={styles.mainTitle}>おうちの台帳</h1>
            </div>

              {/* エラーメッセージ表示エリア */}
              {errorMessage && (
                <div className={styles.errorMessageArea}>
                  <CircleAlert size={20} flexShrink={0} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 入力欄 */}
              <form onSubmit={handleSubmit} className={styles.inputSection}>
                {/* メール */}
                <div className={styles.inputWrapper}>
                  <span className={styles.icon}><Mail size={20} /></span>
                  <input
                    type="email"
                    placeholder="メールアドレス"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    onFocus={handleFocus}
                    className={styles.inputField}
                  />
                </div>

                {/* パスワード */}
                <div className={styles.inputWrapper}>
                  <span className={styles.icon}><Lock size={20} /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワード"
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    onFocus={handleFocus}
                    className={styles.inputField}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.eyeIcon}
                  >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </span>
                </div>
                
                <div className={styles.passwordRequirements}>
                  ※8～16文字の半角英数字
                </div>

                {/* 新規登録表示部分 / 自動ログインチェックボックス */}
                {activeTab === "register" ? (
                  <div className={styles.inputWrapper}>
                    <span className={styles.icon}><Cake size={20} /></span>
                    <YearSelect selectedYear={year} setSelectedYear={setYear} />
                  </div>
                ) : (
                  <div className={styles.loginOptionsRow}>
                    <div className={styles.checkboxWrapper}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)} />
                        次回から自動ログイン
                      </label>
                    </div>

                    <button type="button" className={styles.forgotPassword}>
                      パスワードを忘れた方
                    </button>
                  </div>
                )}

                {/* 送信ボタン */}
                <SubmitButton 
                  disabled={isLoading}
                  onClick={handleSubmit}
                  text={activeTab === "login" ? "ログイン" : "登録する"}
                />
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;