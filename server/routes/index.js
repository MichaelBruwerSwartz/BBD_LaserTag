const express = require('express')

const sessionRouter = require('./session')

const router = express.Router()

router.use('/session', sessionRouter)

router.get('/', (req, res) => {
    res.json({ message: 'Welcome to Cool Gun Game!' })
})

module.exports = router