# BBD_LaserTag
A laser tag javascript project for the BBD 2025 project.

## Computer Vision

This system uses pose detection with TensorFlow.js and the MoveNet model to identify people in a live camera feed, locate their torso region, and determine whether they are centered in the frame. If a person is centered, the dominant color within their torso area (specifically between the shoulders) is extracted using canvas pixel analysis. This color is then mapped to the closest known team color, enabling color-based hit detection in a laser tag game environment.

## How to run locally (with server hosted)

Go in the ./client/ directory \n
npm run-start \n
Go into the ./ directory \n
npx localtunnel --port PORT_NUMBER \n

if you would like to run it fully locally, or the server is not up, change all the render links to rather use localhost:PORT_NUMBER
