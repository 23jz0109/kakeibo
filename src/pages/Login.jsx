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
        className={`${styles.inputField} ${styles.selectTrigger}`}
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
  
  // State for separate error handling
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [serverError, setServerError] = useState(""); // General API errors
  
  const [isLoading, setIsLoading] = useState(false);

  // // モバイル対応: 入力欄にフォーカスが当たったら画面中央へスクロール
  // const handleFocus = (e) => {
  //   setTimeout(() => {
  //     e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //   }, 300);
  // };


  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);

    if (serverError) setServerError("");

    let newEmailError = "";
    
    if (val.length > 255) {
      newEmailError = "メールアドレスは255文字以内で入力してください。";
    } 
    else if (errors.email && val) {
       newEmailError = ""; 
    }

    setErrors(prev => ({ ...prev, email: newEmailError }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);

    if (serverError) setServerError("");

    let newPassError = "";

    if (val.length > 0 && !/^[a-zA-Z0-9]*$/.test(val)) {
      newPassError = "半角英数字のみ使用可能です";
    }
    else if (val.length > 16) {
      newPassError = "パスワードは16文字以内で入力してください";
    }
    else if (val.length >= 8) {
        newPassError = "";
    } else {
        newPassError = errors.password === "パスワードは8～16文字の半角英数字で入力してください" 
          ? errors.password 
          : "";
    }

    setErrors(prev => ({ ...prev, password: newPassError }));
  };

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
      setServerError("メールアドレスまたはパスワードが正しくありません。");
      return false;
    }
  };

  // メール・パスワードチェック
  const isEmailValid = email.length > 0 && email.length <= 255;
  const isPasswordValid = /^[a-zA-Z0-9]{8,16}$/.test(password);

  // 送信可能状態
  const canSubmit = !isLoading && isEmailValid && isPasswordValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    
    // Final Validation on Submit
    const newErrors = {};
    let hasError = false;

    if (!email) {
      newErrors.email = "メールアドレスを入力してください";
      hasError = true;
    } else if (email.length > 255) {
      newErrors.email = "メールアドレスは255文字以内で入力してください。";
      hasError = true;
    }

    if (!password) {
      newErrors.password = "パスワードを入力してください";
      hasError = true;
    } else if (!/^[a-zA-Z0-9]{8,16}$/.test(password)) {
      newErrors.password = "パスワードは8～16文字の半角英数字で入力してください";
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return;

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
            setServerError("登録は成功しましたが、ログインに失敗しました。");
          }
        } else {
          console.error("登録エラー:", data);
          if (data.errors) {
            const serverFieldErrors = {};
            if (data.errors.mail_address) {
              const msg = data.errors.mail_address[0];
              serverFieldErrors.email = msg.includes("taken") 
                ? "このメールアドレスは既に使用されています。" 
                : msg;
            }
            if (data.errors.password) {
              serverFieldErrors.password = data.errors.password[0];
            }
            
            setErrors(serverFieldErrors);
            
            if (!data.errors.mail_address && !data.errors.password) {
                const errorValues = Object.values(data.errors).flat();
                setServerError(errorValues[0] || "入力内容を確認してください。");
            }
          } else if (data.message) {
            setServerError(data.message);
          } else {
            setServerError("登録処理に失敗しました。");
          }
        }
      }
    } catch (error) {
      console.error("通信エラー", error);
      setServerError("サーバーに接続できませんでした。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEmail("");
    setPassword("");
    setErrors({ email: "", password: "" });
    setServerError("");
    setYear(null);
  };

  return (
    <div className={styles.loginScrollRoot}>
      <div className={styles.loginPageContainer}>
        {/* ログイン・新規登録タブ */}
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

              {/* サーバー/グローバルエラーのみトップに表示 */}
              {serverError && (
                <div className={styles.errorMessageArea}>
                  <CircleAlert size={20} flexShrink={0} />
                  <span>{serverError}</span>
                </div>
              )}

              {/* 入力欄 */}
              <form onSubmit={handleSubmit} className={styles.inputSection}>
                {/* メール */}
                <div className={styles.inputGroup}>
                  <div className={styles.inputWrapper}>
                    <span className={styles.icon}><Mail size={20} /></span>
                    <input
                      type="email"
                      placeholder="メールアドレス"
                      value={email}
                      onChange={handleEmailChange}
                      // onFocus={handleFocus}
                      className={`${styles.inputField} ${errors.email ? styles.inputError : ""}`}
                    />
                  </div>
                  {/* Inline Error Message */}
                  {errors.email && (
                    <div className={styles.inlineError}>
                      <CircleAlert size={14} />
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>

                {/* パスワード */}
                <div className={styles.inputGroup}>
                  <div className={styles.inputWrapper}>
                    <span className={styles.icon}><Lock size={20} /></span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="パスワード"
                      value={password}
                      onChange={handlePasswordChange}
                      // onFocus={handleFocus}
                      className={`${styles.inputField} ${errors.password ? styles.inputError : ""}`}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.eyeIcon}
                    >
                      {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </span>
                  </div>

                  {/* Inline Error Message OR Helper Text */}
                  {errors.password ? (
                    <div className={styles.inlineError}>
                      <CircleAlert size={14} />
                      <span>{errors.password}</span>
                    </div>
                  ) : (
                    <div className={styles.passwordRequirements}>
                      ※8～16文字の半角英数字
                    </div>
                  )}
                </div>

                {/* 新規登録表示部分 / 自動ログインチェックボックス */}
                {activeTab === "register" ? (
                  <div className={styles.inputGroup}>
                    <div className={styles.inputWrapper}>
                      <span className={styles.icon}><Cake size={20} /></span>
                      <YearSelect selectedYear={year} setSelectedYear={setYear} />
                    </div>
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
                  type = "submit"
                  disabled={!canSubmit}
                  // onClick={handleSubmit}
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