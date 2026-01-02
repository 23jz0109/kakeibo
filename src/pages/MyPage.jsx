import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/common/Layout";

const MyPage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    navigate("/login");
  };

  const headerContent = (
    <h1 style={{ fontSize: "1.2rem", color: "#333", margin: 0 }}>マイページ</h1>
  );

  const mainContent = (
    <div style={{ padding: "2rem" }}>
      <button 
        onClick={handleLogout}
        style={{ width: "100%", padding: "1rem", background: "#ef4444", color: "white", border: "none", borderRadius: "8px" }}
      >
        ログアウト
      </button>
    </div>
  );

  return <Layout headerContent={headerContent} mainContent={mainContent} />;
};

export default MyPage;