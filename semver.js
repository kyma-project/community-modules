function isSemVer(version) {
  const r = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
  return r.test(version)
}

function semVerCompare(a, b) {
  const aParts = a.version.split('.')
  const bParts = b.version.split('.')
  for (let i = 0; i < 3; i++) {
    if (aParts[i] > bParts[i]) {
      return 1
    }
    if (aParts[i] < bParts[i]) {
      return -1
    }
  }
  return 0
}

export { isSemVer, semVerCompare  }