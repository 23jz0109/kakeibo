import React, { useState, useMemo, useRef, useEffect } from "react";
import Layout from "../../components/common/Layout";
import MonthPicker from "../../components/common/MonthPicker";
import CalendarView from "../../components/common/CalendarView";
import GraphView from "../../components/common/GraphView";
import { getIcon } from "../../constants/categories";
import { FolderInput, FolderOutput, Trash2 } from "lucide-react";
import { useGetRecord } from "../../hooks/history/useGetRecord";
import styles from "./History.module.css";

// スワイプ削除部分
const SwipeableItem = ({ children, onDelete, disabled, id, openSwipeId, setOpenSwipeId, onSwipeStart }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const isSwiping = useRef(false);
  const hasTriggeredSwipe = useRef(false);
  const deleteBtnWidth = 60; // 削除ボタンの幅(スワイプ量)

  // 他のアイテムが開かれたら、自分を閉じる監視処理
  useEffect(() => {
    if (openSwipeId !== id && offsetX !== 0 && !isSwiping.current) {
      setOffsetX(0);
    }
  }, [openSwipeId, id, offsetX]);

  const onTouchStart = (e) => {
    if (disabled) return;

    if (openSwipeId !== null && openSwipeId !== id) {
      setOpenSwipeId(null);
    }

    startX.current = e.touches[0].clientX;
    isSwiping.current = true;
    hasTriggeredSwipe.current = false;
  };

  const onTouchMove = (e) => {
    if (!isSwiping.current || disabled) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    if (Math.abs(diff) > 5 && !hasTriggeredSwipe.current) {
      hasTriggeredSwipe.current = true;
      if (onSwipeStart) {
        onSwipeStart();
      }
    }

    if (diff < 0 && diff > -deleteBtnWidth * 1.5) {
      setOffsetX(diff);
    }
    else if (diff >= 0) {
      setOffsetX(0);
    }
  };

  const onTouchEnd = () => {
    if (!isSwiping.current || disabled) return;
    isSwiping.current = false;

    if (offsetX < -(deleteBtnWidth / 2)) {
      setOffsetX(-deleteBtnWidth);
      setOpenSwipeId(id);
    }
    else {
      setOffsetX(0);
      if (openSwipeId === id) {
        setOpenSwipeId(null);
      }
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete();
    setOffsetX(0);
    setOpenSwipeId(null);
  };

  return (
    <div className={styles.swipeContainer}>
      <div className={styles.deleteLayer} onClick={handleDeleteClick}>
        <div className={styles.deleteIcon}>
          <Trash2 size={20}/>
        </div>
      </div>

      <div
        className={styles.swipeContent}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}>
        {children}
      </div>
    </div>
  );
};

