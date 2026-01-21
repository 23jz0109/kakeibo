import React, { useState, useMemo } from "react";
import Layout from "../../components/common/Layout";
import MonthPicker from "../../components/common/MonthPicker";
import CalendarView from "../../components/common/CalendarView";
import GraphView from "../../components/common/GraphView";
import { getIcon } from "../../constants/categories";
import { useGetRecord } from "../../hooks/history/useGetRecord";
import styles from "./History.module.css";

const History = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("graph");
  const [transactionType, setTransactionType] = useState("expense");

  const {
    isLoading,
    calendarDailySum,
    monthlyRecordList,
    graphCategorySum,
    refetch,
    getRecordDetail,
  } = useGetRecord(currentDate.getFullYear(), currentDate.getMonth());

  const handleRecordClick = async (recordId) => {
    try {
      const detailData = await getRecordDetail(recordId);
      console.log(
        "【詳細データ取得成功】",
        JSON.stringify(detailData, null, 2)
      );
    }
    catch (error) {
      console.error("詳細取得に失敗しました", error);
      alert("詳細データの取得に失敗しました。");
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
              isDisabled={isLoading} 
            />

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
                      {/* {filteredGraphData.length === 0 && (
                        <p className={styles.emptyText}>データがありません</p>
                      )} */}
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
                              const Icon = getIcon(r.icon_name);
                              const isIncome = Number(r.type_id) === 1;

                              return (
                                <div key={r.record_id} className={styles.listItem} onClick={() => handleRecordClick(r.record_id)}>
                                  <div className={styles.listItemLeft}>
                                    <span
                                      className={styles.categoryIcon}
                                      style={{ backgroundColor: r.category_color || "#ccc" }}>
                                      <Icon size={18} color="#fff" />
                                    </span>
                                    <div className={styles.recordInfo}>
                                      <span className={styles.record}>履歴{index + 1}</span>
                                      <span className={styles.shopName}>{r.shop_name}</span>
                                      <span className={styles.productNames}>{r.product_names}</span>
                                    </div>
                                  </div>
                                  <span className={`${styles.recordPrice} ${isIncome ? styles.textIncome : styles.textExpense}`}>
                                    ¥{Number(r.total_amount).toLocaleString()}
                                  </span>
                                </div>
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