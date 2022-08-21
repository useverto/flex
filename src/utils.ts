import { TagsArray } from "./faces";

export const feeWallet = "SMft-XozLyxl0ztM-gPSYKvlZVCBiiftNIb4kGFI7wg";

/**
 * Use Warp internalWrite to call the `claim` function of contract
 * @param tokenID Contract ID of token to interact with
 * @param transferTx Transaction of claim
 * @param qty Quantity of tokens being claimed
 */
export const claimBalance = async (
  tokenID: string,
  transferTx: string,
  qty: number
) => {
  // @ts-expect-error
  const result = await SmartWeave.contracts.write(tokenID, {
    function: "claim",
    txID: transferTx,
    qty,
  });
  // Check that it succeeded
  if (result.type !== "ok") {
    throw new ContractError(`Unable to make claim with txID: ${transferTx}`);
  }
};

/**
 * Returns if a string is a valid Arweave address or ID
 *
 * @param addr String to validate
 *
 * @returns Valid address or not
 */
export const isAddress = (addr: string) => /[a-z0-9_-]{43}/i.test(addr);

/**
 * Fixes a tag array / record. This is necessary because of SmartWeave bugs.
 *
 * @param tags Tags to fix
 * @returns Tags array
 */
function tagPatch(
  tags: Record<string, string | string[]> | TagsArray
): TagsArray {
  if (Array.isArray(tags)) return tags;
  const constructedArray: TagsArray = [];

  for (const field in tags) {
    constructedArray.push({
      name: field,
      value: tags[field],
    });
  }

  return constructedArray;
}

/**
 * Get the transaction id of this contract.
 *
 * @returns The CLOB contract ID
 */
export function getContractID() {
  const tags = tagPatch(SmartWeave.transaction.tags);
  const id = tags.find(({ name }) => name === "Contract").value;

  return id as string;
}
