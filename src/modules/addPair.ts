import { ActionInterface, StateInterface, AddPairInterface } from "../faces";
import { getContractID } from "../utils";

export const AddPair = async (
  state: StateInterface,
  action: ActionInterface
): Promise<StateInterface> => {
  const caller = action.caller;
  const input: AddPairInterface = action.input;

  const pairs = state.pairs;
  const newPair = input.pair;

  ContractAssert(newPair !== getContractID(), "Cannot add self as a pair");

  // Test if pair already exists
  ContractAssert(
    !pairs.find(({ pair: existingPair }) => existingPair.includes(newPair)),
    "This pair already exists"
  );

  // Test that pairs are valid contract strings
  ContractAssert(/[a-z0-9_-]{43}/i.test(newPair), "Pair contract is invalid");

  // Test that pair is a valid contract
  try {
    // Pull the latest contract state
    const tokenState = await SmartWeave.contracts.readContractState(newPair);
    // Ensure contract has ticker and balances
    ContractAssert(
      tokenState?.ticker && tokenState?.balances,
      "Contract is not a valid token"
    );
    // Ensure contract has a valid ticker
    ContractAssert(
      typeof tokenState.ticker === "string",
      "Contract ticker is not a string"
    );
    // Check each address in the balances object
    for (const addr in tokenState.balances) {
      ContractAssert(
        typeof tokenState.balances[addr] === "number",
        `Invalid balance for "${addr}" in contract "${newPair}"`
      );
    }
    // Check if the token is tradeable
    // The owner of the contract can define this
    // at "state.settings", with the setting name
    // isTradeable
    const tradeableSetting = tokenState?.settings?.find(
      ([settingName]) => settingName === "isTradeable"
    )?.[1];

    ContractAssert(
      tradeableSetting === true || tradeableSetting === undefined,
      `This token does not allow trading (${newPair})`
    );

    // Check if the token supports the foreign call protocol
    // (has the foreignCalls and the invocations array)
    ContractAssert(
      !!tokenState.invocations,
      'Contract does not have an "invocations" filed, making it incompatible with FCP'
    );
    ContractAssert(
      !!tokenState.foreignCalls,
      'Contract does not have an "foreignCalls" filed, making it incompatible with FCP'
    );
  } catch (e) {
    throw new ContractError(e);
  }

  state.pairs.push({
    pair: [getContractID(), newPair],
    orders: [],
  });

  return state;
};
