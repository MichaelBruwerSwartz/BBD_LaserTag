/* global cv */
import { useEffect, useRef, useState } from "react";

export default function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const logRef = useRef(null);
  const [gunType, setGunType] = useState("pistol");
  const [zoomEnabled, setZoomEnabled] = useState(false);

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
    const edges = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edges, 50, 150);
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);

      if (area > 100) {
        const approx = new cv.Mat();
        const peri = cv.arcLength(cnt, true);
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

        const vertices = approx.rows;
        let shape = "";
        if (vertices === 3) shape = "Triangle";
        else if (vertices === 4) shape = "Rectangle";
        else if (vertices === 5) shape = "Pentagon";
        else if (vertices === 6) shape = "Hexagon";
        else if (vertices > 6) {
          const perimeter = cv.arcLength(cnt, true);
          const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
          if (circularity > 0.7) shape = "Circle";
        }

        if (shape) {
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

          const moments = cv.moments(cnt);
          if (moments.m00 !== 0) {
            const cx = Math.round(moments.m10 / moments.m00);
            const cy = Math.round(moments.m01 / moments.m00);
            ctx.fillStyle = "red";
            ctx.font = "18px sans-serif";
            ctx.fillText(shape, cx - 30, cy);
          }
        }

        approx.delete();
      }
    }

    src.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }

  const handleShoot = () => {
    console.log(`🔫 Shoot button clicked with ${gunType}!`);
    if (navigator.vibrate) {
      navigator.vibrate([75, 25, 75]);
    }

    // Call shape detection
    if (window.cv && videoRef.current && canvasRef.current) {
      processVideoOnce(videoRef.current, canvasRef.current);
    }
  };

  const selectGun = (type) => {
    setGunType(type);
    setZoomEnabled(false);
    if (videoRef.current) {
      videoRef.current.style.transform =
        type === "sniper" ? "scale(3)" : "scale(1)";
      videoRef.current.style.transformOrigin = "center center";
    }
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
          video: { facingMode: { exact: "environment" } },
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
            position: "absolute",
            bottom: "10%",
            left: "50%",
            width: "150px",
            height: "150px",
            transform: "translateX(-50%)",
            cursor: "pointer",
            transition: "transform 0.1s ease-in-out",
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.transform = "translateX(-50%) scale(0.95)";
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.transform = "translateX(-50%) scale(1)";
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "5%",
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
      </div>
    </div>
  );
}
