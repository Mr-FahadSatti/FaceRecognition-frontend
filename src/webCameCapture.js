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
  
  // New state for person name
  const [personName, setPersonName] = useState("");
  const [isTrainingMode, setIsTrainingMode] = useState(false);


  const url = process.env.SERVER_URL || "https://api.face.supersaasai.com";

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
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

  // Updated capture frames with name validation
  const captureFrames = async (count = 10, interval = 1000) => {
    if (!personName.trim()) {
      alert("Please enter a person's name before training!");
      return;
    }

    setIsCapturing(true);
    setIsTrainingMode(true);
    const capturedImages = [];

    for (let i = 0; i < count; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataURL = canvas.toDataURL("image/jpeg", 0.8);
      capturedImages.push(dataURL);
    }

    setImages(capturedImages);
    uploadImagesForTraining(capturedImages, personName.trim());
    setIsCapturing(false);
    setIsTrainingMode(false);
  };

  // Updated training upload with person name
  const uploadImagesForTraining = async (dataURLs, name) => {
    const formData = new FormData();
    
    // Add person name to form data
    formData.append("name", name);
    
    dataURLs.forEach((dataUrl, index) => {
      formData.append("images", dataURLtoBlob(dataUrl), `${name}_image${index + 1}.jpg`);
    });

    try {
      const response = await fetch(`${url}/upload-training-images`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Training response:", result);
      
      if (response.ok) {
        alert(`Training images for ${name} uploaded successfully!`);
        setPersonName(""); // Clear the name field after successful upload
      } else {
        alert(`Training failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload images.");
    }
  };

  // Rest of the methods remain the same...
  const takeSnapshotForModel = async () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg", 0.9);
    setResultImage(dataURL);
    sendImageToModel(dataURL);
  };

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
        <p><strong>Confidence:</strong> {modelResult.confidence ? `${(modelResult.confidence * 100).toFixed(1)}%` : 'N/A'}</p>
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

      {/* Training Section with Name Input */}
      <div style={{ 
        marginBottom: 20,
        padding: 15,
        backgroundColor: "#e8f5e8",
        borderRadius: 8,
        border: "1px solid #28a745"
      }}>
        <h4>🔧 Training Mode</h4>
        
        <div style={{ marginBottom: 15 }}>
          <label htmlFor="personName" style={{ 
            display: "block", 
            marginBottom: 5, 
            fontWeight: "bold" 
          }}>
            Person's Name:
          </label>
          <input
            id="personName"
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Enter person's full name"
            style={{
              padding: "8px 12px",
              fontSize: "16px",
              borderRadius: 4,
              border: "1px solid #ccc",
              width: "250px",
              marginBottom: 10
            }}
          />
          <small style={{ display: "block", color: "#666", marginBottom: 10 }}>
            This name will be used to identify the person during recognition
          </small>
        </div>
        
        <button 
          onClick={() => captureFrames(20, 1000)} 
          disabled={isCapturing || !personName.trim()}
          style={{ 
            padding: "10px 20px", 
            fontSize: "16px",
            backgroundColor: !personName.trim() ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 5,
            cursor: (!personName.trim() || isCapturing) ? "not-allowed" : "pointer"
          }}
        >
          {isCapturing ? "Capturing..." : `🎯 Train Model: Capture 20 Frames${personName ? ` for ${personName}` : ''}`}
        </button>
        
        {isTrainingMode && (
          <div style={{ marginTop: 10, color: "#666" }}>
            Training in progress... Look directly at the camera and move slightly between captures.
          </div>
        )}
      </div>

      {/* Recognition Section */}
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

      {/* <div style={{ marginBottom: 20 }}>
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
      </div> */}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Results Section */}
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
          
          {livenessResult && renderLivenessDetails(livenessResult)}
          {renderModelResult()}
        </div>
      )}

      {/* Training Images Display */}
      {images.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h4>📸 Training Images Captured for {personName}:</h4>
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
        <h5>ℹ️ How to Use:</h5>
        <ul style={{ textAlign: "left", maxWidth: 600, margin: "0 auto" }}>
          <li><strong>Training:</strong> Enter person's name, then capture 20 frames while looking at camera</li>
          <li><strong>Recognition:</strong> Use "Recognize Face" to identify trained persons</li>
          <li><strong>Liveness Detection:</strong> Prevents recognition from photos/screens</li>
          <li><strong>Multiple People:</strong> Train different people by changing the name field</li>
        </ul>
      </div>
    </div>
  );
};

export default MultiCapture;
