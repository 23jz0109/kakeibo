// src/pages/Login.jsx
import React, { useState, useRef, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, CircleAlert, Cake } from "lucide-react";  // アイコン部品
import { useNavigate } from "react-router-dom";
import "./Login.css";

/**
 * 新規登録の年選択パーツ
 */
function YearSelect({ selectedYear, setSelectedYear }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // 今年から100年前までのリストを作る
  const options = Array.from({ length: 100 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: `${year}年` };
  });

  const selected = options.find(opt => opt.value === selectedYear);

  const handleSelect = (val) => {
    setSelectedYear(val);
    setIsOpen(false);
  };

  // 外側をクリックしたら閉じる処理
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // プルダウンメニュー生成
  return (
    <div className="custom-select-container" ref={wrapperRef}>
      <div 
        className="input-field select-trigger" 
        onClick={() => setIsOpen(!isOpen)}>
        <span className={!selected ? "placeholder-text" : ""}>
          {selected ? selected.label : "生年月日 (年・任意)"}
        </span>
        <span className="arrow">▾</span>
      </div>

      {isOpen && (
        <div className="dropdown-list">
          {options.map(opt => (
            <div
              key={opt.value}
              className="dropdown-item"
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
 * (初期表示: ログイン)
 */
const Login = () => {
  const navigate = useNavigate();

  // APIのベースURL
  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

  // タブの状態管理
  const [activeTab, setActiveTab] = useState("login");

  // 入力欄(共通)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // 入力欄(自動ログインチェックボックス)
  const [rememberMe, setRememberMe] = useState(false);
  // 入力欄(新規登録)
  const [year, setYear] = useState(null);

  // エラーメッセージとローディング
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // 保存されたメールアドレスを復元
  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // ログイン処理
  const performLogin = async (loginEmail, loginPassword) => {
    // データベースと通信
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const data = await response.json();

    // ログイン成功
    if (response.ok && data.status === "success") {
      console.log("ログイン成功:", data);
      
      // メールを保存(何度も入力することを防ぐ)
      localStorage.setItem("savedEmail", loginEmail);
            
      // 自動ログインをチェックした場合はlocalStorageにアクセストークンを保存する
      if (rememberMe) {
        localStorage.setItem("authToken", data.token);
      }
      // 普通にログインする場合はセッションに保存+メールを削除する
      else {
        sessionStorage.setItem("authToken", data.token);
        localStorage.removeItem("savedEmail");
      }

      // 画面遷移
      navigate("/history", { replace: true });
      return true;
    } 
    // ログイン失敗
    else {
      console.error("ログイン失敗:", data);
      setErrorMessage("ログインに失敗しました。");
      return false;
    }
  };

  // ログイン処理
  const handleSubmit = async (e) => {
    e.preventDefault();

    // エラーメッセージをリセット
    setErrorMessage("");
    
    // バリデーション(空欄チェック)
    if (!email || !password) {
      setErrorMessage("メールアドレスとパスワードを入力してください");
      return;
    }

    // 遅い場合にはローディングを挟む
    setIsLoading(true);

    try {
      // ログイン処理
      if (activeTab === "login") {
        // メソッドperformLoginの結果を待つ
        await performLogin(email, password);
      }
      // 新規登録処理
      else {
        // バックエンドのcolumnに合わせて整形する
        const payload = {
          mail_address: email,
          password: password,
          year_of_born: year,
        };

        // バックエンド通信設定
        const response = await fetch(`${API_BASE_URL}/user`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload),
        });

        // バリデーションエラーのハンドリング用
        const data = await response.json();

        // 登録成功
        if (response.ok) {
          console.log("新規登録成功:", data);

          // 登録成功の場合はそのままログインする
          const loginResult = await performLogin(email, password);
          
          // 万が一ログインだけ失敗した場合
          if (!loginResult) {            
            setActiveTab("login");
            setErrorMessage("登録は成功 | ログイン失敗、もう一度やり直してください。");
          }
        }
        // 登録失敗
        else {
          console.error("登録エラー:", data);

          if (data.errors) {
            if (data.errors.mail_address) {
              // メッセージ用意
              const msg = data.errors.mail_address[0];

              if (msg.includes("taken")) {
                setErrorMessage("このメールアドレスは既に使用されています。");
              }
              else {
                setErrorMessage(msg);
              }
            } 
            else if (data.errors.password) {
              setErrorMessage(data.errors.password[0]);
            } 
            else {
              const errorValues = Object.values(data.errors).flat();
              setErrorMessage(errorValues[0] || "入力内容を確認してください。");
            }
          } 
          // バリデーション以外のエラーメッセージ
          else if (data.message) {
             setErrorMessage(data.message);
          }
          // それ以外
          else {
            setErrorMessage("登録処理に失敗しました。");
          }
        }
      }
    }
    // DBエラー
    catch (error) {
      console.error("通信エラー", error);
      setErrorMessage("サーバーに接続できませんでした。");
    }
    finally {
      // ローディング解除
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">      
      {/* ログイン・新規登録タブ */}
      <div className="tab-container">
        <button 
          className={`tab-button ${activeTab === "login" ? "active" : ""}`}
          onClick={() => setActiveTab("login")}>ログイン
        </button>
        <button 
          className={`tab-button ${activeTab === "register" ? "active" : ""}`}
          onClick={() => setActiveTab("register")}>新規登録
        </button>
      </div>

      <div className="card-wrapper">
        <div className="main-container">
        {/* 共通表示(システム名) */}
          <div className="main-inner">
            <div className="main-header">
              <h1>23JZ T08</h1>
            </div>

            {/* エラーメッセージ表示エリア */}
            {errorMessage && (
              <div className="error-message-area">
                <CircleAlert size={18} />
                <span>{errorMessage}</span>
              </div>
            )}
            
            {/* 入力欄 */}
            <form onSubmit={handleSubmit} className="input-section">
              {/* メール */}
              <div className="input-wrapper">
                <span className="icon"><Mail size={16} /></span>
                <input 
                  type="email"
                  placeholder="メールアドレス" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* パスワード */}
              <div className="input-wrapper">
                <span className="icon"><Lock size={16} /></span>
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                />
                {/* パスワード表示 */}
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="eye-icon"
                  style={{ cursor: "pointer" }}
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </span>
              </div>

              {/* 新規登録表示部分 / 自動ログインチェックボックス */}
              {activeTab === "register" ? (
                <div className="input-wrapper">
                  <span className="icon"><Cake size={16} /></span>
                  <YearSelect selectedYear={year} setSelectedYear={setYear} />
                </div>
              ) : (
                <div className="login-options-row">                  
                  {/* オートログイン */}
                  <div className="checkbox-wrapper">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}/>
                      次回から自動ログイン
                    </label>
                  </div>

                  {/* パスワード忘れ */}
                  <button type="button" className="forgot-password">
                    パスワードを忘れた方ko
                  </button>
                </div>
              )}

              {/* 送信ボタン */}
              <button 
                type="submit" 
                className="submit-button"
                disabled={isLoading}>
                {activeTab === "login" ? "ログイン" : "登録する"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;