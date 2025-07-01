const endpoint = "ws://localhost:4000/session/a?username=noobmaster" // "https://bbd-lasertag.onrender.com"
const socket = new WebSocket(endpoint);

socket.onopen = () => {
    console.log('Connected to session')
}

socket.onmessage = event => {
    console.log('Message from server: ', event.data)
}
