const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const websocket = require('./websocket')
const router = require('./routes/index')

const PORT = 4000
const WEBSOCKET_PORT = 5000

const app = express()

// middleware
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// routes
app.use('/', router)

// 404 handler
app.use((req, res, next) => {
    res.redirect('/') // redirect to home page
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

// start websocket
websocket(WEBSOCKET_PORT)