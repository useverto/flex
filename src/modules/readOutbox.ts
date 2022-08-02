import {
  ActionInterface,
  StateInterface,
  ReadOutboxInterface,
  ForeignCallInterface,
} from "../faces";
import { getContractID } from "../utils";

export const ReadOutbox = async (
  state: StateInterface,
  action: ActionInterface,
  handle: (res: StateInterface, { caller: string, input: object }) => any
): Promise<StateInterface> => {
  const input: ReadOutboxInterface = action.input;

  // Ensure that a contract ID is passed
  ContractAssert(!!input.contract, "Missing contract to invoke");

  // Ensure that we are not reading our own outbox
  ContractAssert(input.contract !== getContractID(), "Cannot read own outbox");

  // Read the state of the foreign contract
  const foreignState = await SmartWeave.contracts.readContractState(
    input.contract
  );

  // Check if the foreign contract supports the foreign call protocol and compatible with the call
  ContractAssert(
    !!foreignState.foreignCalls,
    "Contract is missing support for foreign calls"
  );

  // Get foreign calls for this contract that have not been executed
  const calls: ForeignCallInterface[] = foreignState.foreignCalls.filter(
    (element: ForeignCallInterface) =>
      element.contract === SmartWeave.contract.id &&
      !state.invocations.includes(element.txID)
  );

  // Run all invocations
  let res = state;

  for (const entry of calls) {
    // Run invocation
    res = (await handle(res, { caller: input.contract, input: entry.input }))
      .state;
    // Push invocation to executed invocations
    res.invocations.push(entry.txID);
  }

  return res;
};
