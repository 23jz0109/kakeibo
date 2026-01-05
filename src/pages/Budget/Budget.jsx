import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import Layout from "../../components/common/Layout";
import styles from "./Budget.module.css";

const Budget = () => {
  // --- State管理 ---
  const [activeTab, setActiveTab] = useState('budget');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
 
  // ヘッダーデザインを Notification と統一
  const headerContent = (
    <div className={styles.headerContainer}>
      <h1 className={styles.headerTitle}>予算・固定費</h1>
      <div className={styles.headerButtons}>
        <button onClick={() => handleOpenModal('create')} className={styles.iconButton}>
          <Plus size={26} color="#3b82f6" />
        </button>
      </div>
    </div>
  );

  const renderMainContent = () => {
    return (
      <div className={styles.container}>
        {/* タブ切り替えエリア */}
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'budget' ? styles.active : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            予算管理
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'fixed' ? styles.active : ''}`}
            onClick={() => setActiveTab('fixed')}
          >
            固定費
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
                (ここに{activeTab === 'budget' ? '予算管理' : '固定費'}が表示されます)
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

export default Budget;