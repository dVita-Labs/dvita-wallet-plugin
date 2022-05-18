import { env } from './sharedEnvironment';
// Do not import anything except sharedEnvironment in this file because it's used in different typescript projects ('src' and 'extension')

export type Network = 'MainNet' | 'TestNet'

export const baseURL = (net: Network) => net === 'TestNet' ? env.apiURLTestNet : env.apiURLMainNet;

const infoURL = (net: Network) => `${baseURL(net)}/blockchain/info`;
export const balanceURL = (net: Network, address: string, assetHash?: string) =>
    `${baseURL(net)}/wallet/balance/${address}${assetHash ? `/token/${assetHash}` : ''}`;
const broadcastURL = (net: Network) => `${baseURL(net)}/transaction/broadcast`;
const txURL = (net: Network, txId: string) => `${baseURL(net)}/blockchain/transaction/hash/${txId}`;
const txsURL = (net: Network, address: string) => `${baseURL(net)}/wallet/transfers/${address}`;
const feesURL = (net: Network, script: string, length: string) => `${baseURL(net)}/transaction/fees/${script}/${length}`;
export const explorerURL = (net: Network, suffix: string) =>
    `${net === 'TestNet' ? env.explorerURLTestNet : env.explorerURLMainNet}/${suffix}`;
const allAssetsURL = (net: Network) => `${baseURL(net)}/assets/all`;
const assetURL = (net: Network, assetHash: string) => `${baseURL(net)}/assets/hash/${assetHash}`;
const contractURL = (net: Network, hash: string) => `${baseURL(net)}/contracts/hash/${hash}`;

const supportedNets: Network[] = ['MainNet', 'TestNet'];
export function validNetwork(maybeNetwork: unknown): Network {
    return typeof maybeNetwork === 'string' && supportedNets.includes(maybeNetwork)
        ? maybeNetwork
        : 'TestNet'; // for now we have only test net
        // : 'MainNet';
}

interface Asset {
  hash: string;
  code: string;
  name: string;
  decimals: string;
  metadata: {
    description: string;
    explorerUrl: string;
    homePageUrl: string;
    icon: string;
    previewIcon: string;
  };
}

interface MaybeAsset {
  hash: string;
  code: '';
  name: '';
}

export interface BalanceResponse {
    "asset": Asset;
    "address": string;
    "amount": string;
    "formatted": string;
}

/**
 * If object contains "status" key, does nothing, otherwise wraps object in { status: success, data: obj }
 * Useful to make the app work with both kinds of http responses: plain and json-rpc
 */
export function addJsonRPCCompliance(res: any) {
    if (typeof res === 'object' && 'status' in res) {
        return res;
    } else {
        return { status: 'success', data: res };
    }
}

export interface TransactionResponse {
    blockHash: string;
    blockIndex: string;
    index: string;
    hash: string;
    size: string;
    version: string;
    nonce: string;
    sender: string;
    sysfee: string;
    netfee: string;
    script: string;
    timestamp: number;
}

export interface InfoResponse {
    blockchain: string;
    networkName: string;
    networkId: string;
    synchronized: boolean;
    lastBlock: string;
}

export type BroadcastResponse = {
    status: 'ANNOUNCED';
    transaction: {
        hash: string;
    }
} | {
    status: 'FAILED';
    error: string;
}

export interface TransferResponse {
    type: 'RECEIVED' | 'SENT';
    blockIndex: number;
    txHash: string;
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    asset: Asset;
}

export interface FeesResponse {
    systemFee: string;
    networkFee: string;
}

export async function fetchBlockHeight(net: Network) {
    return Number((await fetchJSON<InfoResponse>(infoURL(net))).lastBlock);
}

export async function broadcast(net: Network, hexSerializedTx: string) {
    return fetchJSON<BroadcastResponse>(broadcastURL(net), { method: 'POST', body: hexSerializedTx });
}

export function txsByAddress(net: Network, address: string, count: number, maxId: number = -1, assetId?: string) {
    return fetchJSON<TransferResponse[]>(txsURL(net, address));
}

export function tx(net: Network, txId: string) {
    return fetchJSON<TransactionResponse>(txURL(net, txId));
}

export function fees(net: Network, script: string, serializedTxLength: number) {
    return fetchJSON<FeesResponse>(feesURL(net, script, String(serializedTxLength)))
        .catch((err): FeesResponse => {
            console.warn('Failed to fetch fees, will use mock response.', err)
            return {
                networkFee: "1234",
                systemFee: "5678",
            };
        });
}

