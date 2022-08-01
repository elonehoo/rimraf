import path from 'path'
import assert from 'assert'
import glob from 'glob'

let fs = require('fs')
import { GlobOpts,Options } from '~/types'

const defaultGlobOpts:GlobOpts = {
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

const rimraf = (path:string, options:Options, callback: (error: Error | null | undefined) => void) => {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  assert(path, 'rimraf: missing path')
}
