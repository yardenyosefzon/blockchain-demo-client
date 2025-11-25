import axios from 'axios';
import type {
  ApiWallet,
  WalletBalanceResponse,
  BuildSignRequest,
  BuildSignResponse,
  TransactionApproveRequest,
  MineBlockResponse,
  ValidateResponse,
  Wallet,
  Transaction,
  Block,
  ApiResponseEnvelope,
  ApiResult,
  CanSpendResponse,
  PrizeResponse,
  UpdateBlockRequest,
  BlockValidationResult,
} from './api.types';

export * from './api.types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error),
);

const toErrorMessage = (error: ApiResponseEnvelope<unknown>['error']): string | null => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error
      .map((part) => (typeof part === 'string' ? part : String(part ?? '')))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof error === 'object') {
    const { message } = error as { message?: unknown };
    if (typeof message === 'string') return message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};

const isApiEnvelope = (payload: unknown): payload is ApiResponseEnvelope<unknown> => {
  if (typeof payload !== 'object' || payload === null) return false;
  return 'success' in payload && ('data' in payload || 'error' in payload);
};

const toApiResult = <T>(payload: ApiResponseEnvelope<T> | T): ApiResult<T> => {
  if (isApiEnvelope(payload)) {
    return {
      data: payload.data as T,
      success: payload.success !== false,
      error: toErrorMessage(payload.error),
    };
  }

  return {
    data: payload as T,
    success: true,
    error: null,
  };
};

const ensureResponseData = <T>(payload: ApiResponseEnvelope<T> | T): T => {
  const result = toApiResult<T>(payload);
  if (!result.success) {
    throw new Error(result.error ?? 'Request failed');
  }
  return result.data;
};

const toNumericValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const normalizePendingBalances = (data: CanSpendResponse): Record<string, number> => {
  if (Array.isArray(data)) {
    return data.reduce<Record<string, number>>((acc, entry) => {
      const accCopy = acc;
      const address = entry?.address;
      if (!address) return acc;
      const value = toNumericValue(entry.value);
      if (value === undefined) return acc;
      accCopy[address] = value;
      return accCopy;
    }, {});
  }

  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).reduce<Record<string, number>>((acc, [address, value]) => {
      const accCopy = acc;
      const numeric = toNumericValue(value);
      if (address && numeric !== undefined) accCopy[address] = numeric;
      return accCopy;
    }, {});
  }

  return {};
};

const parsePrizeValue = (data: PrizeResponse): number | undefined => {
  const tryNumeric = (value: unknown): number | undefined => toNumericValue(value);

  if (typeof data === 'number') return data;

  if (typeof data === 'string') {
    return tryNumeric(data);
  }

  if (typeof data === 'object' && data !== null) {
    return (
      tryNumeric((data as { prize?: unknown }).prize) ??
      tryNumeric((data as { reward?: unknown }).reward) ??
      tryNumeric((data as { amount?: unknown }).amount) ??
      tryNumeric((data as { value?: unknown }).value)
    );
  }

  return tryNumeric(data);
};

const toBooleanOrNull = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
};

const normalizeValidationEntries = (value: unknown): BlockValidationResult['entries'] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null;
      const candidate = entry as { index?: unknown; valid?: unknown; status?: unknown };
      const index = toNumericValue(candidate.index);
      if (index === undefined) return null;
      const valid = toBooleanOrNull(candidate.valid) ?? toBooleanOrNull(candidate.status) ?? null;
      if (valid === null) return null;
      return { index, valid };
    })
    .filter((entry): entry is BlockValidationResult['entries'][number] => entry !== null);
};

const parseValidationResult = (payload: ValidateResponse | boolean): BlockValidationResult => {
  if (typeof payload === 'boolean') {
    return { isValid: payload, entries: [] };
  }

  const rawValid =
    payload.valid !== undefined && !Array.isArray(payload.valid)
      ? toBooleanOrNull(payload.valid)
      : null;
  const rawStatus = toBooleanOrNull(payload.status);

  const entries = [
    ...normalizeValidationEntries(payload.valid),
    ...normalizeValidationEntries(payload.results),
    ...normalizeValidationEntries(payload.blocks),
  ];

  const uniqueEntries = Array.from(
    entries.reduce<Map<number, BlockValidationResult['entries'][number]>>((acc, entry) => {
      if (!acc.has(entry.index) || acc.get(entry.index)?.valid !== entry.valid) {
        acc.set(entry.index, entry);
      }
      return acc;
    }, new Map()),
  ).map(([, entry]) => entry);

  const fallbackValid =
    uniqueEntries.length > 0 ? uniqueEntries.every((entry) => entry.valid) : true;

  return {
    isValid: rawValid ?? rawStatus ?? fallbackValid,
    entries: uniqueEntries,
  };
};

