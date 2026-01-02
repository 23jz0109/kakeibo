import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./pages/Login";
import History from './pages/History';
import Budget from "./pages/Budget";
import DataInput from "./pages/DataInput";
import Notification from "./pages/Notification";
import MyPage from "./pages/MyPage";

/**
 * 自動ログインチェック
 * セッションとローカルストレージをチェック
 * @returns アクセストークン
 */
const isAuthenticated = () => {
  const tokenInLocal = localStorage.getItem("authToken");
  const tokenInSession = sessionStorage.getItem("authToken");
  return !!tokenInLocal || !!tokenInSession;
};

/**
 * 認証不要ルート、初期画面はログイン
 * ログイン済みは指定された初期ページに遷移する(履歴)
 * @param {*} param0 
 * @returns 
 */
const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    return <Navigate to="/history" replace />;
  }
  return children;
};

/**
 * 認証必要ルート、未ログインはログインに遷移
 * @param {*} param0 
 * @returns 
 */
const PrivateRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  // return (
  //   <Router>
  //     <Routes>
  //       {/* ログインページ */}
  //       <Route path="/" element={<Navigate to="/login" />} />
  //       <Route path="/login" element={<Login />} />
        
  //       {/* ナビゲーションバーの各パーツ */}
  //       <Route path="/history" element={<History />} />
  //       <Route path="/budget" element={<Budget />} />
  //       <Route path="/input" element={<DataInput />} />
  //       <Route path="/notification" element={<Notification />} />
  //       <Route path="/mypage" element={<MyPage />} />
  //     </Routes>
  //   </Router>
  // );

  return (
    <Router>
      <Routes>
        {/* ログインページ */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        {/* /loginを入力した場合はリダイレクト */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        
        {/* ログイン必須エリア */}
          {/* ナビゲーションバーの各パーツ */}
          {/* 履歴 */}
          <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
          {/* 予算 */}
          <Route path="/budget" element={<PrivateRoute><Budget /></PrivateRoute>} />
          {/* データ入力 */}
          <Route path="/dataInput" element={<PrivateRoute><DataInput /></PrivateRoute>} />
          {/* 通知 */}
          <Route path="/notification" element={<PrivateRoute><Notification /></PrivateRoute>} />
          {/* マイページ */}
          <Route path="/mypage" element={<PrivateRoute><MyPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;