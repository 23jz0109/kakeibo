import React from "react";
import Layout from "../components/common/Layout";

const History = () => {
  // ヘッダーに表示するタイトル
  const headerContent = (
    <h1 style={{ fontSize: "1.2rem", color: "#333", margin: 0 }}>履歴一覧</h1>
  );

  // メインエリアの中身
  const mainContent = (
    <div style={{ padding: "1rem" }}>
      <p>ここに取引履歴が表示されます。</p>
      {/* ここに将来、履歴リストコンポーネントが入ります */}
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={mainContent}
    />
  );
};

export default History;