const express = require('express')

const sessionRouter = require('./session')

const router = express.Router()

router.use('/session', sessionRouter)

module.exports = router