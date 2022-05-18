import {
    Component,
    OnInit,
    AfterViewInit
} from '@angular/core';
import {
    ActivatedRoute,
} from '@angular/router';
import {
    AssetState,
    NeonService,
    HttpService,
    GlobalService,
    ChromeService,
    TransactionState
} from '@/app/core';
import {
    Balance, NEO
} from '@/models/models';
import {
    Transaction
} from '@cityofzion/neon-core/lib/tx';
import {
    TransferService
// } from '@/app/transfer/transfer.service';
} from '@/app/popup/transfer/transfer.service';
import { ERRORS, requestTarget } from '@/models/dapi';
import { rpc, wallet, u } from '@cityofzion/neon-core';
import { MatDialog } from '@angular/material/dialog';
import { PopupEditFeeDialogComponent } from '../../_dialogs';
import { bignumber } from 'mathjs';
import { FeeSpeed } from '../../_lib/type';
import { MAGIC_NUMBER_TESTNET, MAGIC_NUMBER_MAINNET } from '../../_lib';
import { Neo3TransferService } from '@/app/popup/transfer/neo3-transfer.service';
import { DVITA_TOKEN, DVITA_CODE, DVG_CODE } from '@/app/popup/_lib/neo3';
import { PopupTransferSuccessDialogComponent } from '@app/popup/_dialogs';
import { disassemble } from '@/utils/disassemble';
import { contract, Network } from '@/shared';

@Component({
    templateUrl: 'transfer.component.html',
    styleUrls: ['transfer.component.scss']
})
export class PopupNoticeTransferComponent implements OnInit, AfterViewInit {

    public dataJson: any = {};
    public rateCurrency = '';
    public txSerialize = ''
    public assetImageUrl: string = '';
    public tx: Transaction;
    public money = '';
    public feeMoney = '0';
    public totalMoney = '';

    public balance: Balance;
    public creating = false;
    public fromAddress: string = '';
    public toAddress: string = '';
    public assetId: string = '';
    public symbol: string = '';
    public amount: string = '0';
    public remark: string = '';
    private network: string = '';
    public loading = false;
    public loadingMsg: string;
    public wallet: any;

    public fee: number;
    public init = false;
    private broadcastOverride = false;
    private messageID: string | number = 0;
    private rawTx?: string;

