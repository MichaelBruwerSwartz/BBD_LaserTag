const socket = new WebSocket('ws://localhost:4000/session/2?username=cablexd')

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