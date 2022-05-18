export const NEO = '0xc56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b';
export const GAS = '0x602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7';
type ArgumentDataType = 'String' | 'Boolean' | 'Hash160' | 'Hash256' | 'Integer' | 'ByteArray' | 'Array' | 'Address';
export const ERRORS = {
    NO_PROVIDER: {
        type: 'NO_PROVIDER',
        description: 'Could not find an instance of the dAPI in the webpage',
        data: null
    },
    CONNECTION_DENIED: {
        type: 'CONNECTION_DENIED',
        description: 'The dAPI provider refused to process this request',
        data: null
    },
    RPC_ERROR: {
        type: 'RPC_ERROR',
        description: 'An RPC error occured when submitting the request',
        data: null
    },
    MALFORMED_INPUT: {
        type: 'MALFORMED_INPUT',
        description: 'Please check your input',
        data: null
    },
    CANCELLED: {
        type: 'CANCELED',
        description: 'The user cancels, or refuses the dapps request',
        data: null
    },
    INSUFFICIENT_FUNDS: {
        type: 'INSUFFICIENT_FUNDS',
        description: 'The user does not have a sufficient balance to perform the requested action',
        data: null
    },
    DEFAULT: {
        type: 'FAIL',
        description: 'The request failed.',
        data: null
    }
};
export enum EVENT {
    READY = 'dVITAWallet.EVENT.READY',
    ACCOUNT_CHANGED = 'dVITAWallet.EVENT.ACCOUNT_CHANGED',
    CONNECTED = 'dVITAWallet.EVENT.CONNECTED',
    DISCONNECTED = 'dVITAWallet.EVENT.DISCONNECTED',
    NETWORK_CHANGED = 'dVITAWallet.EVENT.NETWORK_CHANGED'
}

export enum requestTarget {
    Provider = 'dvita.target_provider',
    Networks = 'dvita.target_networks',
    Account = 'dvita.target_account',
    AccountPublicKey = 'dvita.target_public_key',
    Balance = 'dvita.target_balance',
    Storage = 'dvita.target_storage',
    InvokeRead = 'dvita.target_invoke_read',
    Transaction = 'dvita.target_transaction',
    Block = 'dvita.target_block',
    ApplicationLog = 'dvita.target_application_log',
    Invoke = 'dvita.target_invoke',
    SignMessage = 'dvita.target_sign_message',
    Deploy = 'dvita.target_deploy',
    Send = 'dvita.target_send',
    Connect = 'dvita.target_connect',
    AuthState = 'dvita.target_auth_state',
    Login = 'dvita.target_login'
}

export interface Provider {
    name: string;
    website: string;
    version: string;
    compatibility: string[];
    extra: object;
}


export interface Networks {
    networks: string[]; // Array of network names the wallet provider has available for the dapp developer to connect to.
    defaultNetwork: string; // Network the wallet is currently set to.
}

export interface Account {
    address: string; // Address of the connected account
    label?: string; // A label the users has set to identify their wallet
}

export interface AccountPublicKey {
    address: string; // Address of the connected account
    publicKey: string; // Public key of the connected account
}
export interface GetBalanceArgs {
    params?: BalanceRequest[];
}

export interface BalanceRequest {
    address: string; // Address to check balance(s)
    contracts: string[];
}

export interface BalanceResults {
    [address: string]: Balance[];
}

export interface Balance {
    assetID: string;
    symbol: string;
    amount: string;
}

export interface GetStorageArgs {
    scriptHash: string; // script hash of the smart contract to invoke a read on
    key: string; // key of the storage value to retrieve from the contract
    network?: string; // Network to submit this request to. If omitted, will default to network the wallet is currently set to.
}

export interface StorageResponse {
    result: string; // The raw value that's stored in the contract
}

export interface InvokeReadArgs {
    scriptHash: string; // script hash of the smart contract to invoke a read on
    operation: string; // operation on the smart contract to call
    args: Argument[]; // any input arguments for the operation
    network?: string;  // Network to submit this request to.If omitted, will default to network the wallet is currently set to.
}

export interface Argument {
    type: ArgumentDataType;
    value: any;
}

export interface Response {
    result: boolean;
}

export interface TransactionInputArgs {
    txid: string;
    network?: string;
}

