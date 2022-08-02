import { SmartWeaveGlobal } from "smartweave/lib/smartweave-global";

declare global {
  var SmartWeave: SmartWeaveGlobal;
  var ContractAssert: (condition: boolean, msg: string) => void;
  var ContractError: {
    new (message?: string): Error;
    (message?: string): Error;
    readonly prototype: Error;
  };
}
