import React from "react";
import styles from "./TabButton.module.css";

const TabButton = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className={styles["header-tabs"]}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles["tab-button"]} ${
            activeTab === tab.id ? styles["tab-active"] : ""
          }`}
          onClick={() => onTabChange(tab.id)}>
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabButton;