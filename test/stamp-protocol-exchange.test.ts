import { assert, test } from 'vitest'
import { WarpFactory, LoggerFactory } from 'warp-contracts'
import ArLocal from 'arlocal'
import fs from 'fs'

const BAR_SRC = fs.readFileSync('./test/contracts/bar.js', 'utf-8')
const STAMP_SRC = fs.readFileSync('./test/contracts/stamp.js', 'utf-8')

// note: setting global logging level to 'error' to reduce logging.
LoggerFactory.INST.logLevel("fatal");

// the 'forLocal' version uses by default inMemory cache - so no cache files are saved between test runs
const warp = WarpFactory.forLocal();
const STAMP = 1e12
const BAR = 1e6

test('buy and sell stampcoin', async () => {
  let arLocal = new ArLocal(1984, false);
  await arLocal.start();
  // setup - generate contracts and wallets
  const result = await setup()
    .then(mine)
    // addPair
    .then(addPair)
    .then(mine)
    // sellAsset

    .then(createSellOrder)
    .then(mine)

    // allow bar to purchase
    .then(allowFunds)
    .then(mine)

    // buyAsset
    .then(createBuyOrder)
    .then(mine)

    .then(readState)

  //console.log(JSON.stringify(result.bar, null, 2))
  //console.log(JSON.stringify(result.stamp, null, 2))

  assert.equal(result.bar.state.balances[result.seller.address], .98 * BAR)
  assert.equal(result.stamp.state.balances[result.buyer.address], 98 * STAMP)
  assert.equal(result.stamp.state.balances[result.stamp.state.pairs[0].pair[0]], 0)
  assert.equal(result.bar.state.balances[result.stamp.state.pairs[0].pair[0]], 0)
  assert.equal(result.stamp.state.balances['SMft-XozLyxl0ztM-gPSYKvlZVCBiiftNIb4kGFI7wg'], 2 * STAMP)
  assert.ok(true)
  // stop local
  await arLocal.stop()
})

async function readState(ctx) {
  const bar = await warp.contract(ctx.barContract)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .readState().then(({ cachedValue }) => cachedValue)

  const stamp = await warp.contract(ctx.stampContract)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .readState().then(({ cachedValue }) => cachedValue)
  return { bar, stamp, seller: ctx.seller, buyer: ctx.buyer }
}

async function createBuyOrder(ctx) {
  const { buyer, stampContract, barContract, transaction } = ctx
  await warp.contract(stampContract)
    .connect(buyer.jwk)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .writeInteraction({
      function: 'createOrder',
      pair: [barContract, stampContract],
      qty: BAR,
      transaction: transaction
    })
  return ctx
}

async function allowFunds(ctx) {
  const { buyer, stampContract, barContract } = ctx
  const result = await warp.contract(barContract)
    .connect(buyer.jwk)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .writeInteraction({
      function: 'allow',
      target: stampContract,
      qty: BAR
    })

  ctx.transaction = result.originalTxId
  return ctx
}
async function mine(ctx) {
  await warp.testing.mineBlock();
  return ctx
}

async function createSellOrder(ctx) {
  const { seller, stampContract, barContract } = ctx
  await warp.contract(stampContract)
    .connect(seller.jwk)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .writeInteraction({
      function: 'createOrder',
      pair: [stampContract, barContract],
      qty: 100 * STAMP,
      price: 1e-8
    })

  return ctx
}

async function addPair(ctx) {
  const { seller, stampContract, barContract } = ctx
  await warp.contract(stampContract)
    .connect(seller.jwk)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .writeInteraction({
      function: 'addPair',
      pair: barContract
    })

  return ctx
}

async function setup() {
  // generate Wallets
  // note: this automatically adds funds to the generated wallet
  const seller = await warp.testing.generateWallet();
  const buyer = await warp.testing.generateWallet();

  // deploy Asset Contract
  const stamp = await warp.createContract.deploy({
    src: STAMP_SRC,
    wallet: seller.jwk,
    initState: JSON.stringify({
      balances: { [seller.address]: 100 * STAMP },
      pairs: [],
      claims: [],
      claimable: [],
      name: 'STAMP',
      ticker: 'STAMP',
      settings: [["isTradeable", true]],
      foreignCalls: [],
      invocations: []
    })
  })

  // deploy BAR Contract
  const bar = await warp.createContract.deploy({
    src: BAR_SRC,
    wallet: buyer.jwk,
    initState: JSON.stringify({
      name: 'BAR',
      ticker: 'BAR',
      creator: buyer.address,
      balances: {
        [buyer.address]: 1 * BAR
      },
      settings: [
        ["isTradeable", true]
      ],
      claims: [],
      claimable: [],
      canEvolve: true,
      divisibility: "6"
    })
  })
  return {
    seller,
    buyer,
    stampContract: stamp.contractTxId,
    barContract: bar.contractTxId
  }

}