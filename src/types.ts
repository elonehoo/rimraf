import type glob from 'glob'
import fs from 'fs'

export interface GlobOpts {
  nosort:boolean
  silent:boolean
}

export interface Options {
  maxBusyTries?: number | undefined;
  emfileWait?: number | undefined;
  /** @default false */
  disableGlob?: boolean | undefined;
  glob?: glob.IOptions | false | undefined
  unlink?: typeof fs.unlink | undefined;
  chmod?: typeof fs.chmod | undefined;
  stat?: typeof fs.stat | undefined;
  lstat?: typeof fs.lstat | undefined;
  rmdir?: typeof fs.rmdir | undefined;
  readdir?: typeof fs.readdir | undefined;
  unlinkSync?: typeof fs.unlinkSync | undefined;
  chmodSync?: typeof fs.chmodSync | undefined;
  statSync?: typeof fs.statSync | undefined;
  lstatSync?: typeof fs.lstatSync | undefined;
  rmdirSync?: typeof fs.rmdirSync | undefined;
  readdirSync?: typeof fs.readdirSync | undefined;
}
