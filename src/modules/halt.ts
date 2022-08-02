import { ActionInterface, StateInterface } from "../faces";

export const Halt = (
  state: StateInterface,
  action: ActionInterface
): StateInterface => {
  const caller = action.caller;

  // Ensure that only the emergency wallet has access to this function
  ContractAssert(
    caller === state.emergencyHaltWallet,
    "Caller cannot halt or resume the protocol"
  );

  return { ...state, halted: !state.halted };
};
