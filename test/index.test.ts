import rimraf from '~/index'
import fill from './fill'
import { describe, expect, it } from 'vitest'

describe('should', () => {
  it('initial clean',()=>{
    fill
    rimraf.sync(__dirname + '/target')
  })
  it('sync removal',()=>{
    fill
    rimraf.sync(__dirname + '/target')
  })
  it('async removal',()=>{
    fill
    rimraf(__dirname + '/target',function(er){
      console.log(er)
    })
  })
  it('glob',()=>{
    fill
    let glob = require('glob')
    var pattern = __dirname + '/target/f-*'
    var before = glob.sync(pattern)
    rimraf(pattern, function (er) {
      if (er){
        throw er
      }
      var after = glob.sync(pattern)
      rimraf.sync(__dirname + '/target')
    })
  })

})
