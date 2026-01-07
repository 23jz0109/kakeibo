import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/common/Layout";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import styles from "./Statistics.module.css";

const Statistics = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

  // 日付フォーマット
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // 初期値（過去7日）
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(formatDate(new Date()));

  // カレンダーコンポーネント
  const CalendarComponent = ({
    dateStr,
    onSelect,
    minDate,
    maxDate,
  }) => {
    const dateObj = new Date(dateStr);
    const [showCalendar, setShowCalendar] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(
      new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
    );
    const pickerRef = useRef(null);

    // 外クリックで閉じる
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (pickerRef.current && !pickerRef.current.contains(e.target)) {
          setShowCalendar(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayDate = (d) => {
      const w = ["日", "月", "火", "水", "木", "金", "土"];
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} (${w[d.getDay()]})`;
    };

    const changeMonth = (delta) => {
      const m = new Date(currentMonth);
      m.setMonth(m.getMonth() + delta);
      setCurrentMonth(m);
    };

    const isDisabled = (d) => {
      const dStr = formatDate(d); 
      if (minDate && dStr < minDate) return true; 
      if (maxDate && dStr > maxDate) return true;
      return false;
    };

    const selectDate = (d) => {
      if (isDisabled(d)) return;
      onSelect(formatDate(d));
      setShowCalendar(false);
    };

    // 日付配列生成
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
              <button
                className={styles.navButton}
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <span>
                {currentMonth.getFullYear()}年{" "}
                {currentMonth.getMonth() + 1}月
              </span>
              <button
                className={styles.navButton}
                onClick={() => changeMonth(1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 曜日 */}
            <div className={styles.weekHeader}>
              {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            <div className={styles.calendarGrid}>
              {days.map((d, i) =>
                d ? (
                  <button
                    key={i}
                    className={`${styles.dayButton}
                    ${d.getDay() === 0 || d.getDay() === 6 ? styles.weekend : ""}
                    ${formatDate(d) === dateStr ? styles.selected : ""}
                    ${isDisabled(d) ? styles.disabled : ""}`}
                    onClick={() => selectDate(d)}
                    disabled={isDisabled(d)}
                  >
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

  // CSVダウンロード
  const handleDownload = async () => {
    const token =
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("authToken");

    if (!token) {
      alert("ログインセッションが切れました。再ログインしてください。");
      navigate("/login");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/statistical/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-StartDate": startDate,
            "X-EndDate": endDate,
          },
        }
      );

      if (!res.ok) {
        throw new Error("ダウンロードに失敗しました");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statistical_data_${startDate}_to_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ヘッダー
  const headerContent = (
    <div className={styles.headerContainer}>
      <button
        className={styles.backButton}
        onClick={() => navigate("/mypage")}
      >
        <ChevronLeft size={24} />
      </button>
      <h1 className={styles.headerTitle}>統計データ</h1>
    </div>
  );

  return (
    <Layout
      headerContent={headerContent}
      mainContent={
        <div className={styles.container}>
          <div className={styles.card}>
            <h2 className={styles.title}>CSVダウンロード</h2>
            <div className={styles.divider} />

            <div className={styles.periodGrid}>
              <div>
                <div className={styles.periodLabel}>開始日</div>
                <CalendarComponent
                  dateStr={startDate}
                  onSelect={setStartDate}
                  maxDate={endDate}
                />
              </div>

              <div>
                <div className={styles.periodLabel}>終了日</div>
                <CalendarComponent
                  dateStr={endDate}
                  onSelect={setEndDate}
                  minDate={startDate}
                  maxDate={formatDate(new Date())}
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
