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
  const routes = 
  `Available routes:<br><br>
  GET /athletes<br>
  GET /athletes/:athleteId<br>
  GET /divisions<br>
  GET /divisions/:divisionId`

  res.send(String(routes))
})

app.get('/athletes', (req, res) => {
  getRankings().then((data => {
    const { athletes } = data
    let athleteData = []

    for (let athlete in athletes) {
      const { name, nickname, division, country } = athletes[athlete]
      athleteData.push({
        name, nickname, division, country, 
        athleteId: athlete
      })
    }

    res.json({ athletes: athleteData })
  })).catch(err => res.status(500).json({ error: err }))
})

app.get('/athletes/:athleteId', (req, res) => {
  const { athleteId } = req.params

  getRankings().then(data => {
    const { athletes } = data
    const athlete = athletes[athleteId]

    if (!athlete) {
      return res.status(404).json({ error: `fighter not found: ${athleteId}` })
    }

    res.json({ [athleteId]: athlete })
  }).catch(err => res.status(500).json({ error: err }))
})

app.get('/divisions', (req, res) => {
  getRankings().then(data => {
    const { divisions, athletes } = data

    for (let division in divisions) {
      const champId = divisions[division].champion.athleteId
      const { country } = athletes[champId]

      divisions[division].champion = {
        ...divisions[division].champion,
        country
      }

      divisions[division].contenders.forEach((contender, i) => {
        const { country } = athletes[contender.athleteId]
        divisions[division].contenders[i] = {
          ...divisions[division].contenders[i],
          country
        }
      })
    }

    res.json({ divisions })
  }).catch(err => res.status(500).json({ error: err}))
})

app.get('/divisions/:divisionId', (req, res) => {
  const { divisionId } = req.params
  
  getRankings().then(data => {
    const { divisions, athletes } = data
    const division = divisions[divisionId]

    if (!division) {
      return res.status(404).json({ error: `division not found: ${divisionId}` })
    }

    // get champ country
    const champId = division.champion.athleteId
    const { country } = athletes[champId]

    division.champion = {
      ...division.champion,
      country
    }

    // get contenders countries
    division.contenders.forEach((contender, i) => {
      const { athleteId } = contender
      const { country } = athletes[athleteId]

      division.contenders[i] = {
        ...division.contenders[i],
        country
      }
    })

    res.json({ [divisionId]: division })
  }).catch(err => res.status(500).json({ error: err }))
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