// 履歴部分
const History = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("graph");
  const [transactionType, setTransactionType] = useState("expense");

  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [detailsCache, setDetailsCache] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  const [openSwipeId, setOpenSwipeId] = useState(null);

  const {
    isLoading,
    calendarDailySum,
    monthlyRecordList,
    graphCategorySum,
    refetch,
    getRecordDetail,
    deleteRecord,
  } = useGetRecord(currentDate.getFullYear(), currentDate.getMonth());

  const handleSwipeStart = () => {
    setExpandedRecordId(null);
  };

  // 削除ハンドラ
  const handleDeleteRecord = async (recordId) => {
    if (window.confirm("この記録を削除してもよろしいですか？")) {
      const success = await deleteRecord(recordId);
      if (success) {
        // 削除成功時、詳細キャッシュからも消す
        setDetailsCache((prev) => {
          const newCache = { ...prev };
          delete newCache[recordId];
          return newCache;
        });
      }
    }
  };

  // const handleRecordClick = async (recordId) => {
  //   try {
  //     const detailData = await getRecordDetail(recordId);
  //     console.log(
  //       "【詳細データ取得成功】",
  //       JSON.stringify(detailData, null, 2)
  //     );
  //   }
  //   catch (error) {
  //     console.error("詳細取得に失敗しました", error);
  //     alert("詳細データの取得に失敗しました。");
  //   }
  // };
  const handleRecordClick = async (recordId) => {
    // スワイプを閉じる
    setOpenSwipeId(null);

    if (openSwipeId === recordId) {
      setOpenSwipeId(null);
      return;
    }

    // 既に開いているなら閉じる
    if (expandedRecordId === recordId) {
      setExpandedRecordId(null);
      return;
    }

    // 開く
    setExpandedRecordId(recordId);

    // キャッシュにあればAPIを呼ばない
    if (detailsCache[recordId]) {
      return;
    }

    // API取得
    try {
      setLoadingDetailId(recordId);
      const detailData = await getRecordDetail(recordId);
      console.log(detailData);
      
      setDetailsCache((prev) => ({
        ...prev,
        [recordId]: detailData
      }));
    }
    catch (error) {
      console.error("詳細取得に失敗しました", error);
      setExpandedRecordId(null);
      alert("詳細データの取得に失敗しました。");
    }
    finally {
      setLoadingDetailId(null);
    }
  };


  // 集計ロジック
  const { totalIncome, totalExpense } = useMemo(() => {
    if (!monthlyRecordList) return { totalIncome: 0, totalExpense: 0 };

    return monthlyRecordList.reduce((acc, record) => {
      const amount = Number(record.total_amount);
      // type_id: 1=収入, 2=支出
      if (Number(record.type_id) === 1) {
        acc.totalIncome += amount;
      }
      else if (Number(record.type_id) === 2) {
        acc.totalExpense += amount;
      }
      return acc;
    }, { totalIncome: 0, totalExpense: 0 }
    );
  }, [monthlyRecordList]);

  // グラフデータ
  const filteredGraphData = useMemo(() => {
    if (!monthlyRecordList || !graphCategorySum) return [];

    // monthlyRecordListから「カテゴリ名 -> type_id」のマップを作る
    const categoryTypeMap = {};
    monthlyRecordList.forEach(r => {
      if (r.category) {
        categoryTypeMap[r.category] = Number(r.type_id);
      }
    });

    const targetTypeId = transactionType === "income" ? 1 : 2;

    return graphCategorySum.filter(item => {
      const typeId = categoryTypeMap[item.category_name];
      return typeId === targetTypeId;
    });
  }, [graphCategorySum, monthlyRecordList, transactionType]);

  // カレンダーの毎日詳細
  const groupedDailyRecords = useMemo(() => {
    if (!monthlyRecordList) return {};

    return monthlyRecordList.reduce((acc, record) => {
      const date = record.record_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {});
  }, [monthlyRecordList]);

  const sortedDates = Object.keys(groupedDailyRecords).sort((a, b) => b.localeCompare(a));

  const handleMonthChange = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const handleMonthSelect = (year, monthIndex) => {
    const newDate = new Date(year, monthIndex, 1);
    const today = new Date();
    if (newDate > today) return;

    setCurrentDate(newDate);
  };

  const handleTabChange = (tab) => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    refetch(); // 最新のデータを再取得
    setExpandedRecordId(null);
    setOpenSwipeId(null);
  };

  // ヘッダー
  const headerContent = (
    <div className={styles.headerContainer}>
      <h1 className={styles.headerTitle}>履歴</h1>
    </div>
  );

  // メインコンテンツ生成
  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div className={styles.mainContainer}>

          {/* タブ切り替えエリア */}
          <div className={styles.tab}>
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tabButton} ${activeTab === 'graph' ? styles.active : ''}`} 
                onClick={() => handleTabChange('graph')}>
                グラフ
              </button>

              <button
                className={`${styles.tabButton} ${activeTab === 'calendar' ? styles.active : ''}`} 
                onClick={() => handleTabChange('calendar')}>
                カレンダー
              </button>
            </div>

            {/* 月選択 */}
            <MonthPicker
              selectedMonth={currentDate}
              onMonthChange={handleMonthChange}
              onMonthSelect={handleMonthSelect}
              maxDate={new Date()}
              isDisabled={isLoading}/>

            {/* 収支サマリー */}
            <div className={styles.financeSummary}>
              <div className={`${styles.financeItem} ${styles.itemExpense}`}>
                <span className={styles.financeLabel}>支出</span>
                <span className={styles.financeValue}>¥{totalExpense.toLocaleString()}</span>
              </div>
              <div className={`${styles.financeItem} ${styles.itemIncome}`}>
                <span className={styles.financeLabel}>収入</span>
                <span className={styles.financeValue}>¥{totalIncome.toLocaleString()}</span>
              </div>
              <div className={`${styles.financeItem} ${styles.itemBalance}`}>
                <span className={styles.financeLabel}>収支</span>
                <span className={styles.financeValue}>
                  {totalIncome - totalExpense >= 0 ? "+" : "-"}¥
                  {Math.abs(totalIncome - totalExpense).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {activeTab === "graph" && (
            <div className={styles.graphWrapper}>
              {/* 収入/支出 切り替えスイッチ */}
              <div className={styles.switchContainer}>
                <button
                  className={`${styles.switchButton} ${transactionType === "expense" ? styles.active : ""}`}
                  onClick={() => setTransactionType("expense")}>
                  支出
                </button>
                <button
                  className={`${styles.switchButton} ${transactionType === "income" ? styles.active : ""}`}
                  onClick={() => setTransactionType("income")}>
                  収入
                </button>
              </div>
            </div>
          )}
          
          <div className={styles.scroll}>
            {/* グラフ/カレンダービュー */}
            {isLoading ? (
              <p className={styles["loading-text"]}>読み込み中...</p>
            ) : (
              <div className={styles.viewContainer}>

                {/* グラフ */}
                {activeTab === "graph" && (
                  <div className={styles.graphWrapper}>
                    <GraphView summary={filteredGraphData} />

                    {/* カテゴリ別リスト */}
                    <div className={styles.detailList}>
                      {filteredGraphData.map((cat, idx) => {
                        const Icon = getIcon(cat.icon_name);
                        return (
                          <div key={idx} className={styles.listItem}>
                            <div className={styles.listItemLeft}>
                              <span
                                className={styles.categoryIcon}
                                style={{ backgroundColor: cat.category_color || "#ccc" }}>
                                <Icon size={18} color="#fff" />
                              </span>
                              <span className={styles.categoryName}>{cat.category_name}</span>
                            </div>
                            <span className={styles.categoryPrice}>¥{Number(cat.total_amount).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}

                {/* カレンダー */}
                {activeTab === "calendar" && (
                  <div className={styles.calendarWrapper}>
                    <div className={styles.calendarContainer}>
                      <CalendarView
                        dailySummary={calendarDailySum}
                        currentMonth={currentDate}
                      />
                    </div>

                    {/* 日付別詳細リスト */}
                    <div className={`${styles.detailList} ${styles.scrollableDetailList}`}>

                      {sortedDates.map((dateStr) => {
                        const records = groupedDailyRecords[dateStr];
                        const dateObj = new Date(dateStr);
                        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

                        return (
                          <div key={dateStr} className={styles.dailyGroup}>
                            <div className={styles.dateHeader}>
                              {dateObj.getDate()}日 ({weekdays[dateObj.getDay()]})
                            </div>

                            {records.map((r, index) => {
                              const isIncome = Number(r.type_id) === 1;
                              const IconComponent = isIncome ? FolderInput : FolderOutput;
                              const iconBgColor = isIncome ? "#d1fae5" : "#fee2e2"; 
                              const iconColor = isIncome ? "#10b981" : "#ef4444";

                              const isExpanded = expandedRecordId === r.record_id;
                              const detailData = detailsCache[r.record_id];
                              const isDetailLoading = loadingDetailId === r.record_id;

                              return (
                                <SwipeableItem 
                                  key={r.record_id || index}
                                  id={r.record_id || index}
                                  openSwipeId={openSwipeId}
                                  setOpenSwipeId={setOpenSwipeId}
                                  onSwipeStart={handleSwipeStart}
                                  onDelete={() => handleDeleteRecord(r.record_id)}>
                                  <div
                                    key={r.record_id || index}
                                    className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}
                                    onClick={() => handleRecordClick(r.record_id)}>
                                    <div className={styles.cardHeader}>
                                      {/* アイコン */}
                                      <div className={styles.iconWrapper} style={{ backgroundColor: iconBgColor, color: iconColor }}>
                                        <IconComponent size={24} />
                                      </div>
                                      
                                      {/* タイトルとサブテキスト */}
                                      <div className={styles.cardContent}>
                                        <p className={styles.cardTitle}>
                                          {r.shop_name || (isIncome ? "臨時収入" : "店舗未登録")}
                                        </p>
                                        <div className={styles.infoText}>
                                          {r.product_names || "詳細なし"}
                                        </div>
                                      </div>

                                      {/* 金額 */}
                                      <span className={`${styles.amountBadge}`}>
                                        ¥{Number(r.total_amount).toLocaleString()}
                                      </span>
                                    </div>

                                    {/* 展開部分 */}
                                    {isExpanded && (
                                      <div className={styles.cardFooter}>
                                        {isDetailLoading ? (
                                          <div className={styles.detailLoading}>読み込み中...</div>
                                        ) : (
                                          <>
                                            {detailData?.receipts?.map((receipt, rIdx) => (
                                              <div key={rIdx} className={styles.receiptBlock}>                                           
                                                <div className={styles.productList}>
                                                  {receipt.products.map((p, pIdx) => {
                                                    const subTotal = p.product_price * p.quantity - (p.discount || 0);
                                                    return (
                                                      <div key={pIdx} className={styles.productRow}>
                                                        <div className={styles.productInfoLeft}>
                                                          <div className={styles.productName}>{p.product_name}</div>
                                                          <div className={styles.productMetaContainer}>
                                                            <span className={styles.productMeta}>
                                                              {p.quantity > 1 
                                                                ? `¥${Number(p.product_price).toLocaleString()} × ${p.quantity}` 
                                                                : `¥${Number(p.product_price).toLocaleString()}`
                                                              }
                                                            </span>
                                                            {p.discount > 0 && (
                                                              <span className={styles.discountLabel}> - ¥{p.discount}</span>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <div className={styles.productPrice}>¥{subTotal.toLocaleString()}</div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                                {receipt.memo && <div className={styles.memoBox}>メモ:<br/>{receipt.memo}</div>}
                                              </div>
                                            ))}
                                            {(!detailData || !detailData.receipts) && (
                                              <div className={styles.detailLoading}>詳細情報がありません</div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </SwipeableItem>
                              );
                            })}
                          </div>
                        );
                      })}
                      {sortedDates.length === 0 && (
                        <p className={styles.emptyText}>データがありません</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      }
    />
  );
};

export default History;