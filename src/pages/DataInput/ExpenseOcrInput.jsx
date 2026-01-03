import { useEffect, useRef, useState } from "react";
import Layout from "../../components/common/Layout";

const ExpenseOcrInput = () => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        videoRef.current.srcObject = stream;
      } catch (e) {
        setError("カメラを起動できませんでした");
        console.error(e);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <Layout
      headerContent={<h2>OCR撮影(確認用)</h2>}
      redirectPath="/history"
      mainContent={
        <div style={{ padding: "1rem" }}>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", borderRadius: "8px" }}/>
        </div>
      }
    />
  );
};

export default ExpenseOcrInput;
