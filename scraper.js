const cheerio = require('cheerio')
const axios = require('axios')

const UFC_BASE_URL = "https://www.ufc.com"
const UFC_RANKINGS_URL = "https://www.ufc.com/rankings"
const RANKINGS_SELECTOR = '.view-grouping'
const ATHLETE_IMG_SELECTOR = '.image-style-athlete-profile-listing-medium-1x'

exports.parseUfcRankings = async function parseUfcRankings() {
  try {
    const httpResp = await axios.get(UFC_RANKINGS_URL)

    $ = await cheerio.load(httpResp.data)
    weightDivisionsHtml = $(RANKINGS_SELECTOR)

    // Parse all UFC weight divisions
    const ufcWeightDivisions = {}
    weightDivisionsHtml.each((i, elem) => {
      const divisionHtml = $(elem)

      const divisionTitle = divisionHtml.find('h4').text().trim()
      const division = {
        champion: parseDivisionChamp(divisionHtml),
        contenders: parseDivisionTopFifteen(divisionHtml)
      }
      ufcWeightDivisions[divisionTitle] = division
    })

    // const twoDays = 1000 * 60 * 60 * 48
    const timestamp = new Date(Date.now())

    return {
      divisions: ufcWeightDivisions, 
      lastUpdated: timestamp.toUTCString()
    }
  } catch (err) {
    throw err
  }
}

/********************/
/* Helper functions */
/********************/
function parseDivisionChamp(divisionHtml) {
  const champHtml = divisionHtml.find('h5 a')

  const champion = {
    name: champHtml.text(),
    ufcProfileUrl: UFC_BASE_URL + champHtml['0'].attribs.href,
    image: divisionHtml.find(ATHLETE_IMG_SELECTOR)['0']
      .attribs.src,
  }
  
  return champion
}

function parseDivisionTopFifteen(divisionHtml) {
  const fighters = divisionHtml.find('.views-table tr')

  let contenders = []
  fighters.each((i, elem) => {
    const fighterHtml = $(elem).find('a')

    let fighter = {
      name: fighterHtml.text(),
      ufcProfileUrl: UFC_BASE_URL + fighterHtml['0'].attribs.href
    }

    contenders[i] = fighter
  })

  return contenders
}

