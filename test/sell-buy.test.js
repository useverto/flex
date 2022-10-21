import { assert, test } from 'vitest'
import { WarpFactory, LoggerFactory } from 'warp-contracts'
import ArLocal from 'arlocal'
import fs from 'fs'

const BAR_SRC = fs.readFileSync('./contracts/bar.js', 'utf-8')
const ASSET_SRC = fs.readFileSync('./contracts/asset.js', 'utf-8')

// note: setting global logging level to 'error' to reduce logging.
LoggerFactory.INST.logLevel("error");

// the 'forLocal' version uses by default inMemory cache - so no cache files are saved between test runs
const warp = WarpFactory.forLocal();


test('buy and sell asset', async () => {
  let arLocal = new ArLocal(1984, false);
  await arLocal.start();
  // setup - generate contracts and wallets


  // addPair

  // sellAsset

  // allow bar to purchase

  // buyAsset

})

async function setup() {

}