export interface TransactionDetails {
    txid: string;
    size: number;
    type: string;
    version: number;
    attributes: TransactionAttribute[];
    vin: any[];
    vout: any[];
    sys_fee: string;
    net_fee: string;
    scripts: TransactionScript[];
    script: string;
    gas: string;
    blockhash: string;
    confirmations: number;
    blocktime: number;
}
interface TransactionAttribute {
    usage: string;
    data: string;
}
interface TransactionScript {
    invocation: string;
    verification: string;
}

export interface InvokeArgs {
    scriptHash: string; // script hash of the smart contract to invoke
    operation: string; // operation on the smart contract to call
    args: Argument[]; // any input arguments for the operation
    fee?: string; // (Optional) The parsed amount of network fee (in GAS) to include with transaction
    network?: string; // Network to submit this request to. If omitted, will default to network the wallet is currently set to.
    attachedAssets?: AttachedAssets;
    broadcastOverride?: boolean;
    // In the case that the dApp would like to be responsible for broadcasting the signed transaction rather than the wallet provider
    assetIntentOverrides?: AssetIntentOverrides;
    // A hard override of all transaction utxo inputs and outputs.
    // IMPORTANT: If provided, fee and attachedAssets will be ignored.

    triggerContractVerification?: boolean; // Adds the instruction to invoke the contract verification trigger
    txHashAttributes?: TxHashAttribute[]; // Adds transaction attributes for the "Hash<x>" usage block
}

export interface Invoke {
    scriptHash: string;
    operation: string;
    args?: Argument[];
    attachedAssets?: AttachedAssets;
    triggerContractVerification?: boolean;
}
interface AttachedAssets {
    NEO?: string;
    GAS?: string;
}
// KEY: Asset symbol (only NEO or GAS)
// VALUE: Parsed amount to attach

interface AssetIntentOverrides {
    inputs: AssetInput[];
    outputs: AssetOutput[];
}

interface AssetInput {
    txid: string;
    index: number;
}

interface AssetOutput {
    asset: string;
    address: number;
    value: string;
}

export interface TxHashAttribute extends Argument {
    txAttrUsage: 'Hash1' | 'Hash2' | 'Hash3' | 'Hash4' | 'Hash5' | 'Hash6' | 'Hash7' | 'Hash8' |
    'Hash9' | 'Hash10' | 'Hash11' | 'Hash12' | 'Hash13' | 'Hash14' | 'Hash15';
}

export interface SendArgs {
    fromAddress: string; // Address of the connected account to send the assets from
    toAddress: string; // Address of the receiver of the assets to be sent
    asset: string; // Asset script hash to be sent. Accepts asset symbol only for "MainNet"
    amount: string; // The parsed amount of the asset to be sent
    remark?: string; // (Optional) Description of the transaction to be made
    fee?: string; // (Optional) The parsed amount of network fee (in GAS) to include with transaction
    network?: string; //  Network to submit this request to. If omitted, will default to network the wallet is currently set to.
    broadcastOverride?: boolean;
    // In the case that the dApp would like to be responsible for broadcasting the signed transaction rather than the wallet provider
}

export interface SendOutput {
    txid: string; // The transaction ID of the send invocation
    nodeUrl?: string; // The node which the transaction was broadcast to. Returned if transaction is broadcast by wallet provider
    signedTx?: string; // The serialized signed transaction. Only returned if the broadcastOverride input argument was set to True
}

export interface GetBlockInputArgs {
    blockHeight: number;
    network?: string;
}

export interface DeployArgs {
    name: string;
    version: string;
    author: string;
    email: string;
    description: string;
    needsStorage?: boolean;
    dynamicInvoke?: boolean;
    isPayable?: boolean;
    parameterList: string;
    returnType: string;
    code: string;
    script?: string;
    network?: string;  // Network to submit this request to. If omitted, will default to network the wallet is currently set to.
    netowrkFee: number;
    broadcastOverride?: boolean;
    // In the case that the dApp would like to be responsible for broadcasting the signed transaction rather than the wallet provider
}
export interface DeployOutput {
    txid: string;
    nodeUrl?: string; // The node which the transaction was broadcast to. Returned if transaction is broadcast by wallet provider
    signedTx?: string; // The serialized signed transaction. Only returned if the broadcastOverride input argument was set to True
}


export interface Error {
    type: string; // `NO_PROVIDER`|`CONNECTION_DENIED`
    description: string;
    data: string;
}