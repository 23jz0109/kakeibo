// src/pages/Statistics/Statistics.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/common/Layout";
import TabButton from "../../components/common/TabButton";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import styles from "./Statistics.module.css";

const Statistics = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("statistics");
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

  // 日付フォーマット関数 *
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // 初期値: 過去7日間 (開始日=6日前, 終了日=今日)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return formatDate(d);
  });

  const [endDate, setEndDate] = useState(formatDate(new Date()));

  // カレンダーコンポーネント
  const CalendarComponent = ({ dateStr, onSelect }) => {
    const dateObj = new Date(dateStr);
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(
      new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
    );
    const pickerRef = useRef(null);

    // カレンダー外クリックで閉じる
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (pickerRef.current && !pickerRef.current.contains(e.target)) {
          setShowCalendar(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 表示用日付フォーマット
    const displayDate = (d) => {
      const w = ["日", "月", "火", "水", "木", "金", "土"];
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} (${w[d.getDay()]})`;
    };

    const changeMonth = (delta) => {
      const m = new Date(currentMonth);
      m.setMonth(m.getMonth() + delta);
      setCurrentMonth(m);
    };

    const selectDate = (d) => {
      onSelect(formatDate(d));
      setShowCalendar(false);
    };

    // カレンダーの日付生成
    const days = (() => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const arr = Array(firstDay).fill(null);
      for (let i = 1; i <= daysInMonth; i++) {
        arr.push(new Date(year, month, i));
      }
      return arr;
    })();

    // カレンダー生成
    return (
      <div ref={pickerRef} className={styles.datePickerContainer}>
        <button
          className={styles.dateDisplayButton}
          onClick={() => setShowCalendar(!showCalendar)}
        >
          {displayDate(dateObj)}
        </button>

        {showCalendar && (
          <div className={styles.calendarDropdown}>
            <div className={styles.calendarHeader}>
              <button className={styles.navButton} onClick={() => changeMonth(-1)}>
                <ChevronLeft size={20} />
              </button>
              <span>
                {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
              </span>
              <button className={styles.navButton} onClick={() => changeMonth(1)}>
                <ChevronRight size={20} />
              </button>
            </div>

            <div className={styles.calendarGrid}>
              {days.map((d, i) =>
                d ? (
                  <button 
                    key={i} 
                    className={`${styles.dayButton} ${formatDate(d) === dateStr ? styles.selected : ''}`}
                    onClick={() => selectDate(d)}>
                    {d.getDate()}
                  </button>
                ) : (
                  <div key={i} />
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // CSVダウンロード処理
  const handleDownload = async () => {
    // ログイン情報確認
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    // ログイン情報なし = ログインまで追い出す
    if (!token) {
      alert("ログインセッションが切れました。再ログインしてください。");
      navigate("/login");
      return;
    }

    // ローディングを挟む
    setIsLoading(true);

    // DB通信
    try {
      const res = await fetch(`${API_BASE_URL}/statistical-data/download`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-StartDate": startDate,
          "X-EndDate": endDate,
        },
      });

      // エラーレスポンスのJSONを取得
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${res.status}`);
      }

      // ファイルダウンロード処理
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statistical_data_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
    catch (error) {
      console.error("ダウンロードエラー:", error);
      alert(`ダウンロードに失敗しました: ${error.message}`);
    }
    finally {
      setIsLoading(false);
    }
  };

  // タブ設定
  // マイページに戻れるようにタブを設定（またはStatistics単独でもOK）
  const handleTabChange = (tabId) => {
    if (tabId === "mypage") {
      navigate("/mypage");
    } else {
      setActiveTab(tabId);
    }
  };

  // タブの詳細
  const tabs = [
    { 
      id: "mypage", 
      label: "マイページ",
      icon: <ChevronLeft size={18} /> 
    },
    { 
      id: "statistics", 
      label: "統計データ" 
    }
  ];

  // 画面生成
  return (
    <Layout
      headerContent={
        <TabButton
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      }
      mainContent={
        <div className={styles.container}>
          <div className={styles.card}>
            <h2 className={styles.title}>CSVダウンロード</h2>
            <div className={styles.divider}></div>
            
            <div className={styles.periodGrid}>
              <div>
                <div className={styles.periodLabel}>開始日</div>
                <CalendarComponent 
                  dateStr={startDate} 
                  onSelect={setStartDate} 
                />
              </div>
              
              <div>
                <div className={styles.periodLabel}>終了日</div>
                <CalendarComponent 
                  dateStr={endDate} 
                  onSelect={setEndDate} 
                />
              </div>
            </div>

            <button 
              className={styles.downloadButton} 
              onClick={handleDownload}
              disabled={isLoading}
            >
              <Download size={20} />
              {isLoading ? "ダウンロード中..." : "CSVをダウンロード"}
            </button>
          </div>
        </div>
      }
    />
  );
};

export default Statistics;