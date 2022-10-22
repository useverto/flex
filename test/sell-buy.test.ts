import { assert, test } from 'vitest'
import { WarpFactory, LoggerFactory } from 'warp-contracts'
import Arweave from 'arweave'
import ArLocal from 'arlocal'
import fs from 'fs'

const arweave = Arweave.init({
  host: 'localhost',
  port: 1984,
  protocol: 'http'
})

type Wallet = {
  address: string;
  jwk: JWKInterface;
};

const BAR_SRC = fs.readFileSync('./test/contracts/bar.js', 'utf-8')
const ASSET_SRC = fs.readFileSync('./test/contracts/asset.js', 'utf-8')

// note: setting global logging level to 'error' to reduce logging.
LoggerFactory.INST.logLevel("error");

// the 'forLocal' version uses by default inMemory cache - so no cache files are saved between test runs
const warp = WarpFactory.forLocal();


test('buy and sell asset', async () => {
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

  console.log(result)
  assert.equal(result.state.balances['SMft-XozLyxl0ztM-gPSYKvlZVCBiiftNIb4kGFI7wg'], 2)
  assert.ok(true)
  // stop local
  await arLocal.stop()
})

async function readState(ctx) {
  return await warp.contract(ctx.assetContract)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .readState().then(({ cachedValue }) => cachedValue)
}

async function createBuyOrder(ctx) {
  const { buyer, assetContract, barContract, transaction } = ctx
  await warp.contract(assetContract)
    .connect(buyer.jwk)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .writeInteraction({
      function: 'createOrder',
      pair: [barContract, assetContract],
      qty: 10000,
      transaction: transaction
    })
  return ctx
}

async function allowFunds(ctx) {
  const { buyer, assetContract, barContract } = ctx
  const result = await warp.contract(barContract)
    .connect(buyer.jwk)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .writeInteraction({
      function: 'allow',
      target: assetContract,
      qty: 10000
    })

  ctx.transaction = result.originalTxId
  return ctx
}
async function mine(ctx) {
  await warp.testing.mineBlock();
  return ctx
}

async function createSellOrder(ctx) {
  const { seller, assetContract, barContract } = ctx
  await warp.contract(assetContract)
    .connect(seller.jwk)
    .setEvaluationOptions({
      internalWrites: true,
      allowBigInt: true
    })
    .writeInteraction({
      function: 'createOrder',
      pair: [assetContract, barContract],
      qty: 5000,
      price: 100
    })

  return ctx
}

async function addPair(ctx) {
  const { seller, assetContract, barContract } = ctx
  await warp.contract(assetContract)
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
  const asset = await warp.createContract.deploy({
    src: ASSET_SRC,
    wallet: seller.jwk,
    initState: JSON.stringify({
      balances: { [seller.address]: 10000 },
      pairs: [],
      claims: [],
      claimable: [],
      name: 'ATOMIC-ASSET',
      ticker: 'ATOMIC',
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
        [buyer.address]: 10000000000000
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
    assetContract: asset.contractTxId,
    barContract: bar.contractTxId
  }

}