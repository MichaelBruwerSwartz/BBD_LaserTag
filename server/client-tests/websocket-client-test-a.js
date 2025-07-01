const socket = new WebSocket('ws://localhost:5005/session/2?username=cablexd')

socket.onopen = () => {
      const data = {
        type: 'chat',
        message: 'glhf everyone'
    }
    socket.send(JSON.stringify(data))
}

socket.onmessage = event => {
    console.log('Message from server: ', event.data)
}