import path from 'path'
import assert from 'assert'
import glob from 'glob'

let fs = require('fs')

const defaultGlobOpts = {
  nosort: true,
  silent: true
}

// for EMFILE handling
let timeout:number = 0

const isWindows:boolean = (process.platform === "win32")

const defaults = (options:any) => {
  const methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  methods.forEach((m:string) => {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  options.maxBusyTries = options.maxBusyTries || 3
  options.emfileWait = options.emfileWait || 1000
  if (options.glob === false) {
    options.disableGlob = true
  }
  if (options.disableGlob !== true && glob === undefined) {
    throw Error('glob dependency not found, set `options.disableGlob = true` if intentional')
  }
  options.disableGlob = options.disableGlob || false
  options.glob = options.glob || defaultGlobOpts
}

const rimraf = (paths:string, options:any, callback:any) => {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  assert(paths, 'rimraf: missing paths')
  assert.equal(typeof paths, 'string', 'rimraf: paths should be a string')
  assert.equal(typeof callback, 'function', 'rimraf: callback function required')
  assert(options, 'rimraf: invalid options argument provided')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  defaults(options)

  let busyTries:number = 0
  let errState:any = null
  let n:number = 0

  const next = (er:any) => {
    errState = errState || er
    if (--n === 0){
      callback(errState)
    }
  }

  const afterGlob = (er:any, results:any) => {
    if (er)
      return callback(er)

    n = results.length
    if (n === 0){
      return callback()
    }


    results.forEach((p:any) => {
      const CB = (er:any) => {
        if (er) {
          if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") &&
              busyTries < options.maxBusyTries) {
            busyTries ++
            // try again, with the same exact callback as this one.
            return setTimeout(() => rimraf_(p, options, CB), busyTries * 100)
          }

          // this one won't happen if graceful-fs is used.
          if (er.code === "EMFILE" && timeout < options.emfileWait) {
            return setTimeout(() => rimraf_(p, options, CB), timeout ++)
          }

          // already gone
          if (er.code === "ENOENT") er = null
        }

        timeout = 0
        next(er)
      }
      rimraf_(p, options, CB)
    })
  }

  if (options.disableGlob || !glob.hasMagic(paths)){
    return afterGlob(null, [paths])
  }


  options.lstat(paths, (er:any, stat:any) => {
    if (!er){
      return afterGlob(null, [paths])
    }

    glob(paths, options.glob, afterGlob)
  })
}

const rimraf_ = (paths:any, options:any, callback:any) => {
  assert(paths)
  assert(options)
  assert(typeof callback === 'function')
  options.lstat(paths, (er:any, st:any) => {
    if (er && er.code === "ENOENT")
      return callback(null)

    // Windows can EPERM on stat.  Life is suffering.
    if (er && er.code === "EPERM" && isWindows)
      fixWinEPERM(paths, options, er, callback)

    if (st && st.isDirectory())
      return rmdir(paths, options, er, callback)

    options.unlink(paths, (er:any) => {
      if (er) {
        if (er.code === "ENOENT")
          return callback(null)
        if (er.code === "EPERM")
          return (isWindows)
            ? fixWinEPERM(paths, options, er, callback)
            : rmdir(paths, options, er, callback)
        if (er.code === "EISDIR")
          return rmdir(paths, options, er, callback)
      }
      return callback(er)
    })
  })
}

const fixWinEPERM = (paths:any, options:any, er:any, callback: any) => {
  assert(paths)
  assert(options)
  assert(typeof callback === 'function')

  options.chmod(paths, 0o666, (er2:any) => {
    if (er2)
    callback(er2.code === "ENOENT" ? null : er)
    else
      options.stat(paths, (er3:any, stats:any) => {
        if (er3)
        callback(er3.code === "ENOENT" ? null : er)
        else if (stats.isDirectory())
          rmdir(paths, options, er, callback)
        else
          options.unlink(paths, callback)
      })
  })
}

const fixWinEPERMSync = (path:any, options:any, er:any) => {
  assert(path)
  assert(options)

  try {
    options.chmodSync(path, 0o666)
  } catch (er2:any) {
    if (er2.code === "ENOENT")
      return
    else
      throw er
  }

  let stats
  try {
    stats = options.statSync(path)
  } catch (er3:any) {
    if (er3.code === "ENOENT")
      return
    else
      throw er
  }

  if (stats.isDirectory())
    rmdirSync(path, options, er)
  else
    options.unlinkSync(path)
}

const rmdir = (paths:any, options:any, originalEr:any, callback:any) => {
  assert(paths)
  assert(options)
  assert(typeof callback === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(paths, (er:any) => {
    if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")){
      rmkids(paths, options, callback)
    } else if (er && er.code === "ENOTDIR"){
      callback(originalEr)
    }else{
      callback(er)
    }

  })
}

const rmkids = (paths:any, options:any, callback: any) => {
  assert(paths)
  assert(options)
  assert(typeof callback === 'function')

  options.readdir(paths, (er:any, files:any) => {
    if (er)
      return callback(er)
    let n = files.length
    if (n === 0)
      return options.rmdir(paths, callback)
    let errState:any
    files.forEach((f:any) => {
      rimraf(path.join(paths, f), options, (er:any) => {
        if (errState)
          return
        if (er)
          return callback(errState = er)
        if (--n === 0)
          options.rmdir(paths, callback)
      })
    })
  })
}

const rimrafSync = (paths:any, options?:any) => {
  options = options || {}
  defaults(options)

  assert(paths, 'rimraf: missing path')
  assert.equal(typeof paths, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  let results

  if (options.disableGlob || !glob.hasMagic(paths)) {
    results = [paths]
  } else {
    try {
      options.lstatSync(paths)
      results = [paths]
    } catch (er) {
      results = glob.sync(paths, options.glob)
    }
  }

  if (!results.length)
    return

  for (let i = 0; i < results.length; i++) {
    const p = results[i]

    let st
    try {
      st = options.lstatSync(p)
    } catch (er:any) {
      if (er.code === "ENOENT")
        return

      // Windows can EPERM on stat.  Life is suffering.
      if (er.code === "EPERM" && isWindows)
        fixWinEPERMSync(p, options, er)
    }

    try {
      // sunos lets the root user unlink directories, which is... weird.
      if (st && st.isDirectory())
        rmdirSync(p, options, null)
      else
        options.unlinkSync(p)
    } catch (er:any) {
      if (er.code === "ENOENT")
        return
      if (er.code === "EPERM")
        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
      if (er.code !== "EISDIR")
        throw er

      rmdirSync(p, options, er)
    }
  }
}

const rmdirSync = (paths:any, options:any, originalEr:any) => {
  assert(paths)
  assert(options)

  try {
    options.rmdirSync(paths)
  } catch (er:any) {
    if (er.code === "ENOENT")
      return
    if (er.code === "ENOTDIR")
      throw originalEr
    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
      rmkidsSync(paths, options)
  }
}

const rmkidsSync = (paths:any, options:any) => {
  assert(paths)
  assert(options)
  options.readdirSync(paths).forEach((f:any) => rimrafSync(path.join(paths, f), options))

  // We only end up here once we got ENOTEMPTY at least once, and
  // at this point, we are guaranteed to have removed all the kids.
  // So, we know that it won't be ENOENT or ENOTDIR or anything else.
  // try really hard to delete stuff on windows, because it has a
  // PROFOUNDLY annoying habit of not closing handles promptly when
  // files are deleted, resulting in spurious ENOTEMPTY errors.
  const retries = isWindows ? 100 : 1
  let i = 0
  do {
    let threw = true
    try {
      const ret = options.rmdirSync(paths, options)
      threw = false
      return ret
    } finally {
      if (++i < retries && threw)
        continue
    }
  } while (true)
}

export default rimraf
rimraf.sync = rimrafSync
