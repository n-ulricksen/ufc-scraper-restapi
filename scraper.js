const cheerio = require('cheerio')
const axios = require('axios')
const toCamelCase = require('./util/toCamelCase')

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

      const divisionTitle = divisionHtml.find('h4').text().trim()
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
      athleteProfiles: ufcAthleteProfiles,
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
    console.log(athleteId)

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
    .then(vals => {
      let ufcAthleteProfiles = {}
      for (let val in vals) {
        const id = vals[val].athleteId
        ufcAthleteProfiles[id] = vals[val]
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

  // social media links
  const socialLinks = {}
  const socialMediaHtml = $('.c-bio__social-link')
  socialMediaHtml.each((i, elem) => {
    const socialLink = $(elem)['0'].attribs.href
    let socialPlatform = socialLink.split("/")[2]
    socialPlatform = socialPlatform.slice(0, socialPlatform.length - 4)

    socialLinks[socialPlatform] = socialLink
  })

  const profile = {
    athleteId,
    nickname: $('.field-name-nickname').text().trim().replace(/['"]+/g, ''),
    ...bio,
    socialMediaLinks: {
      ...socialLinks
    }
  }
  
  return profile
}

