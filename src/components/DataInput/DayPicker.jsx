import React, { useEffect, useRef, useState } from "react";
import styles from "./DayPicker.module.css";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DayPicker = ({ date, onChange }) => {
  // 今日（時間情報をリセット）
  const getToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const today = getToday();

  const normalizeDate = (value) => {
    if (!value) return getToday();
    let d;
    if (value instanceof Date) {
      d = new Date(value);
    } else if (typeof value === "string") {
      const [y, m, day] = value.split("-");
      d = new Date(Number(y), Number(m) - 1, Number(day));
    } else {
      d = getToday();
    }
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [selectedDate, setSelectedDate] = useState(() => normalizeDate(date));
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = normalizeDate(date);
    d.setDate(1);
    return d;
  });
  
  const pickerRef = useRef(null);

  useEffect(() => {
    // setSelectedDate(normalizeDate(date));
    const d = normalizeDate(date);
    setSelectedDate(d);

    const newMonth = new Date(d);
    newMonth.setDate(1);
    setCurrentMonth(newMonth);
  }, [date]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const w = weekdays[date.getDay()];
    // モダンな表記に変更 (例: 2025.01.28 (水))
    return `${y}.${m}.${d} (${w})`;
  };

  const emitChange = (d) => {
    if (!onChange) return;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${day}`);
  };

  const changeDate = (diff) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + diff);
    
    // 未来の日付なら変更しない
    if (next > today) return;

    setSelectedDate(next);
    emitChange(next);
    
    const nextMonth = new Date(next);
    nextMonth.setDate(1);
    setCurrentMonth(nextMonth);
  };

  const selectDate = (d) => {
    if (d > today) return;

    setSelectedDate(d);
    setShowCalendar(false);
    emitChange(d);

    const newMonth = new Date(d);
    newMonth.setDate(1);
    setCurrentMonth(newMonth);
  };

  const changeMonth = (diff) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + diff);
    setCurrentMonth(next);
  };

  const generateCalendarDays = () => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDayOfWeek = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(new Date(y, m, i));
    return days;
  };

  const isNextDayDisabled = selectedDate.getTime() >= today.getTime();

  const getDateStatus = () => {
    const timeDiff = today.getTime() - selectedDate.getTime();
    const dayDiff = timeDiff / (1000 * 3600 * 24);

    if (dayDiff < 1) return "today";
    if (dayDiff < 7) return "recent";
    return "old";
  };
  const dateStatus = getDateStatus();

  return (
    <div ref={pickerRef} className={styles["date-picker-container"]}>
      {/* data-status属性でCSSを切り替える */}
      <div className={styles["date-picker-display"]} data-status={dateStatus}>
        <button className={styles["date-nav-button"]} onClick={() => changeDate(-1)}>
          <ChevronLeft size={18} />
        </button>
        
        <button 
          className={styles["date-display-button"]} 
          onClick={() => setShowCalendar((v) => !v)}
        >
          {formatDate(selectedDate)}
        </button>
        
        <button 
          className={styles["date-nav-button"]} 
          onClick={() => changeDate(1)}
          disabled={isNextDayDisabled}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {showCalendar && (
        <div className={styles["calendar-dropdown"]}>
          <div className={styles["calendar-header"]}>
            <button className={styles["month-nav-button"]} onClick={() => changeMonth(-1)}>
              <ChevronLeft size={18} />
            </button>
            <span className={styles["month-display"]}>
              {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
            </span>
            <button className={styles["month-nav-button"]} onClick={() => changeMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className={styles["weekday-header"]}>
            {weekdays.map((day, index) => (
              <div 
                key={index} 
                className={`${styles["weekday"]} ${
                  index === 0 ? styles["sunday"] : index === 6 ? styles["saturday"] : ""
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className={styles["calendar-grid"]}>
            {generateCalendarDays().map((d, i) => {
              if (!d) return <div key={i} className={styles["calendar-day-empty"]} />;

              const isFuture = d > today; 
              const isToday = d.getTime() === today.getTime();
              const isSelected = d.getTime() === selectedDate.getTime();
              const dayOfWeek = d.getDay();
              
              let dayClass = styles["calendar-day"];
              if (isFuture) {
                dayClass += ` ${styles["disabled"]}`;
              } else {
                if (dayOfWeek === 0) dayClass += ` ${styles["sunday"]}`;
                if (dayOfWeek === 6) dayClass += ` ${styles["saturday"]}`;
                if (isToday) dayClass += ` ${styles["today"]}`;
                if (isSelected) dayClass += ` ${styles["selected"]}`;
              }

              return (
                <button 
                  key={i} 
                  className={dayClass} 
                  onClick={() => selectDate(d)}
                  disabled={isFuture}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          
          <button 
             className={styles["today-button"]}
             onClick={() => selectDate(today)}
          >
            今日へ移動
          </button>
        </div>
      )}
    </div>
  );
};

export default DayPicker;