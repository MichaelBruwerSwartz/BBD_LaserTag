# BBD_LaserTag
A laser tag javascript project for the BBD 2025 project.

## Computer Vision

This system uses pose detection with TensorFlow.js and the MoveNet model to identify people in a live camera feed, locate their torso region, and determine whether they are centered in the frame. If a person is centered, the dominant color within their torso area (specifically between the shoulders) is extracted using canvas pixel analysis. This color is then mapped to the closest known team color, enabling color-based hit detection in a laser tag game environment.

# Running the App Locally

## 1. Start the Client

```bash
cd ./client/
npm run start
```

## 2. Expose Locally via LocalTunnel (optional)

In a separate terminal:

```bash
cd ./
npx localtunnel --port PORT_NUMBER
```

Replace `PORT_NUMBER` with the port your React app runs on (typically `3000`).

## 3. Optional: Use Localhost Instead of Render

If the Render server is down or you prefer running the full app locally:

- Find all instances of URLs like:

```
wss://bbd-lasertag.onrender.com
https://bbd-lasertag.onrender.com
```

- Replace them with:

```
ws://localhost:PORT_NUMBER
http://localhost:PORT_NUMBER
```

Where `PORT_NUMBER` is the port your local WebSocket server is running on.
