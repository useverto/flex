export interface StateInterface {
  emergencyHaltWallet: string; // Wallet address to be used to halt contract in the event of an emergency
  halted: boolean;
  // TODO: fees
  protocolFeePercent: number; // Percent of orders going to protocol
  pairs: {
    pair: [string, string];
    priceData?: PriceDataInterface;
    orders: OrderInterface[];
  }[];
  usedTransfers: string[]; // list of transfers that have already been used by an order
  invocations: string[];
  foreignCalls: ForeignCallInterface[];
  balances?: { [address: string]: number };
}

export interface ActionInterface {
  input: any;
  caller: string;
}

export interface AddPairInterface {
  function: "addPair";
  pair: string; // Other side to pair that the user wants to initialize
}

export interface CreateOrderInterface {
  function: "createOrder";
  pair: [string, string]; // Pair that user is trading between
  qty: number; // Quantitiy of tokens allowed to this contract for the order
  transaction?: string; // Transaction hash from the token transfer to this contract
  price?: number; // Price of token being sent (optional)
}

export interface CancelOrderInterface {
  function: "cancelOrder";
  orderID: string; // Transaction hash from the order creation contract interaction
}

export interface HaltInterface {
  function: "halt";
}

export interface ReadOutboxInterface {
  function: "readOutbox";
  contract: string;
  id: string;
}

// Other interfaces

export interface OrderInterface {
  id: string; // ID if the order transaction
  transfer: string; // ID of the token transfer
  creator: string;
  token: string; // the token the order is selling
  price: number;
  quantity: number;
  originalQuantity: number; // The original amount of tokens ordered
}

export interface ForeignCallInterface {
  txID: string;
  contract: string;
  input: InvocationInterface;
}

export interface InvocationInterface {
  function: string;
  [key: string | number]: any;
}

interface PriceDataInterface {
  // the id of the token from the pair
  // the price is calculated for
  // "x something / 1 dominantToken"
  dominantToken: string;
  // the block the order was created in
  block: number;
  // volume weighted average price, in
  // "x something / 1 dominantToken"
  vwap: number;
  // logs for this order's matches
  matchLogs: MatchLogs;
}

export type MatchLogs = {
  // the id the order matches with
  id: string;
  // the matched quantity
  qty: number;
  // the price the order matched at
  // in "x something / 1 dominantToken"
  price: number;
}[];

export type TagsArray = {
  name: string;
  value: string | string[];
}[];
