import { useState, useEffect } from "react";

/**
 * フォームの内容をsessionStorageに保存・復元するフック
 */
export const useFormPersist = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      // "undefined" や "null" という文字列、または空の場合は初期値を返す
      if (!stored || stored === "undefined" || stored === "null") {
        return initialValue;
      }

      const parsed = JSON.parse(stored);
      
      // 日付文字列判定 (簡易版: YYYY-MM-DDTHH...)
      if (typeof parsed === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(parsed)) {
          return new Date(parsed);
      }
      return parsed;

    } catch (error) {
      console.error(`Storage parse error (${key}):`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    // undefined は保存しない
    if (value === undefined) return;
    sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};