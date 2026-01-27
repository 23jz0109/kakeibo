// src/components/common/ErrorDisplay.jsx
import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * エラー表示用コンポーネント
 * @param {string} message - エラーのメインタイトル
 * @param {string} description - 詳細メッセージ（改行は <br/> を含む文字列で渡すか、ReactNodeで渡す）
 * @param {function} onRetry - 再読み込みボタンのクリックハンドラ
 */
const ErrorDisplay = ({ 
  message = "通信エラーが発生しました", 
  description = "ネットワーク接続を確認して\n再読み込みしてください", 
  onRetry 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '40px 20px',
      textAlign: 'center',
      color: '#666',
      height: '100%', // コンテナいっぱいに広げる
      width: '100%'
    }}>
      <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
      
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#333' }}>
        {message}
      </h3>
      
      <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
        {description}
      </p>

      {onRetry && (
        <button 
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '20px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
        >
          <RefreshCw size={18} /> 再読み込み
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;