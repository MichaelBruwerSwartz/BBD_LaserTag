const express = require('express')
const path = require('path')

const sessionRouter = require('./session')

const router = express.Router()

router.use('/session', sessionRouter)

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'public', 'index.html'))
})

module.exports = router