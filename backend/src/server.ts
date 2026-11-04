
import 'dotenv/config'
import app from './app.js'

const PORT = Number(process.env.PORT) || 3000

app.listen(PORT, () => {
  console.log(`FinTrack API running on http://localhost:${PORT}`)
})
