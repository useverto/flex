<p align="center" id="title">
  <img src="https://raw.githubusercontent.com/useverto/design/master/logo/logo_light.svg" alt="Verto logo (light version)" width="110" />

  <h3 align="center">Verto Flex</h3>

  <p align="center">
    An embeddable, programmable order book framework
  </p>
</p>

## Disclaimer

Flex requires Warp for evaluation because of internalWrites

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

### Price Interface/Types
```ts
interface PriceDataInterface {
  // the id of the token from the pair
  // the price is calculated for
  // "x something / 1 dominantToken"
  dominantToken: string;
  // the block the order was created in
  block: number;
  // volume weighted average price, in
  // "x something / 1 dominantToken"
  vwap: number;
  // logs for this order's matches
  matchLogs: MatchLogs;
}
```

### Foreign Call Interface/Types
```ts
export interface ForeignCallInterface {
  txID: string;
  contract: string;
  input: InvocationInterface;
}
```

### Invocation Interface/Types
```ts
export interface InvocationInterface {
  function: string;
  \[key: string | number \]: any;
}
```

### Action Interface/Types

```ts
export interface ActionInterface {
  input: any;
  caller: string;
}
```

## How to get started

* create a contract JS/TS file
* setup an initial state in a `state.json` file
* import functions from the flex package
* create a async handle function

```ts
export async function handle(state, action) {
  if (action.input.function === "addPair") {
    const result = await AddPair(state, action);
    return { state: result };
  }
  //create order creates and order by passing in the state and action
  if (action.input.function === "createOrder") {
    const result = await CreateOrder(state, actiåon);
    return { state: result };
  }
  //cancel order creates and order by passing in the state and action
  if (action.input.function === "cancelOrder") {
    const result = await CancelOrder(state, action);
    return { state: result };
  }
  if (action.input.function === "readOutbox") {
    const result = await ReadOutbox(state, action);
    return { state: result };
  }
  if (action.input.function === "halt") {
    const result = await Halt(state, action);
    return { state: result };
  }
 }
```



## Examples

Install ArLocal to test your smart contract locally
```
npx arlocal
```

Examples are included in the examples folder

Contribution for more example smart contracts are welcome feel free to make PR's

