const cheerio = require('cheerio')
const axios = require('axios')
const toCamelCase = require('./util/toCamelCase')
const toKebabCase = require('./util/toKebabCase')

const UFC_BASE_URL = "https://www.ufc.com"
const UFC_RANKINGS_URL = "https://www.ufc.com/rankings"
const UFC_ATHLETE_URL = "https://www.ufc.com/athlete"
const RANKINGS_SELECTOR = '.view-grouping'
const ATHLETE_IMG_SELECTOR = '.image-style-athlete-profile-listing-medium-1x'

exports.parseUfcRankings = async function parseUfcRankings() {
  try {
    const httpResp = await axios.get(UFC_RANKINGS_URL)

    $ = cheerio.load(httpResp.data)
    const weightDivisionsHtml = $(RANKINGS_SELECTOR)

    // Parse all UFC weight divisions
    const ufcWeightDivisions = {}
    weightDivisionsHtml.each((i, elem) => {
      const divisionHtml = $(elem)

      const divisionTitle = toKebabCase(divisionHtml.find('h4').text().trim())
      const contenders = parseDivisionTopFifteen(divisionHtml)
      const division = {
        champion: parseDivisionChamp(divisionHtml),
        contenders
      }
      ufcWeightDivisions[divisionTitle] = division
    })

    // Parse all athlete profiles
    const ufcAthleteProfiles = await parseAthleteProfiles(ufcWeightDivisions)

    const timestamp = new Date(Date.now())

    return {
      divisions: ufcWeightDivisions, 
      athletes: ufcAthleteProfiles,
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

  // athlete ID
  const splitUrl = champHtml['0'].attribs.href.split('/')
  const athleteId = splitUrl[splitUrl.length - 1]

  const champion = {
    name: champHtml.text(),
    athleteId,
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

    // athlete ID
    const splitUrl = fighterHtml['0'].attribs.href.split('/')
    const athleteId = splitUrl[splitUrl.length - 1]

    const fighter = {
      name: fighterHtml.text(),
      athleteId
    }

    contenders[i] = fighter
  })

  return contenders
}

async function parseAthleteProfiles(ufcWeightDivisions) {
  let profilePromises = []
  for (let k in ufcWeightDivisions) {
    const division = ufcWeightDivisions[k]
 
    // champ profile
    profilePromises.push(parseAthleteProfile(division.champion.athleteId))
 
    // contender profiles
    for (let contender of division.contenders) {
      profilePromises.push(parseAthleteProfile(contender.athleteId))
    }
  }
 
  return Promise.all(profilePromises)
    .then(profiles => {
      let ufcAthleteProfiles = {}
      for (let i in profiles) {
        const profile = profiles[i]
        const { athleteId } = profile

        delete profile["athleteId"]
        
        ufcAthleteProfiles[athleteId] = profile
      }
      return ufcAthleteProfiles 
    })
    .catch(err => {
      throw err
    })
}

async function parseAthleteProfile(athleteId) {
  const httpResp = await axios.get(UFC_ATHLETE_URL + "/" + athleteId)

  const $ = cheerio.load(httpResp.data)

  // athlete name
  const name = $('.field-name-name').text().trim()

  // athlete bio info
  const bioData = $('.c-bio__text')
  const bioLabels = $('.c-bio__label')
  let bioItems = []
  const bio = {}

  bioData.each((i, elem) => {
    const data = $(elem).text().trim()
    bioItems.push(data)
  })
  bioLabels.each((i, elem) => {
    let label = $(elem).text().trim()
    label = toCamelCase(label)
    bio[label] = bioItems[i]
  })

  // athlete country
  const country = bio.hometown ? getCountryFromHometown(bio.hometown) : ""

  // social media links
  const socialMediaHtml = $('.c-bio__social-link')
  const socialMediaLinks = {}
  socialMediaHtml.each((i, elem) => {
    const socialLink = $(elem)['0'].attribs.href
    let socialPlatform = socialLink.split("/")[2]
    socialPlatform = socialPlatform.slice(0, socialPlatform.length - 4)

    socialMediaLinks[socialPlatform] = socialLink
  })

  // win-loss-draw
  const headlineHtml = $('.c-hero__headline-suffix')
  const tokens = headlineHtml.text().split("\n")
  const division = (tokens[1].trim().length > 8) ? tokens[1].trim() :
    tokens[2].trim()
  const winLossDraw = (tokens[3].trim().length > 12) ? tokens[3].trim() : 
    tokens[4].trim()

  const wldTokens = winLossDraw.split('-')
  const wins = Number(wldTokens[0])
  const losses = Number(wldTokens[1])
  const draws = Number(wldTokens[2].split(" ")[0])

  // promoted stats
  const promotedStatsHtml = $('.c-record__promoted-figure')
  const promotedStatsLabelsHtml = $('.c-record__promoted-text')
  let promotedStats = []
  let statsData = []

  promotedStatsHtml.each((i, elem) => {
    const statData = $(elem).text()
    statsData[i] = Number(statData)
  })
  promotedStatsLabelsHtml.each((i, elem) => {
    const statLabel = $(elem).text()
    if (statLabel) {
      promotedStats.push({ 
        "stat": statLabel,
        "data": statsData[i] 
      })
    }
  })

  // striking and grappling accuracy
  const accuracyHtml = $('.e-chart-circle__percent').contents()
  const strikingAccuracy = accuracyHtml[0] ? accuracyHtml[0].data : ""
  const grapplingAccuracy = accuracyHtml[1] ? accuracyHtml[1].data : ""

  // significant strikes and takedowns
  const statsTextHtml = $('.c-overlap__stats-text')
  const statsValueHtml = $('.c-overlap__stats-value')
  let strikesTakedownsValues = []
  let fightingStats = []

  statsValueHtml.each((i, elem) => {
    const statData = $(elem).text()
    strikesTakedownsValues[i] = Number(statData)
  })
  statsTextHtml.each((i, elem) => {
    const statLabel = $(elem).text()
    if (statLabel) {
      fightingStats.push({
        "stat": statLabel,
        "data": strikesTakedownsValues[i]
      })
    }
  })

  const profile = {
    athleteId,
    name,
    nickname: $('.field-name-nickname').text().trim().replace(/['"]+/g, ''),
    division,
    country,
    wins,
    losses,
    draws,
    ...bio,
    strikingAccuracy,
    grapplingAccuracy,
    fightingStats,
    promotedStats,
    socialMediaLinks
  }
  
  return profile
}

function getCountryFromHometown(hometown) {
  const hometownTokens = hometown.split(",")
  const country = hometownTokens.length > 1 ? hometownTokens[1].trim()
    : hometownTokens[0].trim()

  return country
}

