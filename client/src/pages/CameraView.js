/* global cv */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";

export default function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const logRef = useRef(null);
  const detectorRef = useRef(null);
  const [gunType, setGunType] = useState("pistol");
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const navigate = useNavigate();

  // Game state
  const [gameTimeString, setGameTimeString] = useState("00:00");
  const gunConfig = {
    pistol: { ammo: 5, reloadTime: 1000 },
    shotgun: { ammo: 2, reloadTime: 2000 },
    sniper: { ammo: 1, reloadTime: 3000 },
  };
  const [ammo, setAmmo] = useState(gunConfig["pistol"].ammo);
  const [isReloading, setIsReloading] = useState(false);

  // Extract URL state params
  const location = useLocation();
  const { username, gameCode, color } = location.state || {};

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const sortedPlayers = [...leaderboardData].sort(
    (a, b) => b.points - a.points
  );

  // WebSocket ref
  const socketRef = useRef(null);

  // Connect to WebSocket & listen for game updates
  useEffect(() => {
    console.log(username, gameCode, color);
    if (username == null || gameCode == null || color == null) {
      console.warn("Missing username, gameCode or color");
      return;
    }
    const socket = new WebSocket(
      `wss://bbd-lasertag.onrender.com/session/${gameCode}?username=${username}&color=${color}`
    );
    socketRef.current = socket;

    socket.onopen = () => console.log("Connected to WebSocket");
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "gameUpdate") {
        const { players, timeLeft } = data;
        setGameTimeString(
          `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
            timeLeft % 60
          ).padStart(2, "0")}`
        );
        setLeaderboardData(players);
        if (timeLeft === 0) {
          navigate("/player_leaderboard", { state: { players } });
        }
      }
    };
    socket.onclose = () => console.log("WebSocket closed");
    socket.onerror = (e) => console.error("WebSocket error", e);

    return () => socket.close();
  }, []);

  useEffect(() => {
    async function loadDetector() {
      // Set backend first (optional, but recommended)
      await tf.setBackend("webgl");
      await tf.ready();

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );

      detectorRef.current = detector;
    }
    loadDetector();
  }, []);

  useEffect(() => {
    let animationFrameId;

    async function detect() {
      try {
        if (videoRef.current && canvasRef.current && detectorRef.current) {
          await processVideoOnce(
            videoRef.current,
            canvasRef.current,
            detectorRef.current
          );
        }
      } catch (err) {
        console.error("Detect loop error:", err);
      }
      animationFrameId = requestAnimationFrame(detect);
    }

    detect();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Map RGB to closest CSS color name (used for hit color detection)
  function getClosestColorName(rgbString) {
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

  // Called when a hit is detected; sends hit info to server
  function hitDetected(targetColor, msg) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not open; hit not sent");
      return;
    }
    window.alert(`Hit the ${targetColor} ${msg}`);
    const hitPayload = {
      type: "hit",
      weapon: gunType,
      shape: msg,
      color: targetColor,
    };
    socketRef.current.send(JSON.stringify(hitPayload));
    if (logRef.current) {
      logRef.current.textContent = `Hit sent: ${targetColor} ${msg} with ${gunType}`;
    }
  }

  // Check if torso is centered and trigger hit detection
  function checkHit(canvas) {
    if (canvas.isPersonCentered) {
      const colorName = getClosestColorName(canvas.modeColor);
      hitDetected(colorName, "torso in center");
    } else {
      alert("Person is not centered. Try again.");
    }
  }

  // Process video frame once to detect pose & torso color
  async function processVideoOnce(video, canvas, detector) {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Draw current video frame
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);

    if (!detector) return;

    // Estimate pose(s)
    const poses = await detector.estimatePoses(video);
    if (poses.length === 0) return;

    const keypoints = poses[0].keypoints;

    // Helper to get a keypoint by name
    function getKeypoint(name) {
      return keypoints.find((k) => k.name === name || k.part === name);
    }

    // Get shoulder and hip points
    const ls = getKeypoint("left_shoulder");
    const rs = getKeypoint("right_shoulder");
    const lh = getKeypoint("left_hip");
    const rh = getKeypoint("right_hip");

    if (!ls || !rs || !lh || !rh) return;

    // Draw torso polygon connecting these four points
    const points = [ls, rs, rh, lh];

    // Draw filled torso polygon with translucent fill color
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    // Sample the mode color inside the rectangle formed by shoulders
    function getModeColorFromPoints(p1, p2) {
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

    const modeColor = getModeColorFromPoints(ls, rs);
    const rgbaColor = modeColor.replace("rgb(", "rgba(").replace(")", ", 0.3)");

    ctx.fillStyle = rgbaColor;
    ctx.fill();

    ctx.strokeStyle = modeColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw keypoints as small circles (only if score > 0.5)
    keypoints.forEach((kp) => {
      if (kp.score > 0.5) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "aqua";
        ctx.fill();
      }
    });

    // Draw a permanent red dot in center of canvas (reticle)
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();

    // Check if person is standing roughly centered:
    // We consider centered if centerX,centerY lies inside torso polygon (simple point-in-polygon)
    function pointInPolygon(point, vs) {
      let x = point[0],
        y = point[1];
      let inside = false;
      for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x,
          yi = vs[i].y;
        let xj = vs[j].x,
          yj = vs[j].y;

        let intersect =
          yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    }

    const isCentered = pointInPolygon([centerX, centerY], points);

    // Attach to canvas for external use (e.g., button click)
    canvas.isPersonCentered = isCentered;
    canvas.modeColor = modeColor;
  }

  // Shoot button handler
  const handleShoot = () => {
    if (isReloading) return;
    if (ammo <= 0) {
      reload();
      return;
    }
    setAmmo((a) => a - 1);
    if (navigator.vibrate) navigator.vibrate([75, 25, 75]);
    if (canvasRef.current) {
      checkHit(canvasRef.current);
    }
  };

  // Gun selection handler
  const selectGun = (type) => {
    setGunType(type);
    setAmmo(gunConfig[type].ammo);
    setIsReloading(false);
    setZoomEnabled(false);
    if (videoRef.current) {
      videoRef.current.style.transform =
        type === "sniper" ? "scale(3)" : "scale(1)";
      videoRef.current.style.transformOrigin = "center center";
    }
  };

  // Reload gun
  const reload = () => {
    if (isReloading) return;
    setIsReloading(true);
    setTimeout(() => {
      setAmmo(gunConfig[gunType].ammo);
      setIsReloading(false);
    }, gunConfig[gunType].reloadTime);
  };

  // Disable zoom gestures unless zoomEnabled
  useEffect(() => {
    if (zoomEnabled) return;

    const preventZoom = (e) => e.preventDefault();
    let lastTouch = 0;
    const doubleTapBlocker = (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    };

    document.addEventListener("gesturestart", preventZoom, { passive: false });
    document.addEventListener("dblclick", preventZoom, { passive: false });
    document.addEventListener("touchend", doubleTapBlocker, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventZoom);
      document.removeEventListener("dblclick", preventZoom);
      document.removeEventListener("touchend", doubleTapBlocker);
    };
  }, [zoomEnabled]);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert(`Camera access denied. Please allow permissions.\n\nError: ${err.message}`);
      }
    }
    startCamera();
  }, []);

  // Send camera frames periodically to server via WebSocket
  useEffect(() => {
    let intervalId;

    const sendFrames = () => {
      const video = videoRef.current;
      const socket = socketRef.current;
      if (!video || !socket) return;

      if (socket.readyState === WebSocket.OPEN) {
        intervalId = setInterval(() => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0);
          const frame = canvas.toDataURL("image/jpeg", 0.5);

          socket.send(
            JSON.stringify({
              type: "cameraFrame",
              username,
              frame,
            })
          );
        }, 100);
      } else {
        // Wait for socket to open then start
        const waitForSocket = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            clearInterval(waitForSocket);
            sendFrames();
          }
        }, 100);
      }
    };

    sendFrames();
    return () => clearInterval(intervalId);
  }, [username]);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "black",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
          transition: "transform 0.2s ease-in-out",
        }}
      />

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 2,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      <div
        ref={logRef}
        style={{
          position: "absolute",
          bottom: "1%",
          left: "50%",
          transform: "translateX(-50%)",
          color: "white",
          zIndex: 4,
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
        }}
      >
        <img
          src="/scope.png"
          alt="Scope"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: gunType === "shotgun" ? "150px" : "80px",
            height: gunType === "shotgun" ? "150px" : "80px",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            opacity: 0.8,
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <img
              key={gunType}
              src={
                gunType === "shotgun"
                  ? "/shotgun.png"
                  : gunType === "sniper"
                    ? "/sniper.png"
                    : "/pistol.png"
              }
              alt="Shoot"
              onClick={handleShoot}
              style={{
                width: "150px",
                height: "150px",
                cursor: isReloading ? "not-allowed" : "pointer",
                transition: "transform 0.1s ease-in-out",
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = "scale(0.95)";
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            />
            <div style={{ display: "flex", gap: "4px", marginTop: "10px" }}>
              {Array.from({ length: ammo }).map((_, i) => (
                <img
                  key={i}
                  src="/bullet.png"
                  alt="Bullet"
                  style={{ width: "40px", height: "40px" }}
                />
              ))}
            </div>
          </div>
          {isReloading && (
            <div
              style={{
                color: "#ff4444",
                backgroundColor: "rgba(0,0,0,0.6)",
                padding: "10px 16px",
                borderRadius: "8px",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Reloading...
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "10px",
            zIndex: 3,
          }}
        >
          <button onClick={() => selectGun("pistol")}>🔫 Pistol</button>
          <button onClick={() => selectGun("shotgun")}>💥 Shotgun</button>
          <button onClick={() => selectGun("sniper")}>🎯 Sniper</button>
        </div>

        <div
          style={{
            position: "absolute",
            top: "2%",
            left: "50%",
            transform: "translateX(-50%)",
            color: "white",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            padding: "6px 12px",
            borderRadius: "8px",
            zIndex: 5,
          }}
        >
          {gameTimeString}
        </div>

        {/* Leaderboard */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "10px",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "10px",
            borderRadius: "8px",
            maxHeight: "50vh",
            overflowY: "auto",
            width: "200px",
            color: "white",
            fontSize: "14px",
            zIndex: 5,
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", textAlign: "center" }}>
            Leaderboard
          </h3>
          {sortedPlayers.map(({ username, points, kills }, i) => (
            <div
              key={username}
              style={{
                backgroundColor: i === 0 ? "gold" : i === 1 ? "silver" : "",
                fontWeight: i === 0 ? "bold" : "normal",
                marginBottom: "6px",
                padding: "4px",
                borderRadius: "4px",
              }}
            >
              <div>
                {username} - Points: {points} Kills: {kills}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
