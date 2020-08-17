const fs = require('fs')
const express = require('express')
const { parseUfcRankings } = require('./scraper')
const isDayOld = require('./util/isDayOld')

const app = express()

const RANKINGS_FILEPATH = './rankings.json'

/**********/
/* Routes */
/**********/
app.get('/', (req, res) => {
  ufcRankingsData = getRankings().then(data => {
    res.json(data)
  }).catch(err => {
    res.status(500).json({ error: err })
  })
})

// Read UFC rankings data from file. If no file is found, or the data is stale,
// parse rankings data from the UFC rankings website.
async function getRankings() {
  let ufcRankingsData

  try {
    rankingsFile = fs.readFileSync(RANKINGS_FILEPATH)
    ufcRankingsData = JSON.parse(rankingsFile)
    
    // check if data is stale
    if (isDayOld(ufcRankingsData.lastUpdated)) {
      console.log(`Updating UFC rankings file at ${RANKINGS_FILEPATH}`)
      ufcRankingsData = await updateRankingsFile()
    }
  } catch (err) {
    // no file found, scrape ufc rankings
    console.log(`Creating UFC rankings file at ${RANKINGS_FILEPATH}`)
    ufcRankingsData = await updateRankingsFile()
  }

  return ufcRankingsData
}

async function updateRankingsFile() {
  try {
    const ufcRankingsData = await parseUfcRankings()

    fs.writeFile(RANKINGS_FILEPATH, JSON.stringify(ufcRankingsData), err => {
      if (err) {
        throw err
      }
    })

    return ufcRankingsData
  } catch (err) {
    console.error(err)
  }
}

const PORT = 8080
app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

