import {
  ActionInterface,
  StateInterface,
  CreateOrderInterface,
  OrderInterface,
  ForeignCallInterface,
  MatchLogs,
} from "../faces";
import { ensureValidTransfer, isAddress, feeWallet } from "../utils";
import Transaction from "arweave/node/lib/transaction";

export const CreateOrder = async (
  state: StateInterface,
  action: ActionInterface
): Promise<{
  state: StateInterface;
  result: {
    status: "success" | "failure";
    message: string;
  };
}> => {
  const caller = action.caller;
  const input: CreateOrderInterface = action.input;

  const pairs = state.pairs;
  const usedPair = input.pair;
  const tokenTx = input.transaction;
  const price = input.price;

  // test that pairs are valid contract strings
  ContractAssert(
    isAddress(usedPair[0]) && isAddress(usedPair[1]),
    "One of two supplied pair tokens is invalid"
  );

  // validate price is a number
  if (price) {
    ContractAssert(typeof price === "number", "Price must be a number");

    // validate price for limit orders
    ContractAssert(
      price === undefined || price === null || price > 0,
      "Price must be greater than 0"
    );
    ContractAssert(Number.isInteger(price), "Price must be an integer");
  }

  // id of the transferred token
  let contractID = "";
  // transfer interaction input
  let contractInput: {
    function: string;
    [key: string]: any;
  };
  // transfer transaction object
  let transferTx: Transaction;

  // grab the contract id of the token they are transferring in the supplied tx
  try {
    transferTx = await SmartWeave.unsafeClient.transactions.get(tokenTx);
  } catch (err) {
    throw new ContractError(err);
  }

  // @ts-expect-error
  transferTx.get("tags").forEach((tag) => {
    if (tag.get("name", { decode: true, string: true }) === "Contract") {
      contractID = tag.get("value", { decode: true, string: true });
    }
    if (tag.get("name", { decode: true, string: true }) === "Input") {
      contractInput = JSON.parse(
        tag.get("value", { decode: true, string: true })
      );
    }
  });

  ContractAssert(
    typeof contractID === "string",
    "Invalid contract ID in transfer: not a string"
  );
  ContractAssert(
    contractID !== "",
    "No contract ID found in the transfer transaction"
  );
  ContractAssert(
    !state.usedTransfers.includes(tokenTx),
    "This transfer has already been used for an order"
  );
  ContractAssert(isAddress(contractID), "Invalid contract ID format");

  // Test tokenTx for valid contract interaction
  await ensureValidTransfer(contractID, tokenTx, caller);

  ContractAssert(Number.isInteger(contractInput.qty), "Qty must be an integer");

  /**
   * Refund the order, if it is invalid
   */
  const refundTransfer = () => {
    if (contractID === SmartWeave.contract.id) {
      // No need to make a foreign call because the token is governed by this contract
      state.balances[SmartWeave.contract.id] -= contractInput.qty;
      if (caller in state.balances) {
        state.balances[caller] += contractInput.qty;
      } else {
        state.balances[caller] = contractInput.qty;
      }
    } else {
      state.foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: contractID,
        input: {
          function: "transfer",
          target: caller,
          qty: contractInput.qty,
        },
      });
    }
  };

  // check if the right token is used
  // the first token in the pair has to
  // be the token the user is selling,
  // the second token in the pair has to
  // be the token the user is buying
  const fromToken = usedPair[0];

  if (fromToken !== contractID) {
    // send back the funds that the user sent to this contract
    refundTransfer();

    // return state with the refund foreign call
    // and the error message
    return {
      state,
      result: {
        status: "failure",
        message:
          "Invalid transfer transaction, using the wrong token. The transferred token has to be the first item in the pair",
      },
    };
  }

  // find the pair index
  const pairIndex = pairs.findIndex(
    ({ pair }) => pair.includes(usedPair[0]) && pair.includes(usedPair[1])
  );

  // test if the pair already exists
  if (pairIndex === -1) {
    // send back the funds
    refundTransfer();

    // return state with the refund foreign call
    // and the error message
    return {
      state,
      result: {
        status: "failure",
        message: "This pair does not exist yet",
      },
    };
  }

  // Sort orderbook based on prices
  const sortedOrderbook = state.pairs[pairIndex].orders.sort((a, b) =>
    a.price > b.price ? 1 : -1
  );

  // get the dominant token from the pair
  // it should always be the first one
  const dominantToken = state.pairs[pairIndex].pair[0];

  try {
    // try invoking the match function
    const { orderbook, foreignCalls, matches } = matchOrder(
      {
        pair: {
          dominant: dominantToken,
          from: contractID,
          to: usedPair.find((val) => val !== contractID),
        },
        quantity: contractInput.qty,
        creator: caller,
        transaction: SmartWeave.transaction.id,
        transfer: tokenTx,
        price,
      },
      sortedOrderbook
    );

    // Update orderbook accordingly
    state.pairs[pairIndex].orders = orderbook;

    // calculate latest price and push logs
    // if the order had matches
    if (matches.length > 0) {
      // volume weighted average price
      // how it is calculated:
      // (volume_1 * price_1) + (volume_2 * price_2) + ...
      // divided by
      // volume_1 + volume_2 + ...
      const vwap =
        matches
          .map(({ qty: volume, price }) => volume * price)
          .reduce((a, b) => a + b, 0) /
        matches.map(({ qty: volume }) => volume).reduce((a, b) => a + b, 0);

      // update the latest price data
      state.pairs[pairIndex].priceData = {
        dominantToken,
        block: SmartWeave.block.height,
        vwap,
        matchLogs: matches,
      };
    } else {
      // if no matches, set the latest price data to empty
      state.pairs[pairIndex].priceData = undefined;
    }

    // Update foreignCalls accordingly for tokens to be sent
    for (let i = 0; i < foreignCalls.length; i++) {
      if (foreignCalls[i].contract === SmartWeave.contract.id) {
        // No need to make a foreign call because the token is governed by this contract
        state.balances[SmartWeave.contract.id] -= foreignCalls[i].input.qty;
        if (foreignCalls[i].input.target in state.balances) {
          state.balances[foreignCalls[i].input.target] +=
            foreignCalls[i].input.qty;
        } else {
          state.balances[foreignCalls[i].input.target] =
            foreignCalls[i].input.qty;
        }
      } else {
        state.foreignCalls.push(foreignCalls[i]);
      }
    }

    state.usedTransfers.push(tokenTx);

    return {
      state,
      result: {
        status: "success",
        message: "Order created successfully",
      },
    };
  } catch (e) {
    // if the match function throws an error, refund the transfer
    refundTransfer();

    // return state with the refund foreign call
    // and the error message
    return {
      state,
      result: {
        status: "failure",
        message: e.message,
      },
    };
  }
};

