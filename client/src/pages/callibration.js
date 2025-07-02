import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@mediapipe/pose";
import { useNavigate, useLocation } from "react-router-dom";

export default function Calibration() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [capturedPose, setCapturedPose] = useState(null);
  const [username, setUsername] = useState("");
  const lastSentColorRef = useRef(null);
  
  // Add refs to control the render loop
  const isRunningRef = useRef(false);
  const animationFrameRef = useRef(null);
  const detectorRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { gameCode } = location.state || {};

  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        // Set TensorFlow backend explicitly
        await tf.ready();
        
        if (tf.getBackend() === 'webgpu') {
          console.log('🔄 WebGPU detected but may be unstable, falling back to WebGL');
          await tf.setBackend('webgl');
        }
        
        console.log(`🧠 TensorFlow.js backend: ${tf.getBackend()}`);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" } },
          audio: false,
        });

        if (!mounted) return; // Check if component is still mounted

        const video = videoRef.current;
        if (!video) return;
        
        video.srcObject = stream;
        await video.play();

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const detectorInstance = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );

        if (!mounted) {
          // If component unmounted during init, clean up
          if (detectorInstance?.dispose) detectorInstance.dispose();
          return;
        }

        detectorRef.current = detectorInstance;
        setDetector(detectorInstance);
        isRunningRef.current = true;
        renderLoop(detectorInstance);
      } catch (error) {
        console.error('❌ Error initializing camera/detector:', error);
      }
    }

    init();

    // WebSocket connection
    const socket = new WebSocket(
      `wss://bbd-lasertag.onrender.com/session/${gameCode}/check_color`
    );
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("🔗 WebSocket connected to calibration channel.");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Calibration socket received:", data);

        if (data.available) {
          navigate("/player_lobby", {
            state: {
              color: getClosestColorName(lastSentColorRef.current) ?? "unknown",
              username,
              gameCode,
            },
          });
        } else {
          alert("Colour already in use");
        }
      } catch (e) {
        console.error("Invalid message from server:", event.data);
      }
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket error in Calibration:", err);
    };

    socket.onclose = () => {
      console.log("🔌 Calibration WebSocket closed.");
    };

    return () => {
      console.log("🧹 Calibration cleanup starting...");
      mounted = false;
      isRunningRef.current = false;
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Close WebSocket
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "Component unmounting");
      }
      
      // Clean up detector with a small delay to ensure all operations complete
      setTimeout(() => {
        if (detectorRef.current?.dispose) {
          console.log("🧹 Disposing detector...");
          detectorRef.current.dispose();
          detectorRef.current = null;
        }
      }, 100);
    };
  }, [gameCode, username, navigate]);

  function getKeypoint(keypoints, name) {
    return keypoints.find((k) => k.name === name || k.part === name);
  }

  function getModeColorFromPoints(ctx, p1, p2) {
    const minX = Math.floor(Math.min(p1.x, p2.x));
    const minY = Math.floor(Math.min(p1.y, p2.y));
    const width = Math.floor(Math.abs(p1.x - p2.x));
    const height = Math.floor(Math.abs(p1.y - p2.y));

    if (width < 1 || height < 1) return "aqua";

    try {
      const imgData = ctx.getImageData(minX, minY, width, height);
      const colorCount = new Map();

      for (let i = 0; i < imgData.data.length; i += 4) {
        const r = imgData.data[i];
        const g = imgData.data[i + 1];
        const b = imgData.data[i + 2];
        const key = `${r},${g},${b}`;
        colorCount.set(key, (colorCount.get(key) || 0) + 1);
      }

      let modeColor = "aqua";
      let maxCount = 0;

      for (const [key, count] of colorCount.entries()) {
        if (count > maxCount) {
          maxCount = count;
          modeColor = `rgb(${key})`;
        }
      }

      return modeColor;
    } catch (error) {
      console.error("Error getting color from canvas:", error);
      return "aqua";
    }
  }

  function getClosestColorName(rgbString) {
    if (!rgbString) return "unknown";
    
    const cssColors = {
      red: [255, 0, 0],
      green: [0, 128, 0],
      blue: [0, 0, 255],
      yellow: [255, 255, 0],
      purple: [128, 0, 128],
      cyan: [0, 255, 255],
      orange: [255, 165, 0],
      pink: [255, 192, 203],
      lime: [0, 255, 0],
      navy: [0, 0, 128],
    };
    
    try {
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
    } catch (error) {
      console.error("Error parsing color:", error);
      return "unknown";
    }
  }

  async function renderLoop(detector) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !detector) return;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let lastPoseDetection = 0;
    const poseDetectionInterval = 100; // Detect poses every 100ms instead of every frame

    async function draw() {
      // Check if we should continue running
      if (!isRunningRef.current || !detectorRef.current) {
        return;
      }

      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const now = Date.now();
        
        // Only run pose detection at intervals to reduce tensor pressure
        if (now - lastPoseDetection > poseDetectionInterval) {
          const numTensorsBefore = tf.memory().numTensors;
          
          // Estimate poses
          const poses = await detector.estimatePoses(video);

          if (poses.length > 0) {
            const keypoints = poses[0].keypoints;
            drawTorsoBox(ctx, keypoints);
            drawKeypoints(ctx, keypoints);
            setCapturedPose(keypoints);
          }

          lastPoseDetection = now;
          
          // Monitor tensor usage
          const numTensorsAfter = tf.memory().numTensors;
          if (numTensorsAfter > numTensorsBefore + 5) { // Allow some variance
            console.log(`⚠️ Tensor count increased: ${numTensorsBefore} -> ${numTensorsAfter}`);
          }
        } else {
          // Just redraw the existing pose detection results
          if (capturedPose) {
            drawTorsoBox(ctx, capturedPose);
            drawKeypoints(ctx, capturedPose);
          }
        }

        // Schedule next frame only if still running
        if (isRunningRef.current) {
          animationFrameRef.current = requestAnimationFrame(draw);
        }
      } catch (error) {
        console.error("Error in render loop:", error);
        // Continue the loop even if there's an error, but with a delay
        if (isRunningRef.current) {
          setTimeout(() => {
            if (isRunningRef.current) {
              animationFrameRef.current = requestAnimationFrame(draw);
            }
          }, 100);
        }
      }
    }

    draw();
  }

  function drawKeypoints(ctx, keypoints) {
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.5) {
        const { x, y } = keypoint;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "aqua";
        ctx.fill();
      }
    });
  }

  function drawTorsoBox(ctx, keypoints) {
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
  }

  function capturePose() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!capturedPose) {
      alert("No pose detected yet. Try again.");
      return;
    }

    const ls = getKeypoint(capturedPose, "left_shoulder");
    const rs = getKeypoint(capturedPose, "right_shoulder");

    if (!ls || !rs || ls.score < 0.5 || rs.score < 0.5) {
      alert("Could not detect shoulders properly. Try again.");
      return;
    }

    const modeColor = getModeColorFromPoints(ctx, ls, rs);
    lastSentColorRef.current = modeColor;

    const message = {
      type: "calibration",
      username,
      gameCode,
      color: modeColor,
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      console.log("📤 Sent calibration data to server:", message);
    } else {
      alert("WebSocket is not connected.");
    }
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{ display: "none" }}
      />

      <canvas
        ref={canvasRef}
        style={{
          width: "100vw",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
          marginTop: "1rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: "2rem",
          pointerEvents: "auto",
        }}
      >
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          style={{
            padding: "0.75rem 1.25rem",
            fontSize: "1.2rem",
            borderRadius: "8px",
            border: "1px solid #ccc",
            backgroundColor: "#222",
            color: "#fff",
            marginBottom: "1rem",
            width: "250px",
            textAlign: "center",
          }}
        />

        <button
          onClick={capturePose}
          style={{
            padding: "0.75rem 2rem",
            fontSize: "1.1rem",
            backgroundColor: "#0ea5e9",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
        >
          📸 Capture Pose
        </button>
      </div>
    </div>
  );
}