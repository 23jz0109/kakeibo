import { useState, useCallback } from "react";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

export const useSuggestion = () => {
  const [productList, setProductList] = useState([]);
  const [shopList, setShopList] = useState([]);

  const authToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

  // 商品候補
  const fetchProductCandidates = useCallback(async () => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/product`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.products)) {
          setProductList(data.products);
        }
      }
    }
    
    catch (err) {
      console.error("候補取得エラー", err);
    }
  }, [authToken]);

  // 店舗候補
  const fetchShopCandidates = useCallback(async () => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/shop`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.shops)) {
          setShopList(data.shops);
        }
      }
    }
    catch (err) {
      console.error("候補取得エラー", err);
    }

  }, [authToken]);

  return {
    productList,
    shopList,
    fetchProductCandidates,
    fetchShopCandidates
  };
};