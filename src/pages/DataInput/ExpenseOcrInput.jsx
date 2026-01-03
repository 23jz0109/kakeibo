import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/common/Layout";
import imageCompression from "browser-image-compression";
import { Camera, Loader2 } from "lucide-react";

const API_BASE_URL = "https://t08.mydns.jp/kakeibo/public/api";

const ExpenseOcrInput = () => {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, 
        });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        if (isMounted) setError("カメラを起動できませんでした。");
      }
    };
    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    
    // ローディング
    setIsProcessing(true);
    setError(null);

    // set timeout
    setTimeout(async () => {
      try {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 画像取得後カメラ停止
        stopCamera();

        const imageFile = await new Promise((resolve) => {
          canvas.toBlob((blob) => {
            resolve(new File([blob], "receipt.jpg", { type: "image/jpeg" }));
          }, "image/jpeg", 0.9);
        });

        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressedFile = await imageCompression(imageFile, options);

        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
        if (!token) throw new Error("ログインしてください。");

        const formData = new FormData();
        formData.append("image", compressedFile);

        const response = await fetch(`${API_BASE_URL}/analyze-receipt`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
          body: formData,
        });

        if (!response.ok) throw new Error("解析に失敗しました");
        
        const result = await response.json();
        navigate("/input/manual", { state: { ocrResult: result } });

      } catch (err) {
        console.error(err);
        setError(err.message);
        setIsProcessing(false);
      }
    }, 100);
  };

  const headerStyle = {
    fontSize: "1.125rem", // 他のヘッダータイトルとおおよそ同じサイズ
    fontWeight: "600",
    color: "#1f2937",     // ダークグレー
    margin: 0
  };

  return (
    <Layout
      headerContent={<h1 style={headerStyle}>OCR撮影</h1>}
      // redirectPath="/history"
      mainContent={
        <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#000", overflow: "hidden" }}>
          
          {error && (
            <div style={{ position: "absolute", top: 10, left: 10, right: 10, backgroundColor: "rgba(255,0,0,0.8)", color: "#fff", padding: "10px", borderRadius: "5px", zIndex: 20 }}>
              {error}
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* ローディングオーバーレイ */}
          {isProcessing && (
            <div style={{
              position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.8)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 30
            }}>
              <div style={{ animation: "spin 1s linear infinite" }}>
                <Loader2 size={64} color="#fff" />
              </div>
              <p style={{ color: "white", marginTop: "20px", fontSize: "1.2rem" }}>解析中...</p>
            </div>
          )}

          {/* 撮影ボタン */}
          {!isProcessing && (
            <div style={{ position: "absolute", bottom: "30px", left: "0", width: "100%", display: "flex", justifyContent: "center", zIndex: 10 }}>
              <button
                onClick={handleCapture}
                style={{
                  width: "70px", height: "70px", borderRadius: "50%",
                  backgroundColor: "#fff", border: "4px solid #ccc",
                  display: "flex", justifyContent: "center", alignItems: "center",
                  cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                }}
              >
                <Camera size={32} color="#333" />
              </button>
            </div>
          )}
          
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      }
    />
  );
};

export default ExpenseOcrInput;