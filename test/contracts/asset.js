"use strict";

// node_modules/@verto/flex/dist/index.esm.js
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var feeWallet = "SMft-XozLyxl0ztM-gPSYKvlZVCBiiftNIb4kGFI7wg";
var claimBalance = (tokenID, transferTx, qty) => __async(void 0, null, function* () {
  const result = yield SmartWeave.contracts.write(tokenID, {
    function: "claim",
    txID: transferTx,
    qty
  });
  //console.log('Claim Result:', JSON.stringify(result))
  /*
  if (result.type !== "ok") {
    throw new ContractError(`Unable to make claim with txID: ${transferTx}`);
  }
  */
});
var isAddress = (addr) => /[a-z0-9_-]{43}/i.test(addr);
function tagPatch(tags) {
  if (Array.isArray(tags))
    return tags;
  const constructedArray = [];
  for (const field in tags) {
    constructedArray.push({
      name: field,
      value: tags[field]
    });
  }
  return constructedArray;
}
function getContractID() {
  const tags = tagPatch(SmartWeave.transaction.tags);
  const id = tags.find(({ name }) => name === "Contract").value;
  return id;
}
var AddPair = (state, action) => __async(void 0, null, function* () {
  var _a, _b;
  const caller = action.caller;
  const input = action.input;
  const pairs = state.pairs;
  const newPair = input.pair;
  ContractAssert(newPair !== getContractID(), "Cannot add self as a pair");
  ContractAssert(
    !pairs.find(({ pair: existingPair }) => existingPair.includes(newPair)),
    "This pair already exists"
  );
  ContractAssert(/[a-z0-9_-]{43}/i.test(newPair), "Pair contract is invalid");
  try {
    const tokenState = yield SmartWeave.contracts.readContractState(newPair);
    ContractAssert(
      (tokenState == null ? void 0 : tokenState.ticker) && (tokenState == null ? void 0 : tokenState.balances),
      "Contract is not a valid token"
    );
    ContractAssert(
      typeof tokenState.ticker === "string",
      "Contract ticker is not a string"
    );
    for (const addr in tokenState.balances) {
      ContractAssert(
        typeof tokenState.balances[addr] === "number",
        `Invalid balance for "${addr}" in contract "${newPair}"`
      );
    }
    const tradeableSetting = (_b = (_a = tokenState == null ? void 0 : tokenState.settings) == null ? void 0 : _a.find(
      ([settingName]) => settingName === "isTradeable"
    )) == null ? void 0 : _b[1];
    ContractAssert(
      tradeableSetting === true || tradeableSetting === void 0,
      `This token does not allow trading (${newPair})`
    );
  } catch (e) {
    throw new ContractError(e);
  }
  state.pairs.push({
    pair: [getContractID(), newPair],
    orders: []
  });
  return {
    state,
    result: {
      status: "success",
      message: "Pair added successfully"
    }
  };
});
var CancelOrder = (state, action) => __async(void 0, null, function* () {
  const caller = action.caller;
  const input = action.input;
  const orderTxID = input.orderID;
  ContractAssert(isAddress(orderTxID), "Invalid order ID");
  const allOrders = state.pairs.map((pair) => pair.orders).flat(1);
  const order = allOrders.find(({ id }) => id === orderTxID);
  ContractAssert(order !== void 0, "Order does not exist");
  ContractAssert(
    order.creator === caller,
    "Caller is not the creator of the order"
  );
  if (order.token === SmartWeave.contract.id) {
    state.balances[SmartWeave.contract.id] -= order.quantity;
    if (caller in state.balances) {
      state.balances[caller] += order.quantity;
    } else {
      state.balances[caller] = order.quantity;
    }
  } else {
    const result = yield SmartWeave.contracts.write(order.token, {
      function: "transfer",
      target: caller,
      qty: order.quantity
    });
    if (result.type !== "ok") {
      throw new ContractError(
        `Unable to make claim with txID: ${SmartWeave.transaction.id}`
      );
    }
  }
  const acitvePair = state.pairs.find(
    (pair) => pair.orders.find(({ id }) => id === orderTxID)
  );
  acitvePair.orders = acitvePair.orders.filter(({ id }) => id !== orderTxID);
  return {
    state,
    result: {
      status: "success",
      message: "Order cancelled successfully"
    }
  };
});
var CreateOrder = (state, action) => __async(void 0, null, function* () {
  const caller = action.caller;
  const input = action.input;
  const pairs = state.pairs;
  const usedPair = input.pair;
  const qty = input.qty;
  const price = input.price;
  let tokenTx = input.transaction;
  let balances = state.balances;
  ContractAssert(
    isAddress(usedPair[0]) && isAddress(usedPair[1]),
    "One of two supplied pair tokens is invalid"
  );
  ContractAssert(
    usedPair[0] === SmartWeave.contract.id || usedPair[1] === SmartWeave.contract.id,
    "One of the two contracts in the pair isn't the current contract."
  );
  if (price) {
    ContractAssert(typeof price === "number", "Price must be a number");
    ContractAssert(
      price === void 0 || price === null || price > 0,
      "Price must be greater than 0"
    );
    ContractAssert(Number.isInteger(price), "Price must be an integer");
  }
  if (!Number.isInteger(qty) || qty === void 0) {
    throw new ContractError("Invalid value for quantity. Must be an integer.");
  }
  let contractID = usedPair[0];
  if (contractID === SmartWeave.contract.id) {
    tokenTx = "INTERNAL_TRANSFER";
    if (qty <= 0 || caller === SmartWeave.contract.id) {
      throw new ContractError("Invalid token transfer.");
    }
    if (balances[caller] < qty) {
      throw new ContractError(
        "Caller balance not high enough to send " + qty + " token(s)."
      );
    }
    balances[caller] -= qty;
    if (SmartWeave.contract.id in balances) {
      balances[SmartWeave.contract.id] += qty;
    } else {
      balances[SmartWeave.contract.id] = qty;
    }
  } else {
    if (tokenTx === void 0 || tokenTx === null) {
      throw new ContractError(
        "No token transaction provided given the token in the order is from a different contract"
      );
    }
    yield claimBalance(contractID, tokenTx, qty);
  }
  const refundTransfer = () => __async(void 0, null, function* () {
    if (contractID === SmartWeave.contract.id) {
      balances[SmartWeave.contract.id] -= qty;
      if (caller in balances) {
        balances[caller] += qty;
      } else {
        balances[caller] = qty;
      }
    } else {
      const result = yield SmartWeave.contracts.write(contractID, {
        function: "transfer",
        target: caller,
        qty
      });
      if (result.type !== "ok") {
        throw new ContractError(
          `Unable to return order with txID: ${SmartWeave.transaction.id}`
        );
      }
    }
  });
  let pairIndex = -1;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].pair[0] === usedPair[0] && pairs[i].pair[1] === usedPair[1] || pairs[i].pair[0] === usedPair[1] && pairs[i].pair[1] === usedPair[0]) {
      pairIndex = i;
    }
  }
  if (pairIndex === -1) {
    yield refundTransfer();
    return {
      state,
      result: {
        status: "failure",
        message: "This pair does not exist yet"
      }
    };
  }
  let sortedOrderbook;
  if (state.pairs[pairIndex].orders.length > 0) {
    sortedOrderbook = state.pairs[pairIndex].orders.sort(
      (a, b) => a.price > b.price ? 1 : -1
    );
  } else {
    sortedOrderbook = [];
  }
  const dominantToken = state.pairs[pairIndex].pair[0];
  try {
    const { orderbook, foreignCalls, matches } = matchOrder(
      {
        pair: {
          dominant: dominantToken,
          from: contractID,
          to: usedPair.find((val) => val !== contractID)
        },
        quantity: qty,
        creator: caller,
        transaction: SmartWeave.transaction.id,
        transfer: tokenTx,
        price
      },
      sortedOrderbook
    );
    state.pairs[pairIndex].orders = orderbook;
    if (matches.length > 0) {
      const vwap = matches.map(({ qty: volume, price: price2 }) => volume * price2).reduce((a, b) => a + b, 0) / matches.map(({ qty: volume }) => volume).reduce((a, b) => a + b, 0);
      state.pairs[pairIndex].priceData = {
        dominantToken,
        block: SmartWeave.block.height,
        vwap,
        matchLogs: matches
      };
    } else {
      state.pairs[pairIndex].priceData = void 0;
    }
    for (let i = 0; i < foreignCalls.length; i++) {
      if (foreignCalls[i].input.qty <= 0) {
        continue;
      }
      if (foreignCalls[i].contract === SmartWeave.contract.id) {
        balances[SmartWeave.contract.id] -= foreignCalls[i].input.qty;
        if (foreignCalls[i].input.target in balances) {
          balances[foreignCalls[i].input.target] += foreignCalls[i].input.qty;
        } else {
          balances[foreignCalls[i].input.target] = foreignCalls[i].input.qty;
        }
      } else {
        const result = yield SmartWeave.contracts.write(
          foreignCalls[i].contract,
          foreignCalls[i].input
        );
        if (result.type !== "ok") {
          throw new ContractError(
            `Unable to fill order with txID: ${foreignCalls[i].txID}`
          );
        }
      }
    }
    if (state.balances) {
      state.balances = balances;
    }
    return {
      state,
      result: {
        status: "success",
        message: "Order created successfully"
      }
    };
  } catch (e) {
    console.log(e)
    yield refundTransfer();
    return {
      state,
      result: {
        status: "failure",
        message: e.message
      }
    };
  }
});
function matchOrder(input, orderbook) {
  var _a, _b;
  const orderType = input.price ? "limit" : "market";
  const foreignCalls = [];
  const matches = [];
  const reverseOrders = orderbook.filter(
    (order) => input.pair.from !== order.token && order.id !== input.transaction
  );
  if (!reverseOrders.length) {
    if (orderType !== "limit")
      throw new Error('The first order for a pair can only be a "limit" order');
    orderbook.push({
      id: input.transaction,
      transfer: input.transfer,
      creator: input.creator,
      token: input.pair.from,
      price: input.price,
      quantity: Math.round(input.quantity),
      originalQuantity: input.quantity
    });
    return {
      orderbook,
      foreignCalls,
      matches
    };
  }
  let fillAmount;
  let receiveAmount = 0;
  let remainingQuantity = input.quantity;
  for (let i = 0; i < orderbook.length; i++) {
    const currentOrder = orderbook[i];
    if (input.pair.from === currentOrder.token || currentOrder.id === input.transaction)
      continue;
    const reversePrice = 1 / currentOrder.price;
    if (orderType === "limit" && input.price !== reversePrice)
      continue;
    fillAmount = remainingQuantity * ((_a = input.price) != null ? _a : reversePrice);
    let receiveFromCurrent = 0;
    if (fillAmount <= currentOrder.quantity) {
      receiveFromCurrent = remainingQuantity * reversePrice;
      currentOrder.quantity -= fillAmount;
      receiveAmount += receiveFromCurrent;
      if (remainingQuantity > 0) {
        foreignCalls.push({
          txID: SmartWeave.transaction.id,
          contract: input.pair.from,
          input: {
            function: "transfer",
            target: currentOrder.creator,
            qty: Math.round(remainingQuantity * 0.98)
          }
        });
        foreignCalls.push({
          txID: SmartWeave.transaction.id,
          contract: input.pair.from,
          input: {
            function: "transfer",
            target: feeWallet,
            qty: Math.round(remainingQuantity * 0.02)
          }
        });
      }
      remainingQuantity = 0;
    } else {
      receiveFromCurrent = currentOrder.quantity;
      receiveAmount += receiveFromCurrent;
      const sendAmount = receiveFromCurrent * currentOrder.price;
      remainingQuantity -= sendAmount;
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: input.pair.from,
        input: {
          function: "transfer",
          target: currentOrder.creator,
          qty: Math.round(sendAmount * 0.98)
        }
      });
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: input.pair.from,
        input: {
          function: "transfer",
          target: feeWallet,
          qty: Math.round(sendAmount * 0.02)
        }
      });
      currentOrder.quantity = 0;
    }
    let dominantPrice = 0;
    if (input.pair.dominant === input.pair.from) {
      dominantPrice = (_b = input.price) != null ? _b : reversePrice;
    } else {
      dominantPrice = currentOrder.price;
    }
    matches.push({
      id: currentOrder.id,
      qty: receiveFromCurrent,
      price: dominantPrice
    });
    if (currentOrder.quantity === 0) {
      orderbook = orderbook.filter((val) => val.id !== currentOrder.id);
    }
    if (remainingQuantity === 0)
      break;
  }
  if (remainingQuantity > 0) {
    if (orderType === "limit") {
      orderbook.push({
        id: input.transaction,
        transfer: input.transfer,
        creator: input.creator,
        token: input.pair.from,
        price: input.price,
        quantity: Math.round(remainingQuantity),
        originalQuantity: input.quantity
      });
    } else {
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: input.pair.from,
        input: {
          function: "transfer",
          target: input.creator,
          qty: remainingQuantity
        }
      });
    }
  }
  foreignCalls.push({
    txID: SmartWeave.transaction.id,
    contract: input.pair.to,
    input: {
      function: "transfer",
      target: input.creator,
      qty: Math.round(receiveAmount * 0.98)
    }
  });
  foreignCalls.push({
    txID: SmartWeave.transaction.id,
    contract: input.pair.to,
    input: {
      function: "transfer",
      target: feeWallet,
      qty: Math.round(receiveAmount * 0.02)
    }
  });
  return {
    orderbook,
    foreignCalls,
    matches
  };
}
var Halt = (state, action) => {
  const caller = action.caller;
  ContractAssert(
    caller === state.emergencyHaltWallet,
    "Caller cannot halt or resume the protocol"
  );
  state.halted = !state.halted;
  return {
    state,
    result: {
      status: "success",
      message: "Successfully toggled Verto Flex halting"
    }
  };
};

