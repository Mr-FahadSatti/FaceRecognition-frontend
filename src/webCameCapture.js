import React, { useEffect, useRef, useState } from "react";

const MultiCapture = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [images, setImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [modelResult, setModelResult] = useState("");

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera Error:", err);
        console.error("Camera access denied.");
      }
    };

    startCamera();
  }, []);

  // 🔄 For training: capture multiple frames
  const captureFrames = async (count = 10, interval = 1000) => {
    setIsCapturing(true);
    const capturedImages = [];

    for (let i = 0; i < count; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataURL = canvas.toDataURL("image/jpeg");
      capturedImages.push(dataURL);
    }

    setImages(capturedImages);
    uploadImagesForTraining(capturedImages);
    setIsCapturing(false);
  };

  // 📤 Training upload
  const uploadImagesForTraining = async (dataURLs) => {
    const formData = new FormData();
    dataURLs.forEach((dataUrl, index) => {
      formData.append("images", dataURLtoBlob(dataUrl), `image${index + 1}.jpg`);
    });

    try {
      const response = await fetch("http://192.168.1.18:8000/upload-batch", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Training response:", result);
      alert("Training images uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload images.");
    }
  };

  // 📸 Snap single image for model prediction
  const takeSnapshotForModel = async () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg");
    setResultImage(dataURL);
    sendImageToModel(dataURL);
  };

  // 📁 Upload image from gallery to model
  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataURL = reader.result;
      setResultImage(dataURL);
      sendImageToModel(dataURL);
    };
    reader.readAsDataURL(file);
  };

  // 📤 Send image to model
  const sendImageToModel = async (dataUrl) => {
    const formData = new FormData();
    formData.append("image", dataURLtoBlob(dataUrl), "snapshot.jpg");

    try {
      const response = await fetch("http://192.168.1.18:8000/predict", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setModelResult(result?.label || "No result returned");
    } catch (error) {
      console.error("Prediction failed:", error);
      alert("Failed to get model result.");
    }
  };

  const dataURLtoBlob = (dataUrl) => {
    const byteString = atob(dataUrl.split(",")[1]);
    const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
  };

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>📷 Camera Interface</h2>

      <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxWidth: 600 }} />

      <div style={{ marginTop: 20 }}>
        <button onClick={() => captureFrames(10, 1000)} disabled={isCapturing}>
          {isCapturing ? "Capturing..." : "Train Model: Capture 10 Frames"}
        </button>
        <button onClick={takeSnapshotForModel} style={{ marginLeft: 10 }}>
          Take Snapshot for Model
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <label htmlFor="galleryUpload">Or Upload Image for Model:</label>
        <input
          type="file"
          id="galleryUpload"
          accept="image/*"
          onChange={handleGalleryUpload}
          style={{ display: "block", margin: "10px auto" }}
        />
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Show model snapshot and result */}
      {resultImage && (
        <div style={{ marginTop: 20 }}>
          <h4>🧠 Model Input:</h4>
          <img src={resultImage} alt="Snapshot" style={{ width: 200 }} />
          <p><strong>Prediction Result:</strong> {modelResult}</p>
        </div>
      )}

      {/* Show captured training images */}
      {images.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>📸 Captured for Training:</h4>
          {images.map((img, i) => (
            <img key={i} src={img} alt={`Training ${i}`} style={{ width: 100, margin: 5 }} />
          ))}
        </div>
      )}
    </div>//
  );
};

export default MultiCapture;
