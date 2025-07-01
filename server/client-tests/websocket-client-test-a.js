const socket = new WebSocket("https://bbd-lasertag.onrender.com");

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
        target: 'noobmaster',
        weapon: 'pistol'
    }
    socket.send(JSON.stringify(data))
}, 1000)
