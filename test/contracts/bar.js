
// In order to add bAR minting while you upload data to the permaweb, simply add the following tags:
// Protocol-Name: BAR
// Action: Burn
// App-Name: SmartWeaveAction
// App-Version: 0.3.0
// Input: {"function":"mint"}
// Contract: THIS CONTRACT ID
export async function handle(state, action) {
  const balances = state.balances;
  const claimable = state.claimable;
  const claims = state.claims;
  const input = action.input;
  const caller = action.caller;
  if (balances[caller] === void 0 || balances[caller] === null) {
    balances[caller] = 0;
  }
  if (input.function === "mint") {
    const amountToMint = Math.floor(parseInt(SmartWeave.transaction.reward) / 1e6);
    if (!balances[caller]) {
      balances[caller] = amountToMint;
    } else {
      balances[caller] += amountToMint;
    }
    return { state };
  }
  if (input.function === 'evolve') {
    if (state.canEvolve) {
      if (state.creator === action.caller) {
        state.evolve = action.input.value
      }
    }
    return { state }
  }
  if (input.function === "transfer") {
    const target = input.target;
    const quantity = input.qty;
    if (!Number.isInteger(quantity) || quantity === void 0) {
      throw new ContractError("Invalid value for quantity. Must be an integer.");
    }
    if (!target) {
      throw new ContractError("No target specified.");
    }
    if (quantity <= 0 || caller === target) {
      throw new ContractError("Invalid token transfer.");
    }
    if (balances[caller] < quantity) {
      throw new ContractError("Caller balance not high enough to send " + quantity + " token(s).");
    }
    balances[caller] -= quantity;
    if (target in balances) {
      balances[target] += quantity;
    } else {
      balances[target] = quantity;
    }
    return { state };
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
      throw new ContractError("Invalid value for quantity. Must be an integer.");
    }
    if (!target) {
      throw new ContractError("No target specified.");
    }
    if (quantity <= 0 || caller === target) {
      throw new ContractError("Invalid token transfer.");
    }
    if (balances[caller] < quantity) {
      throw new ContractError("Caller balance not high enough to make claimable " + quantity + " token(s).");
    }
    balances[caller] -= quantity;
    if (balances[caller] === null || balances[caller] === void 0) {
      balances[caller] = 0;
    }
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
    // make claim idempotent - if already claimed just return success
    for (let i = 0; i < claims.length; i++) {
      if (claims[i] === txID) {
        return { state }
      }
    }
    if (!claimable.length) {
      throw new ContractError("Contract has no claims available");
    }
    if (txID === void 0) {
      throw new ContractError("txID is undefined");
    }
    if (qty === void 0 || typeof qty !== "number") {
      throw new ContractError("Qty must be a number");
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
    if (!Number.isInteger(balances[caller])) balances[caller] = 0;
    balances[caller] += obj.qty;
    claimable.splice(index, 1);
    claims.push(txID);
    return { state };
  }
}

