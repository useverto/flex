<p align="center" id="title">
  <img src="https://raw.githubusercontent.com/useverto/design/master/logo/logo_light.svg" alt="Verto logo (light version)" width="110" />

  <h3 align="center">Verto Flex</h3>

  <p align="center">
    An embeddable, programmable order book framework
  </p>
</p>

## Installation

```sh
npm install @verto/flex
```

or

```
yarn add @verto/flex
```

## Prerequisites

Your SmartWeave contract state MUST contain the following variables in order for the Verto Components to function properly:

```js
{
  emergencyHaltWallet: "",
  halted: false,
  pairs: [],
  usedTransfers: [],
  invocations: [],
  foreignCalls: []
}
```
The state is stored in a JSON file

## Usage

This framework includes the core functions necessary to give SmartWeave contracts the ability to embed and manage a central limit order book.

### Import

To use the library, you'll need to import its functions

NOTE: importing these functions will require you to build/bundle the contract before publishing it (shown [here](https://github.com/t8/verto-flex-example/blob/main/build.js#L4))


```ts
import {
  AddPair,
  CancelOrder,
  CreateOrder,
  Halt,
  ReadOutbox,
} from "@verto/flex";
```

### Logic Flow

Note: this is using ArLocal

```ts
async function flow() {
  // Create 2 wallets
  // Give AR balances to both wallets
  // Create 2 contracts
  // Add pair to contractB
  // walletA create order:
  // Call `allow` on contractA
  // Call `createOrder` on contractB

  arweave = Arweave.init({
    host: "localhost",
    port: 1984,
    protocol: "http",
    timeout: 20000,
    logging: false,
  });

  const { walletA, walletB } = await generateWallets(arweave);

  console.log(`WALLET A: ${walletA.address} \nWALLET B: ${walletB.address}`);
  await triggerFaucet(arweave, walletA, walletB);
  console.log("TRIGGERED FAUCET");
  const { contractA, contractB } = await deployContracts(
    arweave,
    walletA,
    walletB
  );
  console.log(`CONTRACT A: ${contractA}\nCONTRACT B: ${contractB}`);
  const pairTx = await createPair(arweave, walletA, contractA, contractB);
  console.log(`INITIALIZED PAIR TX: ${pairTx}`);
  const allowTx = await allowOrder(arweave, walletA, contractA, contractB);
  console.log(`MADE ALLOW TX: ${allowTx}`);
  const orderTx = await makeOrder(
    arweave,
    walletA,
    contractA,
    contractB,
    allowTx
  );
  console.log(`MADE ORDER TX: ${orderTx}`);

  const res1 = await readState(arweave, contractB);
  console.log(JSON.stringify(res1, undefined, 2));

  console.log("\n\n\n\n");
  const res2 = await readState(arweave, contractA);
  console.log(JSON.stringify(res2, undefined, 2));
}
```

### State Interface/Types

```ts
export interface StateInterface {
  emergencyHaltWallet: string; // Wallet address to be used to halt contract in the event of an emergency
  halted: boolean;
  // TODO: fees
  protocolFeePercent: number; // Percent of orders going to protocol
  pairs: {
    pair: [string, string];
    priceData?: PriceDataInterface;
    orders: OrderInterface[];
  }[];
  usedTransfers: string[]; // list of transfers that have already been used by an order
  invocations: string[];
  foreignCalls: ForeignCallInterface[];
  balances?: { [address: string]: number };
}
```

### Action Interface/Types

```ts
export interface ActionInterface {
  input: any;
  caller: string;
}
```

### Add a pair

```ts
const { newState, result } = await AddPair(state, action);
```

returns: 

```ts
state: StateInterface;
  result: {
    status: "success" | "failure";
    message: string;
  };
```

### Cancel Order

```ts
const { newState, result } = await cancelOrder(state, action);
```

returns: 

```ts
 state: StateInterface;
  result: {
    status: "success" | "failure";
    message: string;
  };
```

### Create Order

```ts
const { newState, result } = await cancelOrder(state, action);
```

returns: 

```ts
 state: StateInterface;
  result: {
    status: "success" | "failure";
    message: string;
  };
```

### Halt

```ts
const { newState, result } = await halt(state, action);
```

returns: 

```ts
 state: StateInterface;
  result: {
    status: "success" | "failure";
    message: string;
};
```
  
### Read out box

```ts
const result = await ReadOutbox(state, action);
    return { state: result };
```

returns:

```ts
 state: StateInterface;
```


## Examples

Install the [ArConnect](https://www.arconnect.io/) browser extension

Install ArLocal to test your smart contract locally
```
npx arlocal
```