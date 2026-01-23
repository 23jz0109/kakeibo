import { useState, useCallback } from "react";
import { useAuthFetch } from '../useAuthFetch';

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useSuggestion = () => {
  const [productList, setProductList] = useState([]);
  const [shopList, setShopList] = useState([]);

  const authFetch = useAuthFetch(); // フックを使用

  // 商品候補
  const fetchProductCandidates = useCallback(async () => {
    try {
      // authFetch を使用
      const response = await authFetch(`${API_BASE_URL}/product`, {
        method: "GET"
      });
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.products)) {
          setProductList(data.products);
        }
      }
    }
    catch (err) {
      console.error("候補取得エラー", err);
    }
  }, [authFetch]);

  // 店舗候補
  const fetchShopCandidates = useCallback(async () => {
    try {
      // authFetch を使用
      const response = await authFetch(`${API_BASE_URL}/shop`, {
        method: "GET"
      });

      if (response && response.ok) {
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.shops)) {
          setShopList(data.shops);
        }
      }
    }
    catch (err) {
      console.error("候補取得エラー", err);
    }
  }, [authFetch]);

  return {
    productList,
    shopList,
    fetchProductCandidates,
    fetchShopCandidates
  };
};