export function asset(net: Network, assetHash: string): Promise<Asset> {
    return fetchJSON<Asset | MaybeAsset>(assetURL(net, assetHash))
        .then((asset) => {
            const hasInfo = (a): a is Asset => !!a.code;
            return hasInfo(asset) ? asset : fallbackAsset(asset.hash);
        })
}

/**
 * If assetHash is defined, fetches balance for that asset
 * If assetHash is undefined, fetches balance for all well-known assets
 */
export function balance(net: Network, address: string, assetHash?: string): Promise<BalanceResponse[]> {
    return fetchJSON<BalanceResponse[] | (BalanceResponse | undefined)>(balanceURL(net, address, assetHash))
        .then(balanceOrBalances => (
            Array.isArray(balanceOrBalances)
                ? balanceOrBalances
                : balanceOrBalances
                    ? [balanceOrBalances]
                    : fallbackBalance(net, address, assetHash) // server returns 200 without body
                        .then(bal => [bal])
        ))
        .then((balances): BalanceResponse[] => {
            // If DVITA or DVG is missing from the response, assume it's 0 and add
            const hasDVITA = balances.some(balance => balance.asset.hash === env.tokenHashDVITA)
            if (!hasDVITA) {
                balances.push({
                    asset: {
                        ...fallbackAsset(env.tokenHashDVITA),
                        code: "DVITA",
                        name: "DVITA",
                    },
                    address: address,
                    amount: "0",
                    formatted: "0",
                })
            }
            const hasDVG = balances.some(balance => balance.asset.hash === env.tokenHashDVG)
            if (!hasDVG) {
                balances.push({
                    asset: {
                        ...fallbackAsset(env.tokenHashDVG),
                        code: "DVG",
                        name: "DVG",
                    },
                    address: address,
                    amount: "0",
                    formatted: "0",
                })
            }
            return balances;
        })
        .then((balances): BalanceResponse[] =>
            // fill assets with default values
            balances.map((balance): BalanceResponse => {
                const defaultValues = fallbackAsset(balance.asset.hash);
                return {
                    ...balance,
                    asset: {
                        ...defaultValues,
                        ...balance.asset,
                        metadata: {
                            ...defaultValues.metadata,
                            ...balance.asset.metadata,
                        },
                    },
                };
            })
        )
        .catch(err => {
            console.error('Error fetching balance, falling back to 0', err);
            return assetHash
                ? fallbackBalance(net, address, assetHash).then(bal => [bal])
                : [];
        });
}

function fallbackBalance(net: Network, address: string, assetHash: string): Promise<BalanceResponse> {
    return asset(net, assetHash)
        .then(asset => ({
            asset: asset,
            address: address,
            amount: String(0),
            formatted: String(0),
        }));
}

function fallbackAsset(assetHash: string): Asset {
    return {
        hash: assetHash,
        code: assetHash,
        name: assetHash,
        decimals: String(0),
        metadata: {
            description: assetHash,
            explorerUrl: '',
            homePageUrl: '',
            icon: '',
            previewIcon: '',
        },
    };
}

export function allAssets(net: Network) {
    return fetchJSON<Asset[]>(allAssetsURL(net));
}

export async function fetchJSON<T extends object>(url: string, options?: Parameters<typeof fetch>[1]): Promise<T> {
    const resp = await fetch(url, options);
    if (!resp.ok) {
        throw new Error(`Could not fetch ${url}: ${resp.statusText}`);
    }
    const text = await resp.text(); // server can return 200 without body, in this case resp.json() will fail
    return text ? JSON.parse(text) : undefined;
}

interface Argument {
    type: 'String' | 'Boolean' | 'Hash160' | 'Hash256' | 'Integer' | 'ByteArray' | 'Array' | 'Address';
    value: any;
}

interface Signer {
    account: string;
    scopes: number; // any combination of 0 | 1 | 16 | 32 | 128, values are tx.WitnessScope from 'neon-core'
    allowedContracts?: string[];
    allowedGroups?: string[];
}

export interface InvokeArgs {
    scriptHash: string;
    operation: string;
    args: Argument[];
    fee?: string;
    broadcastOverride?: boolean;
    signers: Signer[];
}

export function contract(net: Network, hash: string): Promise<ContractResponse> {
    return fetchJSON<ContractResponse>(contractURL(net, hash));
}

interface ContractResponse {
  code?: string;
  name?: string;
  script?: string;
  description?: string;
  metadata?: string;
  scriptHash?: string;
  address?: string;
  ownerAddress?: string;
  createdDate?: string;
  transaction?: TransactionResponse;
  token: {
    type: string;
    symbol: string;
    name: string;
    decimals: number;
    scriptHash?: string;
    address?: string;
    ownerAddress?: string;
    iconUrl?: string;
    contract?: string;
    transaction?: TransactionResponse;
  };
}
