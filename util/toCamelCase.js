module.exports = function toCamelCase(str) {
  let camel = ""

  str = str.toLowerCase()
  for (let i = 0; i < str.length; i++) {
    let ch = str[i]
    if (ch.charCodeAt(0) >= 97 && ch.charCodeAt(0) <= 122) {
      camel += ch
    } else if (ch === " ") {
      i++
      ch = String.fromCharCode(str[i].charCodeAt(0) - 32)
      camel += ch
    }
  }

  return camel
}
