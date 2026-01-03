import { useState, useEffect } from "react";

/**
 * フォームの内容をlocalStorageに保存・復元するフック
 */
export const useFormPersist = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      
      if (!stored || stored === "undefined" || stored === "null") {
        return initialValue;
      }

      const parsed = JSON.parse(stored);
      
      // 日付文字列判定 (簡易版: YYYY-MM-DDTHH...)
      if (typeof parsed === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(parsed)) {
          const d = new Date(parsed);
          return isNaN(d.getTime()) ? parsed : d;
      }
      return parsed;

    }
    catch (error) {
      console.error(`Storage parse error (${key}):`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (value === undefined) return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  const removeValue = () => {
    localStorage.removeItem(key);
    setValue(initialValue);
  };

  return [value, setValue, removeValue];
};