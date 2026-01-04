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

  // カメラ起動処理
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
      setError(null);
    }
    // 起動失敗 
    catch (e) {
      console.error(e);
      setError("カメラを起動できませんでした。");
    }
  }, []);

  // カメラ停止処理
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // 初回マウント
  useEffect(() => {
    let isMounted = true;
    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [startCamera]);

  // 写真圧縮 + 解析処理
  const processImageFile = async (imageFile) => {
    try {
      // 解析中画面に切り替え
      setIsProcessing(true);
      setError(null);

      // カメラは停止
      stopCamera();

      // UI切り替え待ち
      await new Promise(resolve => setTimeout(resolve, 100));

      // 画像圧縮
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(imageFile, options);

      // アクセストークン確認
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (!token) throw new Error("ログインセッションが切れました。再度ログインしてください。");

      // 送信データ準備
      const formData = new FormData();
      formData.append("image", compressedFile);

      // サーバーに送る
      const response = await fetch(`${API_BASE_URL}/analyze-receipt`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
        body: formData,
      });

      // 失敗
      if (!response.ok) throw new Error("レシート解析に失敗しました。");
      
      // 結果待ち + 遷移
      const result = await response.json();
      navigate("/input/manual", { state: { ocrResult: result } });
    } 
    // 通信失敗
    catch (err) {
      console.error(err);
      setError(err.message);
      setIsProcessing(false);
      // startCamera();
    }
  };

  // 撮影ボタン動作
  const handleCapture = async () => {
    if (!videoRef.current) return;
    
    // キャプチャ→ファイル生成
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageFile = await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob], "captured_receipt.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.9);
    });

    // 共通処理へ
    processImageFile(imageFile);
  };


  // アップロードボタン動作
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // ファイル選択時
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = "";
  };

  // ヘッダー(CSSに移動)
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
          
          {/* エラーメッセージ */}
          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
              <button
                className={styles.retryButton}
                onClick={() => {
                  setError(null);
                  startCamera();
                }}>
                再試行
              </button>
            </div>
          )}

          {/* ローディング / カメラ */}
          {isProcessing ? (
            <div className={styles.analyzingOverlay}>
              <div className={styles.spinnerWrapper}>
                <Loader2 size={64} color="#3b82f6" />
              </div>
              <p className={styles.analyzingText}>解析中...</p>
              <p className={styles.warningText}>※ページを移動しないでください</p>
            </div>
          ) : 
          (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.videoElement}
            />
          )}

          {/* コントロールエリア */}
          {!isProcessing && (
            <div className={styles.controls}>
              
              {/* 撮影ボタン */}
              <button onClick={handleCapture} className={styles.captureButton}>
                <Camera size={32} color="#374151" />
              </button>

              {/* アップロードボタン */}
              <button onClick={handleUploadClick} className={styles.uploadButton}>
                <ImageIcon size={24} />
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className={styles.hiddenInput}
              />
            </div>
          )}
        </div>
      }
    />
  );
};

export default ExpenseOcrInput;