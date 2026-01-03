import Layout from "../../components/common/Layout";

const ExpenseManualInput = () => {
  return (
    <Layout
      headerContent={<h2>支出入力（確認用）</h2>}
      redirectPath="/history"
      mainContent={
        <div style={{ padding: "1rem" }}>
          <p>支出（手動）入力ページに遷移できました</p>
        </div>
      }
    />
  );
};

export default ExpenseManualInput;
