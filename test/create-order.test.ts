import { assert, test } from 'vitest'
import { CreateOrder } from '../src/modules/createOrder.ts'

globalThis.ContractAssert = (expr, txt) => {
  if (expr) {
    return
  } else {
    throw new Error(txt)
  }
}
globalThis.ContractError = Error

globalThis.SmartWeave = {
  block: {
    height: 1000001
  },
  transaction: {
    id: 'transactionbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg'
  },
  contract: {
    id: 'f987EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg'
  },
  contracts: {
    write: (contract, input) => {
      // console.log('contract: ', contract)
      // console.log('input: ', input)
      return Promise.resolve({ type: 'ok' })
    }
  }
}

test('buy using createOrder', async () => {
  const owner = 'ownerFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg'
  const inState = {
    balances: {
      'ownerFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg': 1000,
      'f987EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg': 10000
    },
    pairs: [{
      pair: ['f987EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg', 'bar7EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg'],
      orders: [
        {
          id: 'orderFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg',
          transfer: 'INTERNAL_TRANSFER',
          creator: 'ownerFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg',
          token: 'f987EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg',
          price: 1,
          quantity: 10000,
          originalQuantity: 10000
        }
      ]
    }],
    foreignCalls: [],
    settings: [
      [
        "isTradable",
        true
      ]
    ]
  }
  const action = {
    input: {
      function: 'createOrder',
      pair: ['bar7EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg', 'f987EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg'],
      qty: 1000,
      transaction: 'a9S7EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg',

    },
    caller: 'z9S7EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg'
  }
  const { state, result } = await CreateOrder(inState, action)
  assert.equal(state.balances['SMft-XozLyxl0ztM-gPSYKvlZVCBiiftNIb4kGFI7wg'], 20)
  assert.equal(state.balances['z9S7EFBe9QMbu-Z6nA-ZcIV3dI6mRqD_kcIpOomaIvg'], 980)
  assert.ok(true)
})