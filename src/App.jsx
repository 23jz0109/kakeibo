import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./pages/Login";
// 履歴
import History from './pages/History/History';
// 予算
import Budget from "./pages/Budget/Budget";
// データ入力
import IncomeInput from "./pages/DataInput/IncomeInput"
import ExpenseManualInput from "./pages/DataInput/ExpenseManualInput"
import ExpenseOcrInput from "./pages/DataInput/ExpenseOcrInput"
// 通知
import Notification from "./pages/Notification/Notification";
import PriceInfo from "./pages/Notification/PriceInfo";
// マイページ
import MyPage from "./pages/MyPage/MyPage";
import UserInfo from './pages/MyPage/UserInfo';
import Statistics from './pages/MyPage/Statistics';
import Setting from './pages/MyPage/Setting';
import CategorySettings from './pages/MyPage/CategorySetting';


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
  return (
    <Router basename="/combine_test">
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
          <Route path="/input/income" element={<PrivateRoute><IncomeInput /></PrivateRoute>} />
          <Route path="/input/manual" element={<PrivateRoute><ExpenseManualInput /></PrivateRoute>} />
          <Route path="/input/ocr" element={<PrivateRoute><ExpenseOcrInput /></PrivateRoute>} />

          {/* 通知 */}
          <Route path="/notification" element={<PrivateRoute><Notification /></PrivateRoute>} />
            <Route path="/price/:productName" element={<PrivateRoute><PriceInfo /></PrivateRoute>} />

          {/* マイページ */}
          <Route path="/mypage" element={<PrivateRoute><MyPage /></PrivateRoute>} />
            <Route path="/userinfo" element={<PrivateRoute><UserInfo /></PrivateRoute>} />
            <Route path="/categories" element={<PrivateRoute><CategorySettings /></PrivateRoute>} />
            <Route path='/setting' element={<PrivateRoute><Setting /></PrivateRoute>} />
            <Route path="/statistics" element={<PrivateRoute><Statistics /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;