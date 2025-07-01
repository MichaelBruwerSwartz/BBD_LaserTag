import websocket from "./websocket.js";

const PORT = process.env.PORT || 4000;

websocket.start(PORT);