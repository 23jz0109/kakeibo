/* フロント側バリデーション制限値 必要に応じてテストケースとそろえて編集するかも */
export const VALIDATION_LIMITS = {
  // 金額系
  AMOUNT: {
    MIN: 0,
    MAX: 9999999, // 7桁
  },
  
  // ポイント
  POINT: {
    MIN: 0,
    MAX: 9999999, //7桁
  },
  
  // 数量
  QUANTITY: {
    MIN: 1,
    MAX: 9999,
  },
  
  // 割引
  DISCOUNT: {
    MIN: 0,
    MAX: 9999999, //7桁
  },
  
  // 税率（固定値）
  TAX_RATE: {
    ALLOWED: [0, 8, 10],
    DEFAULT: 10,
  },
  
  // 文字列系
  TEXT: {
    MEMO: 500,          // メモ最大文字数
    SHOP_NAME: 40,      // 店舗名
    PRODUCT_NAME: 40,   // 商品名
    MAIL_ADDRESS: 255,  // メールアドレス
    PASSWORD: {
      MIN: 8,
      MAX: 16
    },
  },
  
  // 日数系（Budget用）
  DAYS: {
    MIN: 1,
    MAX: 365,
  },
};

/* バリデーション用ヘルパー関数 */
export const validateAmount = (value, max = VALIDATION_LIMITS.AMOUNT.MAX) => {
  const num = Number(value);
  return num >= 0 && num <= max;
};

export const validateTextLength = (text, maxLength) => {
  return text.length <= maxLength;
};

export const validateAlphanumeric = (text) => {
  if (!text) return true;
  return /^[a-zA-Z0-9]+$/.test(text);
};

export const sanitizeNumericInput = (value) => {
  // 全角→半角変換
  const halfWidth = value.replace(/[０-９]/g, (s) => 
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  );
  // 数字以外を除去
  return halfWidth.replace(/[^0-9]/g, '');
};