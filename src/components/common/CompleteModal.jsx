import { Check } from "lucide-react";
import styles from "./CompleteModal.module.css";

const CompleteModal = () => {
  return (
    <div className={styles["complete-modal"]}>
      <div className={styles["complete-container"]}>
        <span className={styles["complete-icon"]}><Check size={16}/></span>
        <p className={styles["complete-message"]}>登録が完了しました！</p>
      </div>
  </div>
  )
}

export default CompleteModal;