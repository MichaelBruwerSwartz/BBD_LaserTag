import { useEffect, useRef, useState } from "react";

export default function CameraView() {
  const videoRef = useRef(null);
  const [gunType, setGunType] = useState("pistol");
  const [zoomEnabled, setZoomEnabled] = useState(false);

  const handleShoot = () => {
    console.log(`🔫 Shoot button clicked with ${gunType}!`);
    if (navigator.vibrate) {
      navigator.vibrate([75, 25, 75]);
    }
  };

  const selectGun = (type) => {
    setGunType(type);
    if (type === "sniper") {
      setZoomEnabled(false);
      if (videoRef.current) {
        videoRef.current.style.transform = "scale(3)";
        videoRef.current.style.transformOrigin = "center center";
      }
    } else {
      setZoomEnabled(false);
      if (videoRef.current) {
        videoRef.current.style.transform = "scale(1)";
      }
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
        margin: 0,
        padding: 0,
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
        {/* Scope icon */}
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

        {/* Shoot button */}
        <img
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

        {/* Gun type selector */}
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
