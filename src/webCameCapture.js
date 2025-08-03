import React, { useEffect, useRef, useState } from "react";

const MultiCapture = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [images, setImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [modelResult, setModelResult] = useState("");
  const [livenessResult, setLivenessResult] = useState(null);
  const [isLivenessMode, setIsLivenessMode] = useState(false);

  const url = 'http://127.0.0.1:8000';

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 } // Higher frame rate for better liveness detection
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera Error:", err);
        alert("Camera access denied.");
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

      const dataURL = canvas.toDataURL("image/jpeg", 0.8); // Slightly compressed
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
      const response = await fetch(`${url}/upload-training-images`, {
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

  // 📸 Snap single image for model prediction WITH liveness check
  const takeSnapshotForModel = async () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg", 0.9); // High quality for liveness detection
    setResultImage(dataURL);
    sendImageToModel(dataURL);
  };

  // 🧪 Test liveness detection only
  const testLiveness = async () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg", 0.9);
    setResultImage(dataURL);

    const formData = new FormData();
    formData.append("image", dataURLtoBlob(dataURL), "liveness_test.jpg");

    try {
      const response = await fetch(`${url}/test-liveness`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setLivenessResult(result);
      console.log("Liveness result:", result);
    } catch (error) {
      console.error("Liveness test failed:", error);
      alert("Failed to test liveness.");
    }
  };

  // 📁 Upload image from gallery to model (this will likely fail liveness check)
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

  // 📤 Send image to model with liveness detection
  const sendImageToModel = async (dataUrl) => {
    const formData = new FormData();
    formData.append("image", dataURLtoBlob(dataUrl), "snapshot.jpg");

    try {
      const response = await fetch(`${url}/recognize`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setModelResult(result);
      } else {
        // Liveness check failed or other error
        setModelResult({
          error: result.error,
          liveness_details: result.liveness_details || null
        });
      }
      
      console.log("Model result:", result);
    } catch (error) {
      console.error("Prediction failed:", error);
      setModelResult({ error: "Network error occurred" });
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

  const renderLivenessDetails = (details) => {
    if (!details) return null;
    
    return (
      <div style={{ 
        backgroundColor: details.is_live ? "#d4edda" : "#f8d7da", 
        padding: 10, 
        borderRadius: 5, 
        margin: "10px 0",
        fontSize: "14px"
      }}>
        <h5>🔍 Liveness Detection Details:</h5>
        <p><strong>Score:</strong> {details.details?.score || 0}/{details.details?.max_score || 4}</p>
        <p><strong>Status:</strong> {details.is_live ? "✅ Live Face" : "❌ Fake/Photo Detected"}</p>
        {details.details?.reasons && (
          <ul style={{ textAlign: "left", margin: "5px 0" }}>
            {details.details.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderModelResult = () => {
    if (!modelResult) return null;
    
    if (modelResult.error) {
      return (
        <div style={{ backgroundColor: "#f8d7da", padding: 15, borderRadius: 5 }}>
          <h4>❌ Recognition Failed</h4>
          <p><strong>Error:</strong> {modelResult.error}</p>
          {modelResult.liveness_details && renderLivenessDetails({ 
            is_live: false, 
            details: modelResult.liveness_details 
          })}
        </div>
      );
    }
    
    return (
      <div style={{ backgroundColor: "#d4edda", padding: 15, borderRadius: 5 }}>
        <h4>🧠 Recognition Result</h4>
        <p><strong>Match:</strong> {modelResult.match ? "✅ Matched" : "❌ Not Matched"}</p>
        {modelResult.person && <p><strong>Person:</strong> {modelResult.person}</p>}
        <p><strong>Liveness Passed:</strong> ✅ Yes</p>
        <p><strong>Liveness Score:</strong> {modelResult.liveness_score}/4</p>
      </div>
    );
  };

  return (
    <div style={{ textAlign: "center", padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h2>📷 Advanced Face Recognition with Liveness Detection</h2>
      
      <div style={{ 
        border: "2px solid #007bff", 
        borderRadius: 10, 
        padding: 10, 
        backgroundColor: "#f8f9fa",
        marginBottom: 20
      }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          style={{ 
            width: "100%", 
            maxWidth: 600, 
            borderRadius: 8,
            backgroundColor: "#000"
          }} 
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <h4>🔧 Training Mode</h4>
        <button 
          onClick={() => captureFrames(20, 1000)} 
          disabled={isCapturing}
          style={{ 
            padding: "10px 20px", 
            fontSize: "16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: isCapturing ? "not-allowed" : "pointer"
          }}
        >
          {isCapturing ? "Capturing..." : "🎯 Train Model: Capture 20 Frames"}
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h4>🔍 Recognition Mode</h4>
        <button 
          onClick={takeSnapshotForModel} 
          style={{ 
            padding: "10px 20px", 
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: "pointer",
            marginRight: 10
          }}
        >
          📸 Recognize Face (Live Check)
        </button>
        
        <button 
          onClick={testLiveness} 
          style={{ 
            padding: "10px 20px", 
            fontSize: "16px",
            backgroundColor: "#ffc107",
            color: "black",
            border: "none",
            borderRadius: 5,
            cursor: "pointer"
          }}
        >
          🧪 Test Liveness Only
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h5>⚠️ Test with Photo Upload (Should Fail)</h5>
        <input
          type="file"
          accept="image/*"
          onChange={handleGalleryUpload}
          style={{ margin: "10px" }}
        />
        <small style={{ display: "block", color: "#6c757d" }}>
          Upload a photo to test if liveness detection blocks it
        </small>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Show captured image and results */}
      {resultImage && (
        <div style={{ marginTop: 30 }}>
          <h4>📷 Captured Image:</h4>
          <img 
            src={resultImage} 
            alt="Captured" 
            style={{ 
              width: 300, 
              border: "2px solid #ccc", 
              borderRadius: 8,
              marginBottom: 15
            }} 
          />
          
          {/* Show liveness test results */}
          {livenessResult && renderLivenessDetails(livenessResult)}
          
          {/* Show model recognition results */}
          {renderModelResult()}
        </div>
      )}

      {/* Show captured training images */}
      {images.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h4>📸 Training Images Captured:</h4>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5 }}>
            {images.map((img, i) => (
              <img 
                key={i} 
                src={img} 
                alt={`Training ${i}`} 
                style={{ 
                  width: 80, 
                  height: 80, 
                  objectFit: "cover",
                  border: "1px solid #ccc",
                  borderRadius: 4
                }} 
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ 
        marginTop: 30, 
        padding: 15, 
        backgroundColor: "#e9ecef", 
        borderRadius: 5,
        fontSize: "14px"
      }}>
        <h5>ℹ️ How Liveness Detection Works:</h5>
        <ul style={{ textAlign: "left", maxWidth: 600, margin: "0 auto" }}>
          <li><strong>Blur Analysis:</strong> Live video has natural motion blur</li>
          <li><strong>Texture Detection:</strong> Real skin vs screen/paper texture</li>
          <li><strong>Reflection Check:</strong> Screens often have glare/reflections</li>
          <li><strong>Color Analysis:</strong> Natural face colors vs artificial display</li>
        </ul>
      </div>
    </div>
  );
};

export default MultiCapture;