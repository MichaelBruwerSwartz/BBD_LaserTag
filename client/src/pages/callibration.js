import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@mediapipe/pose";
import { useNavigate, useLocation } from "react-router-dom";

export default function Calibration() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [capturedPose, setCapturedPose] = useState(null);
  const [username, setUsername] = useState("");
  const lastSentColorRef = useRef(null); // ✅ Ref to track last sent color

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
      renderLoop(detectorInstance);
    }

    init();
  }, []);

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

  // Map RGB to closest CSS color name (used for hit color detection)
  function getClosestColorName(rgbString) {
    const cssColors = {
      white: [255, 255, 255],
      black: [0, 0, 0],
      red: [255, 0, 0],
      orange: [255, 128, 0],
      yellow: [255, 255, 0],
      green: [0, 180, 0],
      blue: [0, 128, 255],
      purple: [128, 0, 255],
      pink: [255, 0, 255],
      aqua: [0, 255, 255],
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
    console.log(`cal RGB string: ${rgbString} | closest color: ${closestName}`);
    return closestName;
  }

  async function renderLoop(detector) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    async function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      await tf.engine().startScope();

      const poses = await detector.estimatePoses(video);
      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        drawTorsoBox(ctx, keypoints);
        drawKeypoints(ctx, keypoints);
        setCapturedPose(keypoints);
      }

      await tf.engine().endScope();
      requestAnimationFrame(draw);
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

    if (!modeColor || modeColor === "aqua") {
      alert("Color could not be captured. Try again.");
      return;
    }

    lastSentColorRef.current = modeColor; // ✅ save color in ref

    // Navigate to player lobby after successful color capture
    navigate("/player_lobby", {
      state: {
        color: getClosestColorName(lastSentColorRef.current),
        username,
        gameCode,
      },
    });
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
          onChange={(e) => setUsername(e.target.value.slice(0, 6))}
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
          disabled={!username.trim()}
          style={{
            padding: "0.75rem 2rem",
            fontSize: "1.1rem",
            backgroundColor: !username.trim() ? "#555" : "#0ea5e9",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: !username.trim() ? "not-allowed" : "pointer",
            transition: "background 0.3s",
            opacity: !username.trim() ? 0.6 : 1,
          }}
        >
          📸 Capture Pose
        </button>
      </div>
    </div>
  );
}