const mapWallet = (wallet: ApiWallet): Wallet => {
  const publicKey = wallet.public_key ?? wallet.public ?? '';
  return {
    address: wallet.address,
    name: wallet.name,
    publicKey,
    privateKey: wallet.private_key,
    balance: wallet.balance,
  };
};

export async function getWallets(): Promise<Wallet[]> {
  const res = await api.get<ApiResponseEnvelope<ApiWallet[]>>('/wallet');
  const wallets = ensureResponseData<ApiWallet[]>(res.data);
  return wallets.map(mapWallet);
}

export async function createWallet(name?: string): Promise<Wallet> {
  const payload = name ? { name } : undefined;
  const res = await api.post<ApiResponseEnvelope<ApiWallet>>('/wallet/create', payload);
  const wallet = ensureResponseData<ApiWallet>(res.data);
  return mapWallet(wallet);
}

export async function getWalletBalance(address: string): Promise<number> {
  const res = await api.post<ApiResponseEnvelope<WalletBalanceResponse | number>>(
    '/wallet/balance',
    { address },
  );
  const data = ensureResponseData<WalletBalanceResponse | number>(res.data);
  if (typeof (data as WalletBalanceResponse)?.balance === 'number') {
    return (data as WalletBalanceResponse).balance;
  }
  return Number(data);
}

export async function buildAndSignTransaction(
  payload: BuildSignRequest,
): Promise<BuildSignResponse> {
  const res = await api.post<ApiResponseEnvelope<BuildSignResponse>>(
    '/transaction/build_sign',
    payload,
  );
  return ensureResponseData<BuildSignResponse>(res.data);
}

export async function approveTransaction(payload: TransactionApproveRequest) {
  const res = await api.post<ApiResponseEnvelope<unknown>>('/transaction/approve', payload);
  return ensureResponseData(res.data);
}

export async function mineBlock(miner: string): Promise<MineBlockResponse> {
  const res = await api.post<ApiResponseEnvelope<MineBlockResponse>>('/mine', { miner });
  return ensureResponseData<MineBlockResponse>(res.data);
}

export async function getChain(): Promise<Block[]> {
  const res = await api.get<ApiResponseEnvelope<Block[]>>('/chain');
  return ensureResponseData<Block[]>(res.data);
}

export async function validateChain(): Promise<BlockValidationResult> {
  const res = await api.get<ApiResponseEnvelope<ValidateResponse | boolean>>('/validate');
  const data = ensureResponseData<ValidateResponse | boolean>(res.data);
  return parseValidationResult(data);
}

export async function getMempool(): Promise<Transaction[]> {
  const res = await api.get<ApiResponseEnvelope<Transaction[]>>('/mempool');
  return ensureResponseData<Transaction[]>(res.data);
}

export async function getPrize(): Promise<number> {
  const res = await api.get<ApiResponseEnvelope<PrizeResponse>>('/prize');
  const prizeData = ensureResponseData<PrizeResponse>(res.data);
  const prizeValue = parsePrizeValue(prizeData);
  if (prizeValue === undefined || Number.isNaN(prizeValue)) {
    throw new Error('Invalid prize data received');
  }
  return prizeValue;
}

export async function fetchPendingBalances(addresses: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(addresses.filter(Boolean)));
  if (unique.length === 0) return {};

  const res = await api.post<ApiResponseEnvelope<CanSpendResponse>>('/pending_balance', {
    addresses: unique,
  });
  const data = ensureResponseData<CanSpendResponse>(res.data);
  return normalizePendingBalances(data);
}

export async function updateBlock(payload: UpdateBlockRequest) {
  const res = await api.post<ApiResponseEnvelope<unknown>>('/block/', payload);
  return ensureResponseData(res.data);
}

export async function remineBlock(index: number) {
  const res = await api.post<ApiResponseEnvelope<unknown>>('/block/remine', { index });
  return ensureResponseData(res.data);
}

export default api;
