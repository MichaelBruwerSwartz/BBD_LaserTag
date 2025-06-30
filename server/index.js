const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const router = require('./routes/index')

const PORT = process.env.PORT || 3000

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Routes
app.use('/', router)

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})