    public net: Network;
    constructor(
        private aRoute: ActivatedRoute,
        private asset: AssetState,
        private transfer: TransferService,
        private neo3Transfer: Neo3TransferService,
        private neon: NeonService,
        private http: HttpService,
        private global: GlobalService,
        private chrome: ChromeService,
        private txState: TransactionState,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.rateCurrency = this.asset.rateCurrency
        this.wallet = this.neon.wallet;
        this.aRoute.queryParams.subscribe((paramsRaw: any) => {
            this.net = this.global.net;
            const params: Params = parseParams(paramsRaw);
            if (paramsRaw.rawTx) {
                this.rawTx = paramsRaw.rawTx;
                contract(this.net, params.asset)
                    .then((response) => {
                        this.symbol = response.token.symbol;
                        this.amount = bignumber(params.amount).div(bignumber(10).pow(response.token.decimals)).toString();
                    });
            }
            const pramsData = JSON.parse(JSON.stringify(params));
            this.messageID = params.messageID;
            if (JSON.stringify(params) === '{}') {
                return;
            }
            for (const key in pramsData) {
                if (Object.prototype.hasOwnProperty.call(pramsData, key)) {
                    let tempObject: any
                    try {
                        tempObject = pramsData[key].replace(/([a-zA-Z0-9]+?):/g, '"$1":').replace(/'/g, '"');
                        tempObject = JSON.parse(tempObject);
                    } catch (error) {
                        tempObject = pramsData[key];
                    };
                    pramsData[key] = tempObject;
                }
            }
            this.dataJson = pramsData;
            this.dataJson.messageID = undefined;
            this.broadcastOverride = (params.broadcastOverride === 'true' || params.broadcastOverride === true);
            window.onbeforeunload = () => {
                this.chrome.windowCallback({
                    error: ERRORS.CANCELLED,
                    return: requestTarget.Send,
                    ID: this.messageID
                });
            };
            if (params.network === 'MainNet') {
                this.global.modifyNet('MainNet');
            } else {
                this.global.modifyNet('TestNet');
            }
            this.network = params.network || 'MainNet';
            this.fromAddress = params.fromAddress || this.neon.address;
            this.toAddress = params.toAddress || '';
            this.assetId = params.asset || '';
            this.amount = String(params.amount || 0);
            this.symbol = params.symbol || '';
            // this.fee = params.fee || 0;
            if (params.fee) {
                this.fee = parseFloat(params.fee);
            } else {
                if (this.asset.gasFeeSpeed) {
                    this.fee = Number(this.asset.gasFeeSpeed.propose_price);
                } else {
                    this.asset.getGasFee().subscribe((res: FeeSpeed) => {
                        this.fee = Number(res.propose_price);
                    });
                }
            }
            this.remark = params.remark || '';
            if (this.assetId !== undefined && this.assetId !== '') {
                this.asset.detail(this.neon.address, this.assetId).subscribe((res: Balance) => {
                    this.init = true;
                    this.symbol = res.symbol;
                    this.balance = res;
                    this.assetImageUrl = this.asset.getAssetImage({ asset_id: this.assetId, symbol: res.symbol });
                    this.submit();
                    this.getAssetRate();
                });
            } else {
                this.asset.fetchBalance(this.neon.address).subscribe(res => {
                    const filterAsset = res.filter(item => item.asset_id === params.asset);
                    if (filterAsset.length > 0) {
                        this.init = true;
                        this.symbol = filterAsset[0].symbol;
                        this.balance = filterAsset[0];
                        this.assetImageUrl = this.asset.getAssetImage({ asset_id: this.assetId, symbol: filterAsset[0].symbol });
                    } else {
                        this.global.snackBarTip('balanceLack');
                        return;
                    }
                    this.submit();
                    this.getAssetRate();
                });
            }
        });
    }

    ngAfterViewInit(): void { }

    public submit() {
        if (this.rawTx) {
            return this.resolveSign(Transaction.deserialize(this.rawTx));
        }

        this.loading = true;
        this.loadingMsg = 'Loading';
        if (this.balance.balance === undefined || bignumber(this.balance.balance ).comparedTo(0) < 1) {
            this.global.snackBarTip('balanceLack');
            return;
        }
        if (bignumber(this.balance.balance.toString()).comparedTo(bignumber(this.amount.toString())) === -1  || this.amount === '0') {
            this.global.snackBarTip('balanceLack');
            return;
        }
        this.creating = true;
        this.asset.detail(this.neon.address, this.assetId).subscribe((res: Balance) => {
            this.loading = false;
            this.loadingMsg = '';
            this.balance = res;
            this.transfer.create(this.fromAddress, this.toAddress, this.assetId, this.amount, this.fee, res.decimals,
                this.broadcastOverride).subscribe((tx) => {
                    this.resolveSign(tx);
                }, (err) => {
                    this.creating = false;
                    this.global.snackBarTip('wentWrong');
                });
        });

    }

    public cancel() {
        this.chrome.windowCallback({
            error: ERRORS.CANCELLED,
            return: requestTarget.Send,
            ID: this.messageID
        }).then(() => window.close());
    }

    private resolveSign(tx: Transaction) {
        this.loading = true;
        this.loadingMsg = 'Wait';
        try {
            const wif = this.neon.WIFArr[
                this.neon.walletArr.findIndex(item => item.accounts[0].address === this.neon.wallet.accounts[0].address)
            ]
            tx.sign(wif, this.net === 'MainNet' ? MAGIC_NUMBER_MAINNET : MAGIC_NUMBER_TESTNET);
            this.global.log('signed tx', tx);
            this.tx = tx;
            this.txSerialize = this.tx.serialize(true);
            this.loading = false
            this.loadingMsg = '';
            this.creating = false;
        } catch (error) {
            console.error(error)
            this.loading = false;
            this.loadingMsg = '';
            this.creating = false;
            this.global.snackBarTip('verifyFailed', error);
            this.chrome.windowCallback({
                error: ERRORS.DEFAULT,
                return: requestTarget.Invoke,
                ID: this.messageID
            }).then(() => window.close());
        }
    }

    private async resolveSend(tx: Transaction) {
        this.loadingMsg = 'Wait';
        this.loading = true;
        try {
            const txHash = await this.neo3Transfer.sendNeo3Tx(tx as Transaction);
            if (!txHash) {
                throw {
                    msg: 'Transaction rejected by RPC node.'
                };
            }
            this.loading = false;
            this.loadingMsg = '';
            this.creating = false;
            if (this.fromAddress !== this.toAddress) {
                const txTarget = {
                    txid: '0x' + tx.hash,
                    value: -this.amount,
                    block_time: new Date().getTime() / 1000
                };
                this.pushTransaction(txTarget);
            }
            this.global.log('transfer done', txHash);
            try {
                const setData = {};
                setData[`${this.network}TxArr`] = await this.chrome.getLocalStorage(`${this.network}TxArr`) || [];
                setData[`${this.network}TxArr`].push('0x' + tx.hash);
                this.chrome.setLocalStorage(setData);
            } catch (err) {
                console.error('Error while adding tx to localStorage', err);
            }
            this.dialog.open(PopupTransferSuccessDialogComponent, {
                panelClass: 'custom-dialog-panel'
            }).afterClosed().subscribe(() => {
                this.chrome.windowCallback({
                    data: {
                        txid: txHash,
                    },
                    return: requestTarget.Send,
                    ID: this.messageID
                }).then(() => window.close());
            });
        } catch (err) {
            console.error(err)
            this.creating = false;
            this.chrome.windowCallback({
                error: ERRORS.RPC_ERROR,
                return: requestTarget.Send,
                ID: this.messageID
            });
            this.global.snackBarTip('transferFailed', err.msg || err);
        }
        this.loading = false;
        this.loadingMsg = '';
    }

    public pushTransaction(transaction: object) {
        const net = this.net;
        const address = this.fromAddress;
        const assetId = this.assetId;
        this.chrome.getTransaction().subscribe(res => {
            if (res === null || res === undefined) {
                res = {};
            }
            if (res[net] === undefined) {
                res[net] = {};
            }
            if (res[net][address] === undefined) {
                res[net][address] = {};
            }
            if (res[net][address][assetId] === undefined) {
                res[net][address][assetId] = [];
            }
            res[net][address][assetId].unshift(transaction);
            this.chrome.setTransaction(res);
            this.txState.pushTxSource();
        });
    }

    public async getAssetRate() {
        if (Number(this.fee) > 0) {
            this.feeMoney = await this.asset.getMoney(DVG_CODE, Number(this.fee))
        }
        const assetRate = await this.asset.getAssetRate(this.symbol).toPromise();
        this.money = await this.asset.getMoney(this.symbol, Number(this.amount));
        this.totalMoney = this.global.mathAdd(Number(this.feeMoney), Number(this.money)).toString();
    }

    public exit() {
        this.chrome.windowCallback({
            error: ERRORS.CANCELLED,
            return: requestTarget.Send,
            ID: this.messageID
        }).then(() => window.close());
    }

    public confirm() {
        if (this.creating) {
            return;
        }
        if (this.broadcastOverride) {
            this.loading = false;
            this.loadingMsg = '';
            this.chrome.windowCallback({
                data: {
                    txid: this.tx.hash,
                    signedTx: this.tx.serialize(true)
                },
                return: requestTarget.Send,
                ID: this.messageID
            }).then(() => window.close());
        } else {
            this.resolveSend(this.tx);
        }
    }
    public editFee() {
        this.dialog.open(PopupEditFeeDialogComponent, {
            panelClass: 'custom-dialog-panel',
            data: {
                fee: this.fee
            }
        }).afterClosed().subscribe(res => {
            if (res !== false) {
                this.fee = res;
                if (res === 0 || res === '0') {
                    this.feeMoney = '0';
                } else {
                    this.asset.getMoney(DVG_CODE, Number(this.fee)).then(feeMoney => {
                        this.feeMoney = feeMoney;
                        this.totalMoney = this.global.mathAdd(Number(this.feeMoney), Number(this.money)).toString();
                    });
                }
            }
        })
    }

    public getAddressSub(address: string) {
        return `${address.substr(0, 3)}...${address.substr(address.length - 4, address.length - 1)} `
    }

}

interface Params {
    messageID: string | number;
    broadcastOverride: boolean | 'true';
    network?: string;
    fromAddress?: string;
    toAddress?: string;
    asset?: string;
    amount?: string | number;
    symbol?: string;
    fee?: string;
    remark?: string;
}

function parseParams(paramsRaw: any): Params {
    const gasDecimals = 8; // TODO fetch gas decimals from server
    if (paramsRaw.rawTx) {
        const transaction = Transaction.deserialize(paramsRaw.rawTx);
        const transferInfo = getTransferInfo(transaction);
        return {
            messageID: paramsRaw.messageID,
            broadcastOverride: paramsRaw.broadcastOverride,
            network: paramsRaw.network,
            fee: bignumber(transaction.fees).div(bignumber(10).pow(gasDecimals)).toString(),
            fromAddress: wallet.getAddressFromScriptHash(transaction.sender.toBigEndian()),

            // asset and amount can only be detected asynchronously after fetching contract info
            asset: '',
            amount: '',
            symbol: '',
            remark: '',
            toAddress: '',

            ...(transferInfo && {
                fromAddress: transferInfo.from,
                toAddress: transferInfo.to,
                amount: transferInfo.amount,
                asset: transferInfo.assetHash
            }),
        }
    } else {
        return paramsRaw;
    }
}

function getTransferInfo(transaction: Transaction): {
    from: string;
    to: string;
    amount: string;
    assetHash: string;
} {
    try {
        const disassembledScript = disassemble(transaction.script.toBase64());
        const commands = disassembledScript.trim().split('\n');
        if (commands[commands.length - 1] === 'ASSERT') {
            commands.pop();
        }
        if (commands[commands.length - 1] !== 'SYSCALL System.Contract.Call') {
            throw new Error('This is not a contract call');
        }
        const assetHashUnprefixed = u.HexString.fromHex(commands[commands.length - 2].split(' ')[1]).toLittleEndian();
        if (!wallet.isAddress(wallet.getAddressFromScriptHash(assetHashUnprefixed))) {
            throw new Error('Contract is not a valid address');
        }
        const method = u.HexString.fromHex(commands[commands.length - 3].split(' ')[1]).toAscii();
        if (method !== 'transfer') {
            throw new Error(`Expected method name to be 'transfer' but got '${method}'`);
        }
        const receiver = wallet.getAddressFromScriptHash(u.HexString.fromHex(commands[2].split(' ')[1]).toLittleEndian());
        if (!wallet.isAddress(receiver)) {
            throw new Error('Sender is not a valid address');
        }
        const sender = wallet.getAddressFromScriptHash(u.HexString.fromHex(commands[3].split(' ')[1]).toLittleEndian());
        if (!wallet.isAddress(receiver)) {
            throw new Error('Receiver is not a valid address');
        }
        const amountRaw = getAmount(commands[1]);
        const assetHash = `0x${assetHashUnprefixed}`;
        return {
            from: sender,
            to: receiver,
            amount: amountRaw,
            assetHash: assetHash,
        };
    } catch (err) {
        console.warn(`Could not extract transfer info, this tx might not be a transfer: ${err}`);
    }
    return null;
}

function getAmount(amountCommand: string): string {
    const parts = amountCommand.split(' ');
    switch (parts[0]) {
        case 'PUSH0':
            return '0';
        case 'PUSH1':
            return '1';
        case 'PUSH2':
            return '2';
        case 'PUSH3':
            return '3';
        case 'PUSH4':
            return '4';
        case 'PUSH5':
            return '5';
        case 'PUSH6':
            return '6';
        case 'PUSH7':
            return '7';
        case 'PUSH8':
            return '8';
        case 'PUSH9':
            return '9';
        case 'PUSH10':
            return '10';
        case 'PUSH11':
            return '11';
        case 'PUSH12':
            return '12';
        case 'PUSH13':
            return '13';
        case 'PUSH14':
            return '14';
        case 'PUSH15':
            return '15';
        case 'PUSH16':
            return '16';
        case 'PUSHINT8':
        case 'PUSHINT16':
        case 'PUSHINT32':
        case 'PUSHINT64':
        case 'PUSHINT128':
        case 'PUSHINT256':
            return u.BigInteger.fromTwos(parts[1], true).toString();
        default:
            throw new Error(`Could not parse transfer amount: ${amountCommand}`);
    }
}