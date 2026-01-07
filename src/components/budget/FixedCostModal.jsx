import React, { useEffect, useState } from "react";
import styles from "./Modal.module.css";
import { useCategories } from "../../hooks/common/useCategories";

const FixedCostModal = ({ isOpen, onClose, initialData, rules, onSave, onDelete }) => {
  const { categories } = useCategories();
  const [typeId, setTypeId] = useState(2); // デフォルト支出
  
  const [formData, setFormData] = useState({
    type_id: 2,
    category_id: "",
    fixed_cost_rule_id: "",
    cost: "",
  });

  const filteredCategories = categories.filter(c => c.type_id === typeId);

  useEffect(() => {
    if (initialData) {
      setTypeId(initialData.type_id);
      setFormData({
        type_id: initialData.type_id,
        category_id: initialData.category_id || "",
        fixed_cost_rule_id: rules.find(r => r.RULE_NAME === initialData.rule_name)?.ID || initialData.fixed_cost_rule_id || "",
        cost: initialData.amount,
      });
    } else {
      setFormData({ type_id: 2, category_id: "", fixed_cost_rule_id: "", cost: "" });
      setTypeId(2);
    }
  }, [initialData, rules, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>{initialData ? "固定収支を編集" : "新しい固定収支"}</h2>
        <form onSubmit={handleSubmit}>
          
          <div className={styles.toggleGroup}>
            <button 
              type="button" 
              className={typeId === 2 ? styles.active : ""} 
              onClick={() => { setTypeId(2); setFormData({...formData, type_id: 2, category_id: ""}); }}
            >
              支出
            </button>
            <button 
              type="button" 
              className={typeId === 1 ? styles.active : ""}
              onClick={() => { setTypeId(1); setFormData({...formData, type_id: 1, category_id: ""}); }}
            >
              収入
            </button>
          </div>

          <div className={styles.formGroup}>
            <label>カテゴリ</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
            >
              <option value="">未選択</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>繰り返しルール</label>
            <select
              value={formData.fixed_cost_rule_id}
              onChange={(e) => setFormData({ ...formData, fixed_cost_rule_id: Number(e.target.value) })}
              required
            >
              <option value="">選択してください</option>
              {rules.map((rule) => (
                <option key={rule.ID} value={rule.ID}>
                  {rule.RULE_NAME_JP}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>金額</label>
            <input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
              required
              min="0"
            />
          </div>

          <div className={styles.actions}>
            {initialData && (
              <button type="button" className={styles.deleteBtn} onClick={() => onDelete(initialData.id)}>
                削除
              </button>
            )}
            <div className={styles.rightActions}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>キャンセル</button>
              <button type="submit" className={styles.saveBtn}>保存</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FixedCostModal;