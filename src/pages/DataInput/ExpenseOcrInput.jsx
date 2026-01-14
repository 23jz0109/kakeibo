import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/common/Layout";
import imageCompression from "browser-image-compression";
import { Camera, Loader2, Image as ImageIcon } from "lucide-react";
import styles from "./ExpenseOcrInput.module.css";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

const ExpenseOcrInput = () => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const streamRef = useRef(null);

  // カメラ起動
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }, 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } 
    catch (e) {
      console.error(e);
      setError("カメラを起動できませんでした。権限設定等を確認してください。");
    }
  }, []);

  // カメラ停止
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // ライフサイクル管理 
  useEffect(() => {
    // 解析中+エラーも出ていない場合のみカメラを起動
    if (!isProcessing && !error) {
      startCamera();
    }
    // エラー発生時に停止
    return () => {
      stopCamera();
    };
  }, [startCamera, isProcessing, error]);

  // ビデオ参照の更新
  useEffect(() => {
    if (!isProcessing && !error && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isProcessing, error]);


  // 写真圧縮 + 解析
  const processImageFile = async (imageFile) => {
    try {
      setIsProcessing(true);
      setError(null);
      stopCamera();

      // UI切り替え待ち
      await new Promise(resolve => setTimeout(resolve, 100));

      // 画像圧縮
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(imageFile, options);

      // トークン確認
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (!token) throw new Error("ログインセッションが切れました。再度ログインしてください。");

      const formData = new FormData();
      formData.append("image", compressedFile);

      // API送信
      const response = await fetch(`${API_BASE_URL}/analyze-receipt`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
        body: formData,
      });

      if (!response.ok) throw new Error("通信エラーが発生しました。");
      
      const result = await response.json();

      // データ検証
      if (result.status === 'failure') {
         throw new Error(result.message || "解析に失敗しました。");
      }
      if (!result.data || !result.data.is_receipt || !result.data.receipts || result.data.receipts.length === 0) {
         throw new Error("レシートを認識できませんでした。\nもう一度撮影してください。");
      }

      // 成功時遷移
      navigate("/input/manual", { state: { ocrResult: result } });

    } catch (err) {
      console.error(err);
      setError(err.message);
      setIsProcessing(false); 
    }
  };

  // 撮影ハンドラ
  const handleCapture = async () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const imageFile = new File([blob], "captured_receipt.jpg", { type: "image/jpeg" });
        processImageFile(imageFile);
      }
    }, "image/jpeg", 0.9);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processImageFile(file);
    e.target.value = "";
  };

  // 再試行
  const handleRetry = () => {
    setError(null); 
  };

  const headerStyle = {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0
  };

  return (
    <Layout
      headerContent={<h1 style={headerStyle}>カメラ</h1>}
      mainContent={
        <div className={styles.container}>
          {error ? (
            <div className={styles.errorMessage}>
              <p style={{ whiteSpace: "pre-wrap" }}>{error}</p>
              <button
                className={styles.retryButton}
                onClick={handleRetry}>
                再試行
              </button>
            </div>
          ) : isProcessing ? (
            <div className={styles.analyzingOverlay}>
              <div className={styles.spinnerWrapper}>
                <Loader2 size={64} color="#3b82f6" />
              </div>
              <p className={styles.analyzingText}>解析中...</p>
              <p className={styles.warningText}>※ページを移動しないでください</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.videoElement}/>
              <div className={styles.controls}>
                <button onClick={handleCapture} className={styles.captureButton}>
                  <Camera size={32} color="#374151" />
                </button>
                <button onClick={handleUploadClick} className={styles.uploadButton}>
                  <ImageIcon size={24} />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className={styles.hiddenInput}/>
              </div>
            </>
          )}
        </div>
      }

      //データ解析中はヘッダーとフッターを非表示
      hideHeader={isProcessing}
      hideFooter={isProcessing}
    />
  );
};

export default ExpenseOcrInput;