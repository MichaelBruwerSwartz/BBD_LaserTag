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
  const [capturedColor, setCapturedColor] = useState(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState(null);
  const [name, setName] = useState("");
  const [entries, setEntries] = useState([]);

  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const location = useLocation();
  const { gameCode } = location.state || {};

  useEffect(() => {
    async function init() {
      await tf.setBackend("webgl"); // or 'cpu' if you want a fallback
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

      const loadedDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          runtime: "tfjs", // using TensorFlow.js runtime
        }
      );

      setDetector(loadedDetector);
      renderLoop(loadedDetector);
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

  function getColorName(rgbString) {
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

    setCapturedColor(getModeColorFromPoints(ctx, ls, rs));
    setCapturedImageDataUrl(canvas.toDataURL("image/png"));
  }

  function saveData() {
    if (!name || !capturedColor || !capturedImageDataUrl) return;
    const colorName = getColorName(capturedColor);
    setEntries((prev) => [
      ...prev,
      {
        name,
        image: capturedImageDataUrl,
        color: capturedColor,
        colorName,
      },
    ]);
    setName("");
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

      <div style={{ marginTop: "1rem" }}>
        <button onClick={capturePose}>Capture</button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
        />
        <button onClick={saveData}>Save</button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        {entries.map((entry, index) => (
          <div key={index} style={{ marginBottom: "1rem" }}>
            <img src={entry.image} alt="snapshot" width="150" />
            <br />
            <strong>{entry.name}</strong>
            <br />
            <span
              style={{
                display: "inline-block",
                width: "30px",
                height: "30px",
                background: entry.color,
                border: "1px solid white",
              }}
            ></span>
            {entry.colorName} ({entry.color})
          </div>
        ))}
      </div>
      <h1 style={{ marginBottom: "0.5rem", color: "#fff" }}>Enter Username:</h1>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        style={{
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          borderRadius: "5px",
          border: "none",
          marginBottom: "0.75rem",
          textAlign: "center",
          backgroundColor: "#333",
          color: "#fff",
          outline: "none",
        }}
      />
    </div>
  );
}
