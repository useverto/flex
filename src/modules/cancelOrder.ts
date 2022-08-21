import {
  ActionInterface,
  StateInterface,
  CancelOrderInterface,
} from "../faces";
import { isAddress } from "../utils";

export const CancelOrder = async (
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
  const input: CancelOrderInterface = action.input;

  const orderTxID = input.orderID;

  // Verify order ID
  ContractAssert(isAddress(orderTxID), "Invalid order ID");

  // Remap all orders into one array
  const allOrders = state.pairs.map((pair) => pair.orders).flat(1);

  // Get the order to cancel
  const order = allOrders.find(({ id }) => id === orderTxID);

  // Ensure that the order exists
  ContractAssert(order !== undefined, "Order does not exist");

  // Ensure that the creator of the order is the caller
  ContractAssert(
    order.creator === caller,
    "Caller is not the creator of the order"
  );

  // Send back the *not* filled tokens to the creator of the order
  // @ts-expect-error
  const result = await SmartWeave.contracts.write(order.token, { function: 'transfer', target: caller, qty: order.quantity });

  // Check that it succeeded
  if (result.type !== "ok") {
    throw new ContractError(`Unable to make claim with txID: ${SmartWeave.transaction.id}`)
  }

  // The pair that the order belongs to
  const acitvePair = state.pairs.find((pair) =>
    pair.orders.find(({ id }) => id === orderTxID)
  );

  // Remove cancelled order
  acitvePair.orders = acitvePair.orders.filter(({ id }) => id !== orderTxID);

  return {
    state,
    result: {
      status: "success",
      message: "Order cancelled successfully",
    },
  };
};
