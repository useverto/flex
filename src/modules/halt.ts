import { ActionInterface, StateInterface } from "../faces";

export const Halt = (
  state: StateInterface,
  action: ActionInterface
): {
  state: StateInterface;
  result: {
    status: "success" | "failure";
    message: string;
  };
} => {
  const caller = action.caller;

  // Ensure that only the emergency wallet has access to this function
  ContractAssert(
    caller === state.emergencyHaltWallet,
    "Caller cannot halt or resume the protocol"
  );

  state.halted = !state.halted;

  return {
    state,
    result: {
      status: "success",
      message: "Successfully toggled Verto Flex halting",
    },
  };
};
