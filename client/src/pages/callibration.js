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
  const [capturedColor, setCapturedColor] = useState(null);
  const [username, setUsername] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { gameCode } = location.state || {};

  useEffect(() => {
    let detectorInstance;

    async function init() {
      await tf.ready();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      const video = videoRef.current;
      video.srcObject = stream;

      await video.play();

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      detectorInstance = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );

      setDetector(detectorInstance);
      renderLoop(detectorInstance); // ✅ start scanning loop after everything is ready
    }

    init();

    const socket = new WebSocket(
      `wss://bbd-lasertag.onrender.com/session/${gameCode}/calibration`
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
              color: capturedColor,
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
      socket.close();
      if (detectorInstance?.dispose) detectorInstance.dispose();
    };
  }, [gameCode, navigate]);

  function getKeypoint(keypoints, name) {
    return keypoints.find((k) => k.name === name || k.part === name);
  }

  function getModeColorFromPoints(ctx, p1, p2) {
    const minX = Math.floor(Math.min(p1.x, p2.x));
    const minY = Math.floor(Math.min(p1.y, p2.y));
    const width = Math.floor(Math.abs(p1.x - p2.x));
    const height = Math.floor(Math.abs(p1.y - p2.y));

    if (width < 1 || height < 1) return "aqua";

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
  }

  async function renderLoop(detector) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    const draw = async () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const poses = await detector.estimatePoses(video);
      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        drawTorsoBox(ctx, keypoints);
        drawKeypoints(ctx, keypoints);
        setCapturedPose(keypoints);
      }

      requestAnimationFrame(draw);
    };

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
    const ctx = canvas.getContext("2d");

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
    setCapturedColor(modeColor);

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
    <div>
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        muted
        autoPlay
      ></video>
      <canvas ref={canvasRef}></canvas>

      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
