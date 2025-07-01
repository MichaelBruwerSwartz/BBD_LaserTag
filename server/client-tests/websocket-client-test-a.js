const endpoint = "http://localhost:4000/session/a?username=cablexd" // "https://bbd-lasertag.onrender.com"
const socket = new WebSocket(endpoint);

socket.onopen = () => {
    console.log('Connected to session')
}

socket.onmessage = event => {
    console.log('Message from server: ', event.data)
}

setInterval(() => {
    console.log('sending hit data')
    const data = {
        type: 'hit',
        color: 'blue',
        shape: 'triangle',
        weapon: 'pistol'
    }
    socket.send(JSON.stringify(data))
}, 1000)
