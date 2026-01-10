import styles from "./CalendarView.module.css";

const CalendarView = ({ dailySummary = [], currentMonth }) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // カレンダー生成ロジック
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);
  const startDay = firstDay.getDay();
  const dayInMonth = lastDay.getDate();
  const prevMonthDays = prevLastDay.getDate();

  const days = [];
  // 前月分
  for (let d = startDay - 1; d >= 0; d--) {
    days.push({ days: prevMonthDays - d, isCurrentMonth: false });
  }
  
  // 今月分
  for (let d = 1; d <= dayInMonth; d++) {
    days.push({ days: d, isCurrentMonth: true });
  }
  
  // 来月分 (マス埋め)
  const TOTAL_SLOTS = 42; 
  const currentCount = days.length;
  const remainingSlots = TOTAL_SLOTS - currentCount;

  for (let d = 1; d <= remainingSlots; d++) {
    days.push({ days: d, isCurrentMonth: false });
  }

  const dailyDataMap = dailySummary.reduce((acc, item) => {
    const date = item.record_date; 
    
    if (!acc[date]) {
      acc[date] = { expense: 0, income: 0 };
    }

    const amount = parseInt(item.daily_total, 10);

    // type_id: 1=収入, 2=支出 (DB定義に基づく)
    if (Number(item.type_id) === 1) {
      acc[date].income += amount;
    }
    else if (Number(item.type_id) === 2) {
      acc[date].expense += amount;
    }

    return acc;
  }, {});

  const calendarDays = days.map((day) => {
    if (day.isCurrentMonth) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day.days).padStart(2, "0")}`;
      const dayData = dailyDataMap[dateStr] || { expense: 0, income: 0 };
      
      return {
        ...day,
        expenseAmount: dayData.expense,
        incomeAmount: dayData.income,
      };
    }
    return { ...day, expenseAmount: 0, incomeAmount: 0 };
  });

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className={styles["calendar-container"]}>
      <div className={styles["weekdays"]}>
        {weekdays.map((day) => (
          <span className={styles["calendar-cell"]} key={day}>
            {day}
          </span>
        ))}
      </div>

      <div className={styles["days"]}>
        {calendarDays.map((item, index) => (
          <div
            key={index}
            className={`${styles["calendar-cell"]} ${styles["calendar-cell-day"]} ${
              item.isCurrentMonth ? styles["current-month-day"] : ""
            }`}>
            <span className={styles["day"]}>{item.days}</span>
            <div className={styles["calendar-cell-inner"]}>
              {item.incomeAmount > 0 && (
                <span 
                  className={styles["income"]} 
                  title={`収入: +${item.incomeAmount.toLocaleString()}円`}>
                  +{item.incomeAmount.toLocaleString()}
                </span>
              )}
              {item.expenseAmount > 0 && (
                <span 
                  className={styles["expense"]}
                  title={`支出: -${item.expenseAmount.toLocaleString()}円`}>
                  -{item.expenseAmount.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;