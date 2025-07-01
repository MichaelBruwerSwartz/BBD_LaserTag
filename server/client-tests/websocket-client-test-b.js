const socket = new WebSocket("https://bbd-lasertag.onrender.com");

socket.onopen = () => {
    console.log('Connected to session')
}

socket.onmessage = event => {
    console.log('Message from server: ', event.data)
}
