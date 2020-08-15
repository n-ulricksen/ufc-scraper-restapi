module.exports = function isDayOld(utcDate) {
  const oneDay = 1000 * 60 * 60 * 24
  const currentDate = Date.now()
  const yesterday = new Date(currentDate - oneDay)

  if (new Date(utcDate) < yesterday) {
    return true
  }
  return false
}
