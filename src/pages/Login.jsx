// src/pages/Login.jsx
import React, { useState, useRef, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, CircleAlert, Cake } from "lucide-react";  // アイコン部品
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

  return (
    <div className="custom-select-container" ref={wrapperRef}>
      <div 
        className="input-field select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={!selected ? "placeholder-text" : ""}>
          {selected ? selected.label : "生年月日（任意）"}
        </span>
        <span className="arrow">▾</span>
      </div>

      {isOpen && (
        <div className="dropdown-list">
          {options.map(opt => (
            <div
              key={opt.value}
              className="dropdown-item"
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ログイン部分(初期表示)
 */
const Login = () => {
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

  // ログイン処理
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // バリデーション(空欄チェック)
    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    setIsLoading(true);

    try {
      console.log("ログイン試行:", { email, password, rememberMe });
      const fakeToken = "abcde-12345-token";

      // 自動ログイン設定をlocalstorageに保存する
      if (rememberMe) {
        localStorage.setItem("authToken", fakeToken);        
        // メールアドレスも
        localStorage.setItem("savedEmail", email); 
      }
      else {
        // セッションストレージに保存
        sessionStorage.setItem("authToken", fakeToken);        
        // メールアドレスを消す
        localStorage.removeItem("savedEmail");
      }

      // ログイン後の画面へ移動
      alert("ログイン成功！");
      // navigate("/dashboard"); // React Routerを使っている場合

    }
    catch (error) {
      console.error("ログインエラー", error);
      alert("ログインに失敗しました");
    }
    finally {
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
            
            {/* 入力欄 */}
            <form onSubmit={handleLogin} className="input-section">
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
                    パスワードを忘れた方
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