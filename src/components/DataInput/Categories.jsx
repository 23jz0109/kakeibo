import React from "react";
import styles from "./Categories.module.css";
import { getIcon } from "../../constants/categories";

const Categories = ({ categories = [], selectedCategoryId, onSelectedCategory }) => {
  return (
    <div>
      <div className={styles["category-grid"]}>
        {categories.map((category) => {
          const isSelected = Number(category.id) === Number(selectedCategoryId);
          
          // アイコンコンポーネントを取得
          const IconComponent = getIcon(category.icon_name); // DBのカラム名に合わせて調整

          return (
            <button
              key={category.id}
              className={`${styles["category-button"]} ${isSelected ? styles["selected"] : ""}`}
              onClick={() => onSelectedCategory(category.id)}
            >
              <span className={styles["category-icon"]}
                style={{ backgroundColor: category.category_color || '#666' }}
              >
                <IconComponent size={20}/>
              </span>
              <span className={styles["category-name"]}>{category.category_name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Categories;