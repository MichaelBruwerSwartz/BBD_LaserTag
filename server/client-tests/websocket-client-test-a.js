const socket = new WebSocket('ws://localhost:4000/session/2/spectator?username=cablexd')

socket.onopen = () => {
    socket.send('message from client')
}

socket.onmessage = event => {
    console.log('Message from server: ', event.data)
}