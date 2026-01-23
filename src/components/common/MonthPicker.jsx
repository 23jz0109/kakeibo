import { useEffect, useMemo, useState } from "react";
import styles from "./MonthPicker.module.css";
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useRef } from "react";

const MonthPicker = ({ selectedMonth, onMonthChange, onMonthSelect, maxDate, isDisabled = false}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMonth, setModalMonth] = useState(() => new Date(selectedMonth));

  const modalRef = useRef(null);
  const toggleButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutSide = (event) => {
      if(
        modalRef.current && 
        !modalRef.current.contains(event.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        setIsModalOpen(false);
      }
    };

    if(isModalOpen) {
      document.addEventListener("mousedown", handleClickOutSide);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutSide);
    };
  }, [isModalOpen]);

  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  };

  /* 渡された日付が今日より未来かどうかを判定 */
  const isFutureMonth = (date) => {
    if(!maxDate) return false;
    const targetDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const maxDateStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    return targetDate > maxDateStart;
  }
  
  /* 「次へ」ボタンを無効化すべきか判定 */
  const isNextDisabled = useMemo(() => {
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return isFutureMonth(nextMonth);
  }, [selectedMonth, maxDate]);

  const handleChangeMonth = (offset) => {
    if (isDisabled) return;
    if (offset > 0 && isNextDisabled) return;
    onMonthChange(offset);
  }

  const handleSelectMonth = (monthIndex) => {
    if (isDisabled) return;
    const year = modalMonth.getFullYear();
    onMonthSelect(year, monthIndex);
    setIsModalOpen(false);
  };

  const isSelectedMonth = (monthIndex) => {
    return (
      modalMonth.getFullYear() === selectedMonth.getFullYear() &&
      monthIndex === selectedMonth.getMonth()
    );
  }

  const isNextYearDisabled = useMemo(() => {
    if(!maxDate) return false;
    return modalMonth.getFullYear() >= maxDate.getFullYear();
  }, [modalMonth, maxDate]);

  const changeYear = (offset) => {
    if(offset > 0 && isNextYearDisabled) return;

    const newYear = new Date(modalMonth);
    newYear.setFullYear(newYear.getFullYear() + offset);
    setModalMonth(newYear);
  };

  const toggleModal = () => {
    if (isDisabled) return;
    setIsModalOpen(prev => !prev);
  };

  return(
    <div className={styles["month-picker-container"]}>

      <div 
        className={`${styles["month-picker-display"]} ${isDisabled ? styles["disabled"] : ""}`}
      >
        <button
          type="button"
          onClick={() => handleChangeMonth(-1)}
          className={styles["btn-navigate"]}
        >
          <ChevronLeft size={20}/>
        </button>

        <button
          type="button"
          ref={toggleButtonRef}
          onClick={toggleModal}
          className={styles["month-picker-button"]}
        >
          {formatDate(selectedMonth)}
        </button>

        <button
          type="button"
          onClick={() => handleChangeMonth(1)}
          className={`
            ${styles["btn-navigate"]}
            ${isNextDisabled ? styles["navigate-disabled"] : ""}
          `} 
          disabled={isNextDisabled}
        >
          <ChevronRight size={20}/>
        </button>
      </div>

      {/* 日付をクリックしたときに展開されるモーダル */}
      <div ref={modalRef} className={`${styles["modal-container"]} ${isModalOpen ? styles["open"] : ""}`}>
        <div className={styles["modal-header"]}>
          <div className={styles["modal-year-navigation"]}>
            <button onClick={() => changeYear(-1)} className={styles["modal-month-navigate"]}><ChevronLeft size={20}/></button>
            <button className={styles["modal-year"]}>{modalMonth.getFullYear()}年</button>
            <button onClick={() => changeYear(1)} 
              className={`
                ${styles["modal-month-navigate"]}
                ${isNextYearDisabled ? styles["navigate-disabled"] : ""}
              `}
              disabled={isNextYearDisabled}
            >
              <ChevronRight size={20}/>
            </button>
          </div>
          <button type="button" className={styles["modal-close-button"]} onClick={toggleModal}>
            <X size={20}/>
          </button>
        </div>
        <div className={styles["modal-month-grid"]}>
          {months.map((month, index) => {
            const targetDateInModal = new Date(modalMonth.getFullYear(), index, 1);
            const isDisabledMonth = isFutureMonth(targetDateInModal);
            return (
              <button
                key={index}
                onClick={() => !isDisabledMonth && handleSelectMonth(index)}
                className={`
                  ${styles["month-button"]} 
                  ${isSelectedMonth(index) ? styles["current-month"] : ""}
                  ${isDisabledMonth ? styles["month-disabled"] : ""}
                `}
                disabled={isDisabledMonth}
              >
                {month}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MonthPicker;