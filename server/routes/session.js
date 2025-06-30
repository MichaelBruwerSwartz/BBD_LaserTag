const express = require('express')
const appData = require('../app-data')

const router = express.Router()

router.get('/new-id', (req, res) => {
    const newSessionId = appData.getUniqueSessionId()
    res.status(200).json({ id: newSessionId })
})

module.exports = router