import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/common/Layout";
import { ArrowRightLeft, ChevronLeft, ExternalLink, ShoppingBag, Loader2 } from "lucide-react";
import styles from "./PriceInfo.module.css";
import { useAuthFetch } from "../../hooks/useAuthFetch";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

const PriceInfo = () => {
  const { productName } = useParams();
  const navigate = useNavigate();
  const authFetch = useAuthFetch(); // フックを使用

  const [site, setSite] = useState("rakuten"); // 'rakuten' or 'yahoo'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [error, setError] = useState(null);

  // 検索
  useEffect(() => {
    if (productName) {
      fetchItems();
    }
  }, [site, productName]);

  // データ取得
  const fetchItems = async () => {
    setLoading(true);
    setItems([]);
    setError(null);
    setVisibleCount(10);

    try {
      const endpoint = site === "rakuten" 
        ? `/rakuten?keyword=${encodeURIComponent(productName)}&hits=30`
        : `/yahoo/search?query=${encodeURIComponent(productName)}`;

      const url = `${API_BASE_URL}${endpoint}`;
      
      // authFetch を使用 (ヘッダー付与・401ハンドリングを自動化)
      const res = await authFetch(url, {
        method: "GET"
      });

      // authFetch が null を返した場合は処理中断 (リダイレクト済み)
      if (!res) return;

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      const data = await res.json();
      let parsedItems = [];

      // レスポンスの正規化
      if (site === "rakuten") {
        if (data.Items && Array.isArray(data.Items)) {
          parsedItems = data.Items.map((wrapper, idx) => {
            const item = wrapper.Item;
            return {
              id: `rakuten-${item.itemCode || idx}`,
              name: item.itemName,
              price: item.itemPrice,
              shop: item.shopName,
              url: item.itemUrl,
              image: item.mediumImageUrls?.[0]?.imageUrl || null
            };
          });
        }
      }
      else {
        const hitList = data.hits || [];
        parsedItems = hitList.map((item, idx) => ({
          id: `yahoo-${item.code || idx}`,
          name: item.name,
          price: parseInt(item.price, 10) || 0,
          shop: item.seller?.name || "",
          url: item.url,
          image: item.image?.medium || null
        }));
      }

      setItems(parsedItems);

    }
    catch (err) {
      console.error("Fetch error:", err);
      setError("データの取得に失敗しました。");
    }
    finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  // --- ヘッダーコンテンツ ---
  const headerContent = (
    <div className={styles.headerInner}>
      <button 
        onClick={() => navigate('/notification')} 
        className={styles.backButton}>
        <ChevronLeft size={24} />
      </button>
      
      <h2 className={styles.headerTitle}>相場価格</h2>
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div className={styles.container}>
          
          {/* 検索ワード表示エリア */}
          <div className={styles.searchInfo}>
            <span className={styles.searchLabel}>検索商品</span>
            <h1 className={styles.productName}>{productName}</h1>
          </div>

          {/* サイト切り替えタブ */}
          <div className={styles.tabContainer}>
            <button
              className={`${styles.tabButton} ${site === "rakuten" ? styles.tabRakuten : ""}`}
              onClick={() => setSite("rakuten")}>
              <span className={styles.siteIcon}>R</span> 楽天
            </button>
            
            <div className={styles.switchIcon}>
              <ArrowRightLeft size={18} color="#9ca3af" />
            </div>

            <button
              className={`${styles.tabButton} ${site === "yahoo" ? styles.tabYahoo : ""}`}
              onClick={() => setSite("yahoo")}>
              <span className={styles.siteIcon}>Y!</span> Yahoo
            </button>
          </div>

          {/* ローディング */}
          {loading && (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spinner} size={32} />
              <p>価格情報を検索中...</p>
            </div>
          )}

          {/* エラー */}
          {error && <div className={styles.errorMsg}>{error}</div>}

          {/* 結果リスト */}
          {!loading && !error && (
            <>
              {items.length === 0 ? (
                <div className={styles.emptyState}>
                  <ShoppingBag size={48} color="#d1d5db" />
                  <p>該当する商品が見つかりませんでした。</p>
                </div>
              ) : (
                <>
                  <div className={styles.grid}>
                    {items.slice(0, visibleCount).map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.card}>
                        <div className={styles.imageArea}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} className={styles.productImage} />
                          ) : (
                            <div className={styles.noImage}>No Image</div>
                          )}
                        </div>
                        
                        <div className={styles.cardBody}>
                          <h3 className={styles.cardTitle}>{item.name}</h3>
                          
                          <div className={styles.priceArea}>
                            <span className={styles.yenMark}>¥</span>
                            <span className={styles.priceValue}>{item.price.toLocaleString()}</span>
                          </div>
                          
                          <div className={styles.shopInfo}>
                            <span className={styles.shopName}>{item.shop}</span>
                          </div>
                          
                          <div className={styles.linkText}>
                            サイトで見る <ExternalLink size={12} />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>

                  {visibleCount < items.length && (
                    <button className={styles.loadMoreBtn} onClick={loadMore}>
                      さらに表示
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      }
    />
  );
};

export default PriceInfo;