export default function matchOrder(
  input: {
    /** Token of the new order */
    pair: {
      /** The dominant token to calculate the price for */
      dominant: string;
      /** ID of the token the user is trading from */
      from: string;
      /** ID of the token the user is trading for */
      to: string;
    };
    /** Quantity of the order */
    quantity: number;
    /** Address of the order creator */
    creator: string;
    /** Interaction ID */
    transaction: string;
    /** Transfer transaction ID */
    transfer: string;
    /** Optional limit price of the order */
    price?: number;
  },
  orderbook: OrderInterface[]
): {
  orderbook: OrderInterface[];
  foreignCalls: ForeignCallInterface[];
  matches: MatchLogs;
} {
  const orderType = input.price ? "limit" : "market";
  const foreignCalls: ForeignCallInterface[] = [];
  const matches: MatchLogs = [];

  // orders that are made in the *reverse* direction as the current one
  // this order can match with the reverse orders only
  const reverseOrders = orderbook.filter(
    (order) => input.pair.from !== order.token && order.id !== input.transaction
  );

  // if there are no orders against the token we are buying, we only push it
  // but first, we check if it is a limit order
  if (!reverseOrders.length) {
    // ensure that the first order is a limit order
    if (orderType !== "limit")
      throw new Error('The first order for a pair can only be a "limit" order');

    // push to the orderbook
    orderbook.push({
      id: input.transaction,
      transfer: input.transfer,
      creator: input.creator,
      token: input.pair.from,
      price: input.price,
      quantity: input.quantity,
      originalQuantity: input.quantity,
    });

    return {
      orderbook,
      foreignCalls,
      matches,
    };
  }

  // the total amount of tokens the user would receive
  // if the order type is "market", this changes
  // for each order in the orderbook
  // if it is a "limit" order, this will always
  // be the same
  let fillAmount: number;

  // the total amount of tokens the user of
  // the input order will receive
  let receiveAmount = 0;

  // the remaining tokens to be matched with an order
  let remainingQuantity = input.quantity;

  // loop through orders against this order
  for (let i = 0; i < orderbook.length; i++) {
    const currentOrder = orderbook[i];

    // only loop orders that are against this order
    if (
      input.pair.from === currentOrder.token ||
      currentOrder.id === input.transaction
    )
      continue;

    // price of the current order reversed to the input token
    const reversePrice = 1 / currentOrder.price;

    // continue if the current order's price matches
    // the input order's price (if the order is a limit order)
    if (orderType === "limit" && input.price !== reversePrice) continue;

    // set the total amount of tokens we would receive
    // from this order
    fillAmount = remainingQuantity * (input.price ?? reversePrice);

    // the input order creator receives this much
    // of the tokens from the current order
    let receiveFromCurrent = 0;

    // the input order is going to be completely filled
    if (fillAmount <= currentOrder.quantity) {
      // calculate receive amount
      receiveFromCurrent = remainingQuantity * reversePrice;

      // reduce the current order in the loop
      currentOrder.quantity -= fillAmount;

      // fill the remaining tokens
      receiveAmount += receiveFromCurrent;

      // send tokens to the current order's creator
      if (remainingQuantity > 0) {
        foreignCalls.push({
          txID: SmartWeave.transaction.id,
          contract: input.pair.from,
          input: {
            function: "transfer",
            target: currentOrder.creator,
            qty: Math.round(remainingQuantity * 0.98),
          },
        });

        // send fee
        foreignCalls.push({
          txID: SmartWeave.transaction.id,
          contract: input.pair.from,
          input: {
            function: "transfer",
            target: feeWallet,
            qty: Math.round(remainingQuantity * 0.02),
          },
        });
      }

      // no tokens left in the input order to be matched
      remainingQuantity = 0;
    } else {
      // the input order is going to be partially filled
      // but the current order will be

      // calculate receive amount
      receiveFromCurrent = currentOrder.quantity;

      // add all the tokens from the current order to fill up
      // the input order
      receiveAmount += receiveFromCurrent;

      // the amount the current order creator will receive
      const sendAmount = receiveFromCurrent * currentOrder.price;

      // reduce the remaining tokens to be matched
      // by the amount the user is going to receive
      // from this order
      remainingQuantity -= sendAmount;

      // send tokens to the current order's creator
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: input.pair.from,
        input: {
          function: "transfer",
          target: currentOrder.creator,
          qty: Math.round(sendAmount * 0.98),
        },
      });

      // send fee
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: input.pair.from,
        input: {
          function: "transfer",
          target: feeWallet,
          qty: Math.round(sendAmount * 0.02),
        },
      });

      // no tokens left in the current order to be matched
      currentOrder.quantity = 0;
    }

    // calculate dominant token price
    let dominantPrice = 0;

    if (input.pair.dominant === input.pair.from) {
      dominantPrice = input.price ?? reversePrice;
    } else {
      dominantPrice = currentOrder.price;
    }

    // push the match
    matches.push({
      id: currentOrder.id,
      qty: receiveFromCurrent,
      price: dominantPrice,
    });

    // if the current order is completely filled,
    // remove it from the orderbook
    if (currentOrder.quantity === 0) {
      orderbook = orderbook.filter((val) => val.id !== currentOrder.id);
    }

    // if there are no more tokens to be matched,
    // we can break the loop
    if (remainingQuantity === 0) break;
  }

  if (remainingQuantity > 0) {
    // if the input order is not completely filled,
    // and it is a limit order, push it to the orderbook
    if (orderType === "limit") {
      orderbook.push({
        id: input.transaction,
        transfer: input.transfer,
        creator: input.creator,
        token: input.pair.from,
        price: input.price,
        quantity: remainingQuantity,
        originalQuantity: input.quantity,
      });
    } else {
      // if the input order is not completely filled,
      // and it is a market order, we return the funds
      foreignCalls.push({
        txID: SmartWeave.transaction.id,
        contract: input.pair.from,
        input: {
          function: "transfer",
          target: input.creator,
          qty: remainingQuantity,
        },
      });
    }
  }

  // send tokens to the input order's creator
  foreignCalls.push({
    txID: SmartWeave.transaction.id,
    contract: input.pair.to,
    input: {
      function: "transfer",
      target: input.creator,
      qty: Math.round(receiveAmount * 0.98),
    },
  });

  // send fee
  foreignCalls.push({
    txID: SmartWeave.transaction.id,
    contract: input.pair.to,
    input: {
      function: "transfer",
      target: feeWallet,
      qty: Math.round(receiveAmount * 0.02),
    },
  });

  return {
    orderbook,
    foreignCalls,
    matches,
  };
}
