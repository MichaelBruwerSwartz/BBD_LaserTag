const socket = new WebSocket("https://bbd-lasertag.onrender.com");

socket.onopen = () => {
  const data = {
    type: "chat",
    message: "glhf everyone",
  };
  socket.send(JSON.stringify(data));
};

socket.onmessage = (event) => {
  console.log("Message from server: ", event.data);
};
