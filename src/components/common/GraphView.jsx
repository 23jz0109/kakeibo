import { Doughnut } from "react-chartjs-2";
import { Chart as Chartjs, ArcElement, Tooltip, Legend } from "chart.js";
import styles from "./GraphView.module.css";
import { useEffect, useRef } from "react";

Chartjs.register(ArcElement, Tooltip, Legend);

const GraphView = ({ summary }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.reset();
      chartRef.current.update();
    }
  }, [summary]);

  // ★修正: 新APIのキー名に対応
  // API: { CATEGORY_NAME, CATEGORY_COLOR, total_amount, ... }
  const chartData = {
    labels: summary.map((item) => item.CATEGORY_NAME),
    datasets: [{
      label: "合計金額",
      data: summary.map((item) => Number(item.total_amount)),
      backgroundColor: summary.map((item) => item.CATEGORY_COLOR),
      borderWidth: 0,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "45%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#222",
        bodyColor: "#fff",
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.parsed;
            const total = context.chart._metasets[context.datasetIndex].total;
            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ¥${value.toLocaleString()} (${percent}%)`;
          },
        },
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000,
    },
  };

  // 中央に文字を表示するプラグイン（変更なし）
  const segmentLabelPlugin = {
    id: "segmentLabels",
    afterDatasetsDraw: (chart) => {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const labels = chart.data.labels;
      if (meta.hidden) return;

      ctx.save();
      ctx.font = "400 0.75rem 'Noto Sans JP', sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      meta.data.forEach((element, index) => {
        if (!element.hidden && !isNaN(element.x) && !isNaN(element.y)) {
            const { x, y } = element.tooltipPosition();
            const label = labels[index];
            ctx.fillText(label, x, y);
        }
      });
      ctx.restore();
    },
  };
  
  return (
    <div className={styles.graphContainer}>
      {summary && summary.length > 0 ? (
        <div style={{ position: "relative", height: "300px", width: "100%" }}>
           <Doughnut
            ref={chartRef}
            data={chartData}
            options={options}
            plugins={[segmentLabelPlugin]}
          />
        </div>
      ) : (
        <div className={styles["empty-state"]}>
          <p>データがありません</p>
        </div>
      )} 
    </div>
  );
}

export default GraphView;