// src/contract.ts
export async function handle(state, action) {
  const balances = state.balances;
  const claimable = state.claimable;
  const claims = state.claims;
  const input = action.input;
  const caller = action.caller;
  if (input.function === "evolve") {
    if (state.canEvolve) {
      if (state.creator === action.caller) {
        state.evolve = action.input.value;
      }
    }
    return { state };
  }
  if (input.function === "transfer") {
    const target = input.target;
    const quantity = input.qty;
    if (!Number.isInteger(quantity) || quantity === void 0) {
      throw new ContractError(
        "Invalid value for quantity. Must be an integer."
      );
    }
    if (!target) {
      throw new ContractError("No target specified.");
    }
    if (quantity <= 0 || caller === target) {
      throw new ContractError("Invalid token transfer.");
    }
    if (balances[caller] < quantity) {
      throw new ContractError(
        "Caller balance not high enough to send " + quantity + " token(s)."
      );
    }
    balances[caller] -= quantity;
    if (target in balances) {
      balances[target] += quantity;
    } else {
      balances[target] = quantity;
    }
    return { state };
  }
  if (input.function === "readOutbox") {
    ContractAssert(!!input.contract, "Missing contract to invoke");
    const foreignState = await SmartWeave.contracts.readContractState(
      input.contract
    );
    ContractAssert(
      !!foreignState.foreignCalls,
      "Contract is missing support for foreign calls"
    );
    const calls = foreignState.foreignCalls.filter(
      (element) => element.contract === SmartWeave.contract.id && !state.invocations.includes(element.txID)
    );
    let res = state;
    for (const entry of calls) {
      res = (await handle(res, { caller: input.contract, input: entry.input })).state;
      res.invocations.push(entry.txID);
    }
    return { state: res };
  }
  if (input.function === "balance") {
    let target;
    if (!input.target) {
      target = caller;
    } else {
      target = input.target;
    }
    const ticker = state.ticker;
    if (typeof target !== "string") {
      throw new ContractError("Must specify target to get balance for.");
    }
    if (typeof balances[target] !== "number") {
      throw new ContractError("Cannot get balance; target does not exist.");
    }
    return {
      result: {
        target,
        ticker,
        balance: balances[target]
      }
    };
  }
  if (input.function === "allow") {
    const target = input.target;
    const quantity = input.qty;
    if (!Number.isInteger(quantity) || quantity === void 0) {
      throw new ContractError(
        "Invalid value for quantity. Must be an integer."
      );
    }
    if (!target) {
      throw new ContractError("No target specified.");
    }
    if (quantity <= 0 || caller === target) {
      throw new ContractError("Invalid token transfer.");
    }
    if (balances[caller] < quantity) {
      throw new ContractError(
        "Caller balance not high enough to make claimable " + quantity + " token(s)."
      );
    }
    balances[caller] -= quantity;
    claimable.push({
      from: caller,
      to: target,
      qty: quantity,
      txID: SmartWeave.transaction.id
    });
    return { state };
  }
  if (input.function === "claim") {
    const txID = input.txID;
    const qty = input.qty;
    for (let i = 0; i < claims.length; i++) {
      if (claims[i] === txID) {
        console.log("Already Claimed!");
        return { state };
      }
    }
    if (!claimable.length) {
      throw new ContractError("Contract has no claims available");
    }
    let obj, index;
    for (let i = 0; i < claimable.length; i++) {
      if (claimable[i].txID === txID) {
        index = i;
        obj = claimable[i];
      }
    }
    if (obj === void 0) {
      throw new ContractError("Unable to find claim");
    }
    if (obj.to !== caller) {
      throw new ContractError("Claim not addressed to caller");
    }
    if (obj.qty !== qty) {
      throw new ContractError("Claiming incorrect quantity of tokens");
    }
    for (let i = 0; i < claims.length; i++) {
      if (claims[i] === txID) {
        throw new ContractError("This claim has already been made");
      }
    }
    balances[caller] += obj.qty;
    claimable.splice(index, 1);
    claims.push(txID);
    return { state };
  }
  if (input.function === "addPair") {
    const _ = await AddPair(state, action);
    return { state: _.state };
  }
  if (input.function === "cancelOrder") {
    const _ = await CancelOrder(state, action);
    return { state: _.state };
  }
  if (input.function === "createOrder") {
    const _ = await CreateOrder(state, action);
    return { state: _.state };
  }
  if (input.function === "halt") {
    const _ = await Halt(state, action);
    return { state: _.state };
  }
}