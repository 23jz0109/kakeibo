import React from "react";
import styles from "./BudgetList.module.css"; // 後述

const BudgetList = ({ budgets, onEdit }) => {
  if (!budgets || budgets.length === 0) {
    return <p className={styles.emptyState}>予算が設定されていません</p>;
  }

  return (
    <div className={styles.listContainer}>
      {budgets.map((item) => {
        // 進捗バーの色計算 (80%超えたら黄色、100%超えたら赤など)
        const isOver = item.usage_percent >= 100;
        const isWarning = !isOver && item.usage_percent >= 80;
        const barColor = isOver ? "#ff4d4f" : isWarning ? "#faad14" : item.category_color || "#1890ff";

        return (
          <div key={item.id} className={styles.card} onClick={() => onEdit(item)}>
            <div className={styles.header}>
              <span className={styles.categoryName} style={{ borderLeft: `4px solid ${item.category_color}` }}>
                {item.category_name}
              </span>
              <span className={styles.remaining}>残: ¥{Number(item.remaining).toLocaleString()}</span>
            </div>
            
            <div className={styles.details}>
              <span>{item.period_message}</span>
              <span>¥{Number(item.current_usage).toLocaleString()} / ¥{Number(item.budget_limit).toLocaleString()}</span>
            </div>

            <div className={styles.progressBarBg}>
              <div 
                className={styles.progressBarFill} 
                style={{ 
                  width: `${Math.min(item.usage_percent, 100)}%`, 
                  backgroundColor: barColor 
                }} 
              />
            </div>
            <div className={styles.percentText}>{item.usage_percent}%</div>
          </div>
        );
      })}
    </div>
  );
};

export default BudgetList;