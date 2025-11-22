export type ApiWallet = {
  address: string;
  name?: string;
  public_key?: string;
  public?: string;
  private_key?: string;
  balance?: number;
};

export type WalletBalanceResponse = {
  balance: number;
};

export type BuildSignRequest = {
  sender_address: string;
  receiver_address: string;
  amount: number;
  fee?: number;
  note?: string;
  private_key?: string;
};

export type BuildSignResponse = {
  tx: unknown;
  pub: string;
  sign: string;
};

export type TransactionApproveRequest = {
  tx: unknown;
  pub: string;
  sign: string;
};

export type UpdateBlockRequest = {
  index: number;
  previous_hash: string;
};

export type ApiTransaction = {
  sender?: string;
  receiver?: string;
  sender_address?: string;
  receiver_address?: string;
  amount: number;
  fee?: number;
  note?: string;
  hash?: string;
  status?: string;
};

export type ApiGenesisAllocation = {
  receiver_address?: string;
  value?: number;
};

export type ApiCoinbase = {
  amount?: number;
  receiver_address?: string;
  sender_address?: string | null;
};

export type ApiBlockData = {
  type?: string;
  transactions?: ApiTransaction[];
  coinbase?: ApiCoinbase;
  alloc?: ApiGenesisAllocation[];
};

export type ApiBlock = {
  index: number;
  hash: string;
  previous_hash: string;
  difficulty?: number;
  mining_time?: number;
  timestamp?: string;
  transactions?: ApiTransaction[];
  data?: ApiBlockData;
};

export type MineBlockResponse = {
  message?: string;
  block?: ApiBlock;
};

export type BlockValidationDetail = {
  index?: number;
  valid?: boolean;
  status?: boolean;
};

export type ValidateResponse = {
  valid?: boolean | BlockValidationDetail[];
  status?: string | boolean;
  results?: BlockValidationDetail[];
  blocks?: BlockValidationDetail[];
};

export type BlockValidationResultEntry = {
  index: number;
  valid: boolean;
};

export type BlockValidationResult = {
  isValid: boolean;
  entries: BlockValidationResultEntry[];
};

export type Wallet = {
  address: string;
  name?: string;
  publicKey: string;
  privateKey?: string;
  balance?: number;
};

export type Transaction = ApiTransaction;

export type Block = ApiBlock;

export type ApiResponseEnvelope<T> = {
  data?: T;
  success?: boolean;
  error?: string | string[] | Record<string, unknown> | null;
};

export type ApiResult<T> = {
  data: T;
  success: boolean;
  error?: string | null;
};

export type CanSpendRequest = {
  addresses: string[];
};

export type CanSpendEntry = {
  address?: string;
  pending?: number;
  balance?: number;
  can_spend?: number;
  amount?: number;
  value?: number;
};

export type CanSpendResponse = Record<string, number> | CanSpendEntry[];

export type PrizeResponse =
  | number
  | string
  | {
      prize?: number | string;
      reward?: number | string;
      amount?: number | string;
      value?: number | string;
    };
