import { OrderInterface, TagsArray } from "./faces";

export const feeWallet = "SMft-XozLyxl0ztM-gPSYKvlZVCBiiftNIb4kGFI7wg";

/**
 * Ensures that the interaction tx is a valid transfer transaction
 *
 * @param tokenID The contract ID of the transferred token
 * @param transferTx The ID of the transfer interaction transaction
 * @param contractID The ID of this contract
 */
export const ensureValidTransfer = async (
  tokenID: string,
  transferTx: string,
  caller: string
) => {
  // Test tokenTx for valid contract interaction
  await ensureValidInteraction(tokenID, transferTx);

  try {
    const tx = await SmartWeave.unsafeClient.transactions.get(transferTx);

    // @ts-ignore
    tx.get("tags").forEach((tag) => {
      if (tag.get("name", { decode: true, string: true }) === "Input") {
        const input: {
          function: string;
          target: string;
          qty: number;
        } = JSON.parse(tag.get("value", { decode: true, string: true }));

        // check if the interaction is a transfer
        ContractAssert(
          input.function === "transfer",
          "The interaction is not a transfer"
        );

        // make sure that the target of the transfer transaction is THIS (the clob) contract
        ContractAssert(
          input.target === getContractID(),
          "The target of this transfer is not this contract"
        );

        // validate the transfer qty
        ContractAssert(input.qty && input.qty > 0, "Invalid transfer quantity");
      }
    });

    // validate the transfer owner
    const transferOwner = tx.get("owner");
    const transferOwnerAddress =
      await SmartWeave.unsafeClient.wallets.ownerToAddress(transferOwner);

    ContractAssert(
      transferOwnerAddress === caller,
      "Transfer owner is not the order creator"
    );
  } catch (err) {
    throw new ContractError(err);
  }
};

export const claimBalance = async (
  tokenID: string,
  transferTx: string,
  caller: string
) => {
  // Test tokenTx for valid contract interaction
  // await ensureValidInteraction(tokenID, transferTx);

  // Use Warp internalWrite to call the `claim` function of contract
  // @ts-expect-error
  const result = await SmartWeave.contracts.write(tokenID, { function: 'claim', txID: transferTx });
  // Check that it succeeded
  if (result.type !== "ok") {
    throw new ContractError(`Unable to make claim with txID: ${transferTx}`)
  }
};

/**
 * Ensures that the interaction is valid
 *
 * @param contractID The contract ID to match the interaction with
 * @param interactionID The ID of the interaction to check
 */
export const ensureValidInteraction = async (
  contractID: string,
  interactionID: string
) => {
  const {
    validity: contractTxValidities,
    // @ts-ignore
  } = await SmartWeave.contracts.readContractState(contractID, undefined, true);

  // The interaction tx of the token somewhy does not exist
  ContractAssert(
    interactionID in contractTxValidities,
    "The interaction is not associated with this contract"
  );

  // Invalid transfer
  ContractAssert(
    contractTxValidities[interactionID],
    "The interaction was invalid"
  );
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
