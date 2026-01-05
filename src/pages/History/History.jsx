import React, { useState, useEffect } from "react";
import Layout from "../../components/common/Layout";
import styles from "./History.module.css";

const History = () => {
  // --- State管理 ---
  // タブは 'graph' か 'calendar'
  const [activeTab, setActiveTab] = useState('graph');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null); // 取得データ用

  // --- API関連 (枠組みだけ用意) ---
  const getApiUrl = () => {
    const baseUrl = "https://t08.mydns.jp/kakeibo/public/api";
    // タブによってエンドポイントを変える場合の想定
    return activeTab === 'graph' 
      ? `${baseUrl}/analysis`   // 仮のエンドポイント
      : `${baseUrl}/history`;   // 仮のエンドポイント
  };

  const getCsrfToken = () => {
    const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
    if (match) return decodeURIComponent(match[2]);
    return null;
  };

  const getHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    const token = getCsrfToken();
    if (token) {
      headers['X-XSRF-TOKEN'] = token;
    }
    return headers;
  };

  // データ取得 (まだフェッチできない前提のため、コンソールログのみ)
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = getApiUrl();
      console.log(`Fetching ${activeTab} data from: ${url}`);
      
      // --- 通信処理のスケルトン ---
      /*
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("データの取得に失敗しました");
      const result = await response.json();
      setData(result);
      */
      
      // 仮のウェイト
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);


  // --- UI構築 ---

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
              <p>現在「{activeTab === 'graph' ? 'グラフ' : 'カレンダー'}」を表示中</p>
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