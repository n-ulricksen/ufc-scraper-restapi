module.exports = function toKebabCase(str) {
  let kebab = ""

  str = str.toLowerCase()
  for (let i = 0; i < str.length; i++) {
    let ch = str[i]
    if (ch.charCodeAt(0) >= 97 && ch.charCodeAt(0) <= 122) {
      kebab += ch
    } else if (ch === " " || ch === "-") {
      kebab += "-"
    }
  }
  
  return kebab
}
