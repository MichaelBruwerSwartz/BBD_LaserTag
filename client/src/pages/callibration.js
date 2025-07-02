import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@mediapipe/pose";

const colorMap = {
  red: "#FF8A9A", // Lighter Laser Cherry
  orange: "#FFB74D", // Softer Amber Neon
  yellow: "#FFE082", // Muted Amber Spark
  green: "#C5E1A5", // Softer Acid Green
  blue: "#90CAF9", // Lighter Laser Azure
  pink: "#F8BBD0", // Softer Bubblegum Light
  purple: "#CE93D8", // Muted Plasma Purple
};

const PoseColorCalibration = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const animationIdRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const [detector, setDetector] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [capturedColor, setCapturedColor] = useState(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState(null);
  const [capturedPose, setCapturedPose] = useState(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [username, setUsername] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [players, setPlayers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [errorMessage, setErrorMessage] = useState("");
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  
  const { state } = useLocation();
  const { gameCode } = state || {};
  const navigate = useNavigate();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize camera and pose detector
  useEffect(() => {
    let isMounted = true;

    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          
          return new Promise((resolve) => {
            videoRef.current.onloadedmetadata = () => {
              if (isMounted) resolve();
            };
          });
        }
      } catch (error) {
        console.error("Camera initialization failed:", error);
        setErrorMessage("Camera access denied or not available. Please allow camera permissions.");
      }
    };

    const loadDetector = async () => {
      try {
        const det = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );
        
        if (isMounted) {
          setDetector(det);
        }
      } catch (error) {
        console.error("Detector loading failed:", error);
        setErrorMessage("Failed to load pose detection. Please refresh and try again.");
      }
    };

    const setup = async () => {
      await initializeCamera();
      await loadDetector();
      
      if (isMounted) {
        setIsLoading(false);
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      // Clean up video stream
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // WebSocket connection for color conflict checking
  useEffect(() => {
    if (!gameCode) {
      console.warn("❌ No game code provided for color calibration");
      setErrorMessage("No game code provided. Please return to home and try again.");
      return;
    }

    function connectWebSocket() {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log("🔗 WebSocket already connected");
        return;
      }

      console.log(`🔄 Connecting to calibration WebSocket (attempt ${reconnectAttempts.current + 1})`);
      setConnectionStatus("connecting");

      // Connect without username/color for calibration phase
      const socket = new WebSocket(
        `wss://bbd-lasertag.onrender.com/session/${gameCode}?calibration=true`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("🔗 Calibration WebSocket connected");
        setConnectionStatus("connected");
        setErrorMessage("");
        reconnectAttempts.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 Calibration message received:", data);

          if (data.type === "playerListUpdate") {
            setPlayers(data.playerList || []);
          } else if (data.type === "colorCheckResult") {
            handleColorCheckResult(data);
          } else if (data.type === "joinSuccess") {
            console.log("✅ Successfully joined lobby");
            setIsJoiningLobby(false);
            // Navigate to PlayerLobby with the confirmed data
            navigate("/PlayerLobby", {
              state: {
                gameCode,
                username: data.username,
                color: data.color
              }
            });
          } else if (data.type === "error") {
            console.error("❌ Server error:", data.message);
            setErrorMessage(data.message);
            setIsJoiningLobby(false);
          }
        } catch (error) {
          console.error("❌ Error parsing calibration WebSocket message:", error);
        }
      };

      socket.onclose = (event) => {
        console.log(`🔌 Calibration WebSocket closed. Code: ${event.code}`);
        setConnectionStatus("disconnected");

        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`🔄 Reconnecting in ${delay}ms`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setErrorMessage("Connection lost. Please refresh the page and try again.");
        }
      };

      socket.onerror = (error) => {
        console.error("❌ Calibration WebSocket error:", error);
        setConnectionStatus("error");
      };
    }

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, "Calibration complete");
        socketRef.current = null;
      }
    };
  }, [gameCode, navigate]);

  // Start rendering loop when video is ready
  useEffect(() => {
    if (videoRef.current && canvasRef.current && detector && !isLoading) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        startRenderLoop();
      };

      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        startRenderLoop();
      }
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [detector, isLoading]);

  const getKeypoint = (keypoints, name) => {
    return keypoints.find((k) => k.name === name || k.part === name);
  };

  const getModeColorFromPoints = (ctx, p1, p2) => {
    const minX = Math.floor(Math.min(p1.x, p2.x));
    const minY = Math.floor(Math.min(p1.y, p2.y));
    const width = Math.floor(Math.abs(p1.x - p2.x));
    const height = Math.floor(Math.abs(p1.y - p2.y));

    if (width < 1 || height < 1) return "rgb(0, 255, 255)";

    const imgData = ctx.getImageData(minX, minY, width, height);
    const colorCount = new Map();

    for (let i = 0; i < imgData.data.length; i += 4) {
      const r = imgData.data[i];
      const g = imgData.data[i + 1];
      const b = imgData.data[i + 2];
      const key = `${r},${g},${b}`;
      colorCount.set(key, (colorCount.get(key) || 0) + 1);
    }

    let modeColor = "rgb(0, 255, 255)";
    let maxCount = 0;

    for (const [key, count] of colorCount.entries()) {
      if (count > maxCount) {
        maxCount = count;
        modeColor = `rgb(${key})`;
      }
    }

    return modeColor;
  };

  const getColorName = (rgbString) => {
    const cssColors = {
      "red": [255, 0, 0],
      "green": [0, 128, 0],
      "blue": [0, 0, 255],
      "yellow": [255, 255, 0],
      "purple": [128, 0, 128],
      "orange": [255, 165, 0],
      "pink": [255, 192, 203],
    };

    const [r, g, b] = rgbString.match(/\d+/g).map(Number);

    let closestName = "";
    let minDist = Infinity;

    for (const [name, [cr, cg, cb]] of Object.entries(cssColors)) {
      const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
      if (dist < minDist) {
        minDist = dist;
        closestName = name;
      }
    }

    return closestName;
  };

  const drawKeypoints = (ctx, keypoints) => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.5) {
        const { x, y } = keypoint;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "aqua";
        ctx.fill();
      }
    });
  };

  const drawTorsoBox = (ctx, keypoints) => {
    const ls = getKeypoint(keypoints, "left_shoulder");
    const rs = getKeypoint(keypoints, "right_shoulder");
    const lh = getKeypoint(keypoints, "left_hip");
    const rh = getKeypoint(keypoints, "right_hip");

    if (!ls || !rs || !lh || !rh) return;

    const points = [ls, rs, rh, lh];
    const modeColor = getModeColorFromPoints(ctx, ls, rs);
    const rgbaColor = modeColor.replace("rgb(", "rgba(").replace(")", ", 0.3)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = rgbaColor;
    ctx.fill();

    ctx.strokeStyle = modeColor;
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const startRenderLoop = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    const renderFrame = async () => {
      if (!video || !canvas || !detector) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const poses = await detector.estimatePoses(video);
        if (poses.length > 0) {
          const keypoints = poses[0].keypoints;
          drawTorsoBox(ctx, keypoints);
          drawKeypoints(ctx, keypoints);
          setCapturedPose(keypoints);
        }
      } catch (error) {
        console.error("Pose detection error:", error);
      }

      animationIdRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();
  };

  const handleCapture = async () => {
    if (!capturedPose) {
      setErrorMessage("No pose detected yet. Please stand in front of the camera and try again.");
      return;
    }

    if (connectionStatus !== "connected") {
      setErrorMessage("Not connected to server. Please wait for connection or refresh the page.");
      return;
    }

    setIsCapturing(true);
    setErrorMessage("");

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      const imageDataUrl = canvas.toDataURL();
      setCapturedImageDataUrl(imageDataUrl);

      const ls = getKeypoint(capturedPose, "left_shoulder");
      const rs = getKeypoint(capturedPose, "right_shoulder");

      if (!ls || !rs || ls.score < 0.5 || rs.score < 0.5) {
        setErrorMessage("Could not detect shoulders properly. Please face the camera directly and try again.");
        setIsCapturing(false);
        return;
      }

      const color = getModeColorFromPoints(ctx, ls, rs);
      const colorName = getColorName(color);
      
      setCapturedColor(color);
      
      // Check if color is already taken
      const isColorTaken = players.some(player => player.color === colorName);
      
      if (isColorTaken) {
        setErrorMessage(`The color "${colorName}" is already taken by another player. Please wear a different colored shirt and try again.`);
        setIsCapturing(false);
        return;
      }
      
      setShowNameInput(true);
    } catch (error) {
      console.error("Capture error:", error);
      setErrorMessage("Failed to capture pose. Please try again.");
    }
    
    setIsCapturing(false);
  };

  const handleColorCheckResult = (data) => {
    if (data.available) {
      setErrorMessage("");
    } else {
      setErrorMessage(`The color "${data.color}" is already taken. Please try a different colored shirt.`);
      setShowNameInput(false);
      setCapturedColor(null);
      setCapturedImageDataUrl(null);
    }
  };

  const handleSave = () => {
    if (!username.trim()) {
      setErrorMessage("Please enter your username.");
      return;
    }

    if (!capturedColor) {
      setErrorMessage("No color captured. Please capture your color first.");
      return;
    }

    if (connectionStatus !== "connected") {
      setErrorMessage("Not connected to server. Please wait or refresh the page.");
      return;
    }

    const colorName = getColorName(capturedColor);
    
    // Check again if username is taken
    const isUsernameTaken = players.some(player => player.username === username.trim());
    if (isUsernameTaken) {
      setErrorMessage("Username is already taken. Please choose a different username.");
      return;
    }

    setIsJoiningLobby(true);
    setErrorMessage("");

    // Send join request to server
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "joinLobby",
        gameCode,
        username: username.trim(),
        color: colorName
      }));
    } else {
      setErrorMessage("Connection lost. Please refresh the page.");
      setIsJoiningLobby(false);
    }
  };

  const returnCalibrationInformation = (username, color) => {
    console.log(`✅ Calibration complete - Username: ${username}, Color: ${color}`);
  };

  const goBack = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        background: "#1a1a1a",
        color: "white",
        minHeight: "100vh",
        justifyContent: "center"
      }}>
        <h2>Loading Pose Detection...</h2>
        <p>Please allow camera access and wait for the system to initialize.</p>
        <div style={{ marginTop: "1rem" }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "4px solid #333",
            borderTop: "4px solid #00ff88",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
        </div>
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      padding: "1rem",
      fontFamily: "Arial, sans-serif",
      background: "#1a1a1a",
      color: "white",
      minHeight: "100vh"
    }}>
      <h1 style={{ color: "#00ff88", marginBottom: "1rem" }}>
        🎯 Laser Tag Color Calibration
      </h1>
      
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        marginBottom: "1rem",
        gap: "1rem"
      }}>
        <span>Game Code: <strong style={{ color: "#00ff88" }}>{gameCode}</strong></span>
        <div style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: connectionStatus === "connected" ? "#00ff88" : 
                           connectionStatus === "connecting" ? "#ffaa00" : "#ff4444"
        }} />
        <span style={{ fontSize: "12px", color: "#ccc" }}>
          {connectionStatus === "connected" ? "Connected" : 
           connectionStatus === "connecting" ? "Connecting..." : "Disconnected"}
        </span>
      </div>
      
      {errorMessage && (
        <div style={{
          background: "#ff4444",
          color: "white",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1rem",
          textAlign: "center",
          maxWidth: "500px"
        }}>
          {errorMessage}
        </div>
      )}

      {players.length > 0 && (
        <div style={{
          background: "#2a2a2a",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1rem",
          maxWidth: "500px"
        }}>
          <h3 style={{ color: "#00ff88", marginBottom: "0.5rem" }}>Players in Lobby:</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {players.map(player => (
              <span key={player.username} style={{
                background: colorMap[player.color] || "#ddd",
                color: "#333",
                padding: "0.25rem 0.5rem",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold"
              }}>
                {player.username} ({player.color})
              </span>
            ))}
          </div>
        </div>
      )}
      
      <p style={{ textAlign: "center", marginBottom: "1rem", color: "#ccc" }}>
        Stand in front of the camera wearing your team color. 
        The system will detect your pose and calibrate your color.
      </p>

      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted
          style={{ display: "none" }}
        />
        <canvas 
          ref={canvasRef}
          style={{ 
            border: "2px solid #00ff88",
            borderRadius: "8px",
            maxWidth: "100%",
            height: "auto"
          }}
        />
      </div>

      <button
        onClick={handleCapture}
        disabled={isCapturing || !detector || connectionStatus !== "connected"}
        style={{
          padding: "12px 24px",
          fontSize: "18px",
          backgroundColor: (isCapturing || connectionStatus !== "connected") ? "#666" : "#00ff88",
          color: "#000",
          border: "none",
          borderRadius: "8px",
          cursor: (isCapturing || connectionStatus !== "connected") ? "not-allowed" : "pointer",
          marginBottom: "1rem",
          fontWeight: "bold"
        }}
      >
        {isCapturing ? "📸 Capturing..." : "📸 Capture Color"}
      </button>

      {showNameInput && (
        <div style={{
          background: "#2a2a2a",
          padding: "1.5rem",
          borderRadius: "8px",
          border: "1px solid #444",
          textAlign: "center"
        }}>
          <h3 style={{ color: "#00ff88", marginBottom: "1rem" }}>
            Color Captured Successfully!
          </h3>
          
          {capturedImageDataUrl && (
            <img 
              src={capturedImageDataUrl} 
              alt="Captured pose"
              style={{ 
                width: "200px", 
                borderRadius: "8px",
                marginBottom: "1rem",
                border: "2px solid #00ff88"
              }} 
            />
          )}
          
          {capturedColor && (
            <div style={{ marginBottom: "1rem" }}>
              <p>Detected Color:</p>
              <div style={{
                display: "inline-block",
                width: "40px",
                height: "40px",
                backgroundColor: capturedColor,
                border: "2px solid white",
                borderRadius: "4px",
                marginRight: "10px"
              }} />
              <span style={{ 
                color: "#00ff88",
                fontWeight: "bold",
                fontSize: "18px"
              }}>
                {getColorName(capturedColor)} ({capturedColor})
              </span>
            </div>
          )}
          
          <input 
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            style={{
              padding: "10px",
              fontSize: "16px",
              borderRadius: "4px",
              border: "1px solid #666",
              background: "#1a1a1a",
              color: "white",
              marginRight: "10px",
              width: "200px"
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            disabled={isJoiningLobby}
          />
          
          <button 
            onClick={handleSave}
            disabled={isJoiningLobby}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: isJoiningLobby ? "#666" : "#00ff88",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: isJoiningLobby ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            {isJoiningLobby ? "Joining..." : "Join Lobby"}
          </button>
        </div>
      )}

      <button
        onClick={goBack}
        style={{
          marginTop: "2rem",
          padding: "10px 20px",
          fontSize: "14px",
          backgroundColor: "#800080",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Back to Home
      </button>

      <div style={{ 
        marginTop: "2rem", 
        textAlign: "center", 
        color: "#888",
        fontSize: "14px"
      }}>
        <p>💡 Tips:</p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>• Face the camera directly</li>
          <li>• Wear a solid colored shirt</li>
          <li>• Ensure good lighting</li>
          <li>• Keep your arms visible</li>
          <li>• Choose a color not already taken</li>
        </ul>
      </div>
    </div>
  );
};

export default PoseColorCalibration;