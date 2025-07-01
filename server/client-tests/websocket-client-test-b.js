const socket = new WebSocket('ws://localhost:5005/session/2?username=noobmaster')

socket.onopen = () => {
    const data = {
        type: 'chat',
        message: 'glhf everyone'
    }
    socket.send(JSON.stringify(data))
}

socket.onmessage = event => {
    console.log('Server says: ', event.data)
}