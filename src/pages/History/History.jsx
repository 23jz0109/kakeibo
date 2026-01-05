import React, { useState, useEffect } from "react";
import Layout from "../../components/common/Layout";
import styles from "./History.module.css";

const baseUrl = "https://t08.mydns.jp/kakeibo/public/api";

const History = () => {
  // --- State管理 ---
  const [activeTab, setActiveTab] = useState('graph');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // ヘッダー: タイトル中央、右側ボタンなし
  const headerContent = (
    <div className={styles.headerContainer}>
      <h1 className={styles.headerTitle}>履歴</h1>
      {/* 追加ボタンは不要なので配置しない */}
    </div>
  );

  const renderMainContent = () => {
    return (
      <div className={styles.container}>
        {/* タブ切り替えエリア */}
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'graph' ? styles.active : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            グラフ
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'calendar' ? styles.active : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            カレンダー
          </button>
        </div>

        {/* コンテンツ表示エリア */}
        <div className={styles.contentArea}>
          {isLoading ? (
            <div className={styles.loading}>読み込み中...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <div className={styles.placeholderBox}>
              {/* ここに将来的にグラフやカレンダーコンポーネントが入ります */}
              <span style={{fontSize: '0.8rem', color: '#999'}}>
                (ここに{activeTab === 'graph' ? '推移グラフ' : '月間カレンダー'}が描画されます)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout
      headerContent={headerContent}
      mainContent={renderMainContent()}
    />
  );
};

export default History;