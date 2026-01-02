import { useEffect } from 'react';

/**
 * ブラウザの「戻る」操作を無効化するカスタムフック
 */
export const usePreventBack = () => {
  useEffect(() => {
    // 現在の履歴状態をスタックに積む（ダミー履歴）
    window.history.pushState(null, "", window.location.href);

    // ブラウザバック（popstate）が起きたら、即座に履歴を再度積み直す
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
};