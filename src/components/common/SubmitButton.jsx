import styles from "./SubmitButton.module.css";

const SubmitButton = ({ text, onClick, disabled, ...restProps}) => {
  return (
    <button
      type="button"
      className={styles["submit-button"]}
      onClick={onClick}
      disabled={disabled}
      {...restProps}
    >
      {text || "送信"}
    </button>
  )
}

export default SubmitButton;