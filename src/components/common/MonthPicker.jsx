import { useEffect, useState } from "react";
import styles from "./MonthPicker.module.css";
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useRef } from "react";

const MonthPicker = ({ selectedMonth, onMonthChange, onMonthSelect, isDisabled = false}) => {
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

  const handleChangeMonth = (offset) => {
    if (isDisabled) return;
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

  const changeYear = (year) => {
    const newYear = new Date(modalMonth);
    newYear.setFullYear(newYear.getFullYear() + year);
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
          className={styles["btn-navigate"]}
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
            <button onClick={() => changeYear(1)} className={styles["modal-month-navigate"]}><ChevronRight size={20}/></button>
          </div>
          <button type="button" className={styles["modal-close-button"]} onClick={toggleModal}>
            <X size={20}/>
          </button>
        </div>
        <div className={styles["modal-month-grid"]}>
          {months.map((month, index) => {
            return (
              <button
                key={index}
                onClick={() => handleSelectMonth(index)}
                className={`${styles["month-button"]} ${isSelectedMonth(index) ? styles["current-month"] : ""}`}
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