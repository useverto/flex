<p align="center" id="title">
  <a href="https://verto.exchange">
    <img src="https://raw.githubusercontent.com/useverto/design/master/logo/logo_light.svg" alt="Verto logo (light version)" width="110" />
  </a>

  <h3 align="center">Verto Component</h3>

  <p align="center">
    Build Verto functionality into your own SmartWeave contract
  </p>
</p>

## Installation

```sh
npm install @verto/component
```

or

```sh
yarn add @verto/component
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

## Usage

This library implements the core functions necessary to give SmartWeave contracts the ability to manage a central limit order book.

### Import

To use the library, you'll need to import its functions

```ts
import * as verto from "@verto/component";
```

OR

```ts
import {
  AddPair,
  CancelOrder,
  CreateOrder,
  Halt,
  ReadOutbox,
} from "@verto/component";
```

### Add a pair

```ts
const newState = await AddPair(state, action);
```
