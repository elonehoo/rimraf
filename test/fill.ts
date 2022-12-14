import fs from 'fs'
import mkdirp from 'mkdirp'

export default fill(4, 10, 2, __dirname + '/target')

function fill (depth:any, files:any, folders:any, target:any) {
  mkdirp.sync(target)
  var o:any = { flag: 'wx' }
  if (process.version.match(/^v0\.8/))
    o = 'utf8'

  for (var f = files; f > 0; f--) {
    fs.writeFileSync(target + '/f-' + depth + '-' + f, '', o)
  }

  // valid symlink
  fs.symlinkSync('f-' + depth + '-1', target + '/link-' + depth + '-good', 'file')

  // invalid symlink
  fs.symlinkSync('does-not-exist', target + '/link-' + depth + '-bad', 'file')

  // file with a name that looks like a glob
  fs.writeFileSync(target + '/[a-z0-9].txt', '', o)

  depth--
  if (depth <= 0)
    return

  for (f = folders; f > 0; f--) {
    mkdirp.sync(target + '/folder-' + depth + '-' + f)
    fill(depth, files, folders, target + '/d-' + depth + '-' + f)
  }
}
