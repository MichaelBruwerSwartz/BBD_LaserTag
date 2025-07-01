// const express = require("express")
// const cors = require("cors")
// const morgan = require("morgan")

// const websocket = require("./websocket")
// const router = require("./routes/index")

// const PORT = 4000
// const WEBSOCKET_PORT = 5005

// const app = express()

// // middleware
// app.use(cors())
// app.use(express.json())
// app.use(morgan("dev"))

// // routes
// app.use("/", router)

// // 404 handler
// app.use((req, res, next) => {
//   res.redirect("/") // redirect to home page
// })

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`)
// })

// // start websocket
// websocket(WEBSOCKET_PORT)

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://${req.headers.host}");
  const username = url.searchParams.get("username");
  const code = url.pathname.split("/").pop();
  console.log("New connection from", username, "in session", code);

  ws.send(JSON.stringify({ type: "hello", message: "Connected" }));
});

app.get("/", (req, res) => res.send("Backend running"));

server.listen(process.env.PORT || 4000, () => {
  console.log("Server running");
});

// start websocket
const WEBSOCKET_PORT = 5005;
websocket(WEBSOCKET_PORT);
