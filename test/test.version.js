import modules from "../model.js";
import { semVerCompare, isSemVer } from "../semver.js";

function imageVersion(image) {
  const r = /.*:(.*)/
  let match = r.exec(image)
  if (match) {
    return match[1]
  } else {
    return image
  }

}
function versionTest(version) {
  describe(version.version, function () {
    it('semantic versioning ', function () {
      if (!isSemVer(version.version)) {
        throw new Error('Version ' + version.version + ' does not use semantic versioning')
      }
    })
    it('manager version matches module version', function () {
      let managerVersion = imageVersion(version.managerImage)
      if (managerVersion != version.version) {
        throw new Error('Version: ' + version.version + ', manager version: ' + managerVersion)
      }
    })
    it('released version contains deployment YAML', function () {
      if (!version.deploymentYaml) {
        if (version.channels && version.channels.length>0) {
          this.skip()
        }
        throw new Error('Version ' + version.version + ' does not contain deployment YAML')
      }
    })
    it('released version contains default CR YAML', function () {
      if (!version.crYaml) {
        if (version.channels && version.channels.length>0) {
          this.skip()
        }
        throw new Error('Version ' + version.version + ' does not contain default CR YAML')
      }
    })
  })
}


modules.forEach(m => {
  describe(m.name, function () {
    describe('versions', function () {
      m.versions.forEach(versionTest)
    })
    describe('channels', function () {
      if (m.manageable) {
        let fast = m.versions.find(v => v.channels && v.channels.includes('fast'))
        let regular = m.versions.find(v => v.channels && v.channels.includes('regular'))
        it('regular channel defined', function () {
          if (!regular) {
            throw new Error('regular channel is missing')
          }
        })
        it('fast channel defined', function () {
          if (!fast) {
            throw new Error('fast channel is missing')
          }
        })
        if (fast && regular) {
          it ("fast isn't older than regular", function () {
            if (semVerCompare(fast,regular) < 0) {
              throw new Error('fast version '+fast.version+'is older than regular version '+regular.version)
            }
          })  
        }
      }
    })
  })
})