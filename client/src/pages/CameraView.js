/* global cv */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const logRef = useRef(null);
  const [gunType, setGunType] = useState("pistol");
  const [zoomEnabled, setZoomEnabled] = useState(false);

  const navigate = useNavigate();

  // Game Details
  /*
    TODO:
    leaderboard: username, points
    gameTime
    powerup icons?
  */
  const [gameTimeString, setGameTimeString] = useState("00:00");

  const gunConfig = {
    pistol: { ammo: 5, reloadTime: 1000 },
    shotgun: { ammo: 2, reloadTime: 2000 },
    sniper: { ammo: 1, reloadTime: 3000 },
  };

  const [ammo, setAmmo] = useState(gunConfig["pistol"].ammo);
  const [isReloading, setIsReloading] = useState(false);

  const location = useLocation();
  const { username, gameCode, codeId } = location.state || {};

  // leaderboard logic
  const [leaderboardData, setLeaderboardData] = useState([]);
  const sortedPlayers = [...leaderboardData].sort((a, b) => b.points - a.points);

  const socketRef = useRef(null);
  useEffect(() => {
    if (username == null || gameCode == null || codeId == null) {
      console.warn("Missing required values to connect WebSocket.");
      return;
    }

    const socket = new WebSocket(
      `ws://localhost:4000/session/${gameCode}?username=${username}&codeId=${codeId}` // wss://bbd-lasertag.onrender.com
    );

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to server with WebSocket!");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message from server:", data);

      // Add logic here for in-game updates
      if (data.type === "gameUpdate") {
        const { players, timeLeft } = data;

        // countdown
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        setGameTimeString(
          `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        );

        // leaderboard
        setLeaderboardData(data.players);

        // check if game has ended -> forward to leaderboard
        if (timeLeft === 0) {
          navigate("/leaderboard", {
            state: {
              players
            }
          });
        }
      }
    };

    socket.onclose = () => console.log("WebSocket closed");
    socket.onerror = (e) => console.error("WebSocket error", e);

    return () => {
      socket.close();
    };
  }, [username, gameCode, codeId]);

  // Helper function to get color name from RGB values
  function getColorName(r, g, b) {
    // Convert RGB to HSV for easier color classification
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta === 0) {
      h = 0;
    } else if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : delta / max;
    const v = max;

    // Classify based on HSV values
    if (v < 0.2) return "black";
    if (s < 0.1 && v > 0.8) return "white";
    if (s < 0.2) return "gray";

    if (h < 15 || h > 345) return "red";
    if (h >= 15 && h < 45) return "orange";
    if (h >= 45 && h < 75) return "yellow";
    if (h >= 75 && h < 165) return "green";
    if (h >= 165 && h < 255) return "blue";
    if (h >= 255 && h < 315) return "purple";
    return "pink";
  }

  // Function called when a hit is detected at center
  function hitDetected(targetColor, targetShape) {
    window.alert("hit the " + targetColor + " " + targetShape);
    const hitPayload = {
      type: "hit",
      weapon: gunType,
      shape: targetShape,
      color: targetColor,
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(hitPayload));
      console.log("Sent hit:", hitPayload);
    } else {
      console.warn("WebSocket not open. Hit not sent.");
    }

    // Optionally update UI or log (remove alert if no longer needed)
    if (logRef.current) {
      logRef.current.textContent = `Hit sent: ${targetColor} ${targetShape} with ${gunType}`;
    }
  }
  function processVideoOnce(video, canvas) {
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    const src = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    const processed = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    // Convert to grayscale and apply preprocessing
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, processed, new cv.Size(7, 7), 1.5);

    // Use adaptive thresholding for better binarization
    cv.adaptiveThreshold(
      processed,
      processed,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11,
      2
    );

    // Morphological operations to clean up noise
    const kernel = cv.getStructuringElement(
      cv.MORPH_ELLIPSE,
      new cv.Size(3, 3)
    );
    cv.morphologyEx(processed, processed, cv.MORPH_CLOSE, kernel);

    // Find contours
    cv.findContours(
      processed,
      contours,
      hierarchy,
      cv.RETR_TREE,
      cv.CHAIN_APPROX_SIMPLE
    );

    // Center point of canvas to check for reticle
    const centerX = width / 2;
    const centerY = height / 2;

    // Process contours
    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      const perimeter = cv.arcLength(cnt, true);

      // Filter small contours and noise
      if (area < 100 || perimeter < 30) {
        cnt.delete();
        continue;
      }

      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.015 * perimeter, true);
      const vertices = approx.rows;

      const hull = new cv.Mat();
      cv.convexHull(cnt, hull);
      const hullArea = cv.contourArea(hull);
      const solidity = hullArea > 0 ? area / hullArea : 0;

      let shape = "";
      if (vertices === 3) {
        // Triangle detection with additional validation
        const triRect = cv.boundingRect(approx);
        const triangleAspectRatio =
          Math.max(triRect.width, triRect.height) /
          Math.min(triRect.width, triRect.height);
        if (solidity > 0.85 && triangleAspectRatio < 2.5) {
          shape = "triangle";
        }
      } else if (vertices === 4) {
        const rect = cv.minAreaRect(cnt);
        const aspectRatio =
          Math.max(rect.size.width, rect.size.height) /
          Math.min(rect.size.width, rect.size.height);
        shape = aspectRatio > 1.2 ? "Rectangle" : "Square";
      } else {
        // Circle detection
        if (vertices > 6) {
          const circleArea = Math.PI * Math.pow(Math.sqrt(area / Math.PI), 2);
          const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
          const areaRatio = Math.abs(area - circleArea) / area;

          if (circularity > 0.7 && areaRatio < 0.3 && solidity > 0.8) {
            shape = "Circle";
          }
        }
      }

      if (shape) {
        // Check if the center point lies within the contour (reticle inside)
        const dist = cv.pointPolygonTest(
          cnt,
          new cv.Point(centerX, centerY),
          false
        );

        // Create mask and get color
        const mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
        cv.drawContours(mask, contours, i, new cv.Scalar(255), -1);
        const meanColor = cv.mean(src, mask);
        mask.delete();
        const r = Math.round(meanColor[0]);
        const g = Math.round(meanColor[1]);
        const b = Math.round(meanColor[2]);
        const colorName = getColorName(r, g, b);

        if (
          (shape === "triangle" ||
            shape === "rectangle" ||
            shape === "sqaure") &&
          dist >= 0
        ) {
          hitDetected(colorName, "triangle");
        }

        // Draw contour
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 3;
        ctx.beginPath();
        const data = cnt.data32S;
        for (let j = 0; j < cnt.rows; j++) {
          const x = data[j * 2];
          const y = data[j * 2 + 1];
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw label
        const moments = cv.moments(cnt);
        if (moments.m00 !== 0) {
          const cx = Math.round(moments.m10 / moments.m00);
          const cy = Math.round(moments.m01 / moments.m00);
          ctx.fillStyle = "red";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${colorName} ${shape}`, cx, cy - 15);
        }
      }

      approx.delete();
      hull.delete();
      cnt.delete();
    }

    // Clean up memory
    src.delete();
    gray.delete();
    processed.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
  }

  const handleShoot = () => {
    if (isReloading) return; // disable shooting while reloading

    if (ammo <= 0) {
      reload(); // trigger automatic reload
      return;
    }

    console.log(`Shoot button clicked with ${gunType}!`);
    setAmmo(ammo - 1);

    if (navigator.vibrate) {
      navigator.vibrate([75, 25, 75]);
    }

    // if (window.cv && videoRef.current && canvasRef.current) {
    //   processVideoOnce(videoRef.current, canvasRef.current);
    // }
  };

  const selectGun = (type) => {
    setGunType(type);
    setAmmo(gunConfig[type].ammo);
    setIsReloading(false); // cancel reload when switching guns

    setZoomEnabled(false);
    if (videoRef.current) {
      videoRef.current.style.transform =
        type === "sniper" ? "scale(3)" : "scale(1)";
      videoRef.current.style.transformOrigin = "center center";
    }
  };

  const reload = () => {
    if (isReloading) return;
    setIsReloading(true);

    const reloadTime = gunConfig[gunType].reloadTime;

    setTimeout(() => {
      setAmmo(gunConfig[gunType].ammo);
      setIsReloading(false);
    }, reloadTime);
  };

  useEffect(() => {
    const preventZoom = (e) => e.preventDefault();
    let lastTouch = 0;
    const doubleTapBlocker = (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    };

    if (!zoomEnabled) {
      document.addEventListener("gesturestart", preventZoom, {
        passive: false,
      });
      document.addEventListener("dblclick", preventZoom, { passive: false });
      document.addEventListener("touchend", doubleTapBlocker, {
        passive: false,
      });

      return () => {
        document.removeEventListener("gesturestart", preventZoom);
        document.removeEventListener("dblclick", preventZoom);
        document.removeEventListener("touchend", doubleTapBlocker);
      };
    }
  }, [zoomEnabled]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        videoRef.current.srcObject = stream;

        setTimeout(() => {
          const video = videoRef.current;
          if (!video) return;

          const rect = video.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const fireFakeClick = () => {
            const evt = new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              clientX: centerX,
              clientY: centerY,
              view: window,
            });
            document.elementFromPoint(centerX, centerY)?.dispatchEvent(evt);
          };

          fireFakeClick();
          setTimeout(fireFakeClick, 200);
        }, 1000);
      } catch (err) {
        console.error("Camera error:", err);
        alert("Camera access denied. Please allow permissions.");
      }
    };

    startCamera();
  }, []);

  // This sends the streaming frame
  useEffect(() => {
    let intervalId;

    const checkAndStartStreaming = () => {
      const video = videoRef.current;
      const socket = socketRef.current;

      if (!video || !socket) return;

      if (socket.readyState === WebSocket.OPEN) {
        intervalId = setInterval(() => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);

          const frame = canvas.toDataURL("image/jpeg", 0.5);

          socket.send(
            JSON.stringify({
              type: "cameraFrame",
              username,
              frame,
            })
          );
        }, 50);
      } else {
        // Wait and retry until socket is open
        const waitForSocket = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            clearInterval(waitForSocket);
            checkAndStartStreaming(); // try again
          }
        }, 100);
      }
    };

    checkAndStartStreaming();

    return () => clearInterval(intervalId);
  }, []);

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
      ></canvas>
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
      ></div>

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
          {/* Gun & Bullets (vertically aligned) */}
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
                cursor: "pointer",
                transition: "transform 0.1s ease-in-out",
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = "scale(0.95)";
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            />

            {/* Bullet icons */}
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
        <div style={{ display: "flex" }}>
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
        </div>

        {/* leaderboard */}
        <div
          style={{
            position: "absolute",
            top: "2%",
            left: "2%",
            backgroundColor: "rgba(31, 41, 55, 0.6)", // <- updated transparency
            border: "2px solid rgba(55, 65, 81, 0.7)", // <- softened border
            borderRadius: "12px",
            padding: "12px",
            maxWidth: "120px",
            maxHeight: "300px",
            overflowY: "auto",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
            color: "#ffffff",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: "10px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
              paddingBottom: "8px",
              borderBottom: "1px solid #4b5563",
            }}
          >
            <span style={{ fontSize: "8px", marginRight: "8px" }}>🏆</span>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "600",
                color: "#f3f4f6",
              }}
            >
              Leaderboard
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sortedPlayers.length > 0 ? (
              sortedPlayers.slice(0, 3).map((player, index) => (
                <div
                  key={player.username}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    backgroundColor:
                      index === 0
                        ? "#fbbf24"
                        : index === 1
                          ? "#c0c0c0"
                          : index === 2
                            ? "#cd7f32"
                            : "#374151",
                    color: index < 3 ? "#000000" : "#ffffff",
                    borderRadius: "8px",
                    fontWeight: index < 3 ? "600" : "400",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        minWidth: "20px",
                      }}
                    >
                      #{index + 1}
                    </span>
                    <span style={{ fontWeight: "500" }}>{player.username}</span>
                  </div>
                  <span
                    style={{
                      fontWeight: "600",
                      fontSize: "10px",
                    }}
                  >
                    {player.points}
                  </span>
                </div>
              ))
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#9ca3af",
                  fontStyle: "italic",
                  padding: "16px",
                }}
              >
                No players yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
