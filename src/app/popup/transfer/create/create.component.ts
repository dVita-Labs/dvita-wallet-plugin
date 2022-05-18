import {
    Component,
    OnInit
} from '@angular/core';
import {
    Router,
    ActivatedRoute
} from '@angular/router';
import {
    Balance, NEO
} from '@/models/models';
import {
    AssetState,
    NeonService,
    GlobalService,
    HttpService,
    BlockState,
    ChromeService,
    TransactionState
} from '@/app/core';
import {
    MatDialog
} from '@angular/material/dialog';
import {
    TransferService
} from '../transfer.service';
import {
    Transaction
} from '@cityofzion/neon-core/lib/tx';
import { wallet, CONST } from '@cityofzion/neon-core';
import { rpc } from '@cityofzion/neon-core';
import { PopupAddressDialogComponent, PopupAssetDialogComponent, PopupTransferSuccessDialogComponent, PopupEditFeeDialogComponent } from '../../_dialogs';
import { PopupTransferConfirmComponent } from '../confirm/confirm.component';
import { bignumber } from 'mathjs';
import { FeeSpeed } from '../../_lib/type';
import { Neo3TransferService } from '../neo3-transfer.service';
import { DVG_TOKEN, MAGIC_NUMBER_TESTNET, MAGIC_NUMBER_MAINNET } from '../../_lib';

@Component({
    templateUrl: 'create.component.html',
    styleUrls: ['create.component.scss']
})
export class TransferCreateComponent implements OnInit {
    public amount: string;
    public fee: any;
    public loading = false;
    public loadingMsg: string;
    gasFeeSpeed: FeeSpeed;
    public fromAddress: string;
    public toAddress: string;
    public creating: boolean = false;

    public assetLogoUrl: string = '';
    public chooseAsset: Balance;

    private balances: Array<Balance> = [];
    public assetId: string;
    public net: string;

    istransferAll = false;
    constructor(
        private router: Router,
        private aRoute: ActivatedRoute,
        private asset: AssetState,
        private transfer: TransferService,
        private neon: NeonService,
        private dialog: MatDialog,
        private global: GlobalService,
        private http: HttpService,
        private chrome: ChromeService,
        private block: BlockState,
        private txState: TransactionState,
        private neo3Transfer: Neo3TransferService,
    ) {
    }

    ngOnInit(): void {
        this.net = this.global.net;
        this.fromAddress = this.neon.address;
        this.aRoute.params.subscribe((params) => {
            if (params.id) {
                this.asset.detail(this.neon.address, params.id).subscribe(async (res: Balance) => {
                    res.balance = bignumber(res.balance).toFixed();
                    this.chooseAsset = res;
                    this.assetId = res.asset_id;
                    this.assetLogoUrl = this.asset.getAssetImage(res);
                });
            }
            this.asset.fetchBalance(this.neon.address).subscribe(async balanceArr => {
                this.balances = balanceArr;
                if (!params.id) {
                    this.assetId = this.balances[0].asset_id;
                    this.chooseAsset = this.balances[0];
                    this.assetLogoUrl = this.asset.getAssetImage(this.balances[0]);
                }
            });
        });
        if (this.asset.gasFeeSpeed) {
            this.gasFeeSpeed = this.asset.gasFeeSpeed;
            this.fee = this.asset.gasFeeSpeed.propose_price;
        } else {
            this.asset.getGasFee().subscribe((res: FeeSpeed) => {
                this.gasFeeSpeed = res;
                this.fee = res.propose_price;
            });
        }
    }

    public submit() {
        if (this.creating) {
            return;
        }
        if (!this.toAddress || !this.toAddress.length) {
            this.global.snackBarTip('checkInput');
            return;
        }
        if (wallet.isAddress(this.toAddress) === false) {
            this.global.snackBarTip('wrongAddress');
            return;
        }
        if (this.chooseAsset.balance === undefined || bignumber(this.chooseAsset.balance).comparedTo(0) === -1) {
            this.global.snackBarTip('balanceLack');
            return;
        }

        try {
            bignumber(this.amount)
        } catch (error) {
            this.global.snackBarTip('checkInput');
            return;
        }

        if (bignumber(this.chooseAsset.balance.toString()).comparedTo(bignumber(this.amount.toString())) === -1) {
            this.global.snackBarTip('balanceLack');
            return;
        }

        this.creating = true;
        this.loading = true;
        this.transfer.create(this.fromAddress, this.toAddress, this.chooseAsset.asset_id, this.amount,
            this.fee || 0, this.chooseAsset.decimals).subscribe((res: Transaction) => {
                this.global.log('start transfer');
                this.resolveSign(res);
                this.loading = false;
            }, (err) => {
                this.creating = false;
                this.loading = false;
                if (err) {
                    this.global.snackBarTip('wentWrong', err, 10000);
                }
            });
    }

    public cancel() {
        history.go(-1);
    }

    private resolveSign(tx: Transaction) {
        try {
            const wif = this.neon.WIFArr[
                this.neon.walletArr.findIndex(item => item.accounts[0].address === this.neon.wallet.accounts[0].address)
            ]
            tx.sign(wif, this.net === 'MainNet' ? MAGIC_NUMBER_MAINNET : MAGIC_NUMBER_TESTNET);
            this.global.log('signed tx', tx);
            const diaglogData: any = {
                fromAddress: this.fromAddress,
                toAddress: this.toAddress,
                asset: this.assetId,
                symbol: this.chooseAsset.symbol,
                amount: this.amount,
                fee: this.fee || '0',
                network: this.net,
                txSerialize: tx.serialize(true)
            };
            const gasDecimals = 8; // TODO fetch gas decimals from server
            diaglogData.systemFee = bignumber(tx.systemFee.toString()).div(bignumber(10).pow(gasDecimals)).toString();
            diaglogData.networkFee = bignumber(tx.networkFee.toString()).div(bignumber(10).pow(gasDecimals)).minus(this.fee).toFixed();
            this.dialog.open(PopupTransferConfirmComponent, {
                panelClass: 'custom-dialog-panel-full',
                height: '600px',
                width: '100%',
                hasBackdrop: false,
                maxWidth: '400px',
                autoFocus: false,
                data: diaglogData
            }).afterClosed().subscribe((isConfirm) => {
                this.creating = false;
                if (isConfirm !== false) {
                    if (this.fee != isConfirm) {
                        this.fee = isConfirm;
                        this.transfer.create(this.fromAddress, this.toAddress, this.chooseAsset.asset_id, this.amount,
                            this.fee || 0, this.chooseAsset.decimals).subscribe((res: Transaction) => {
                                res.sign(wif, this.net === 'MainNet' ? MAGIC_NUMBER_MAINNET : MAGIC_NUMBER_TESTNET);
                                this.resolveSend(res);
                            }, (err) => {
                                console.log(err);
                                if (err) {
                                    this.global.snackBarTip('wentWrong', err, 10000);
                                }
                            });
                    } else {
                        this.resolveSend(tx);
                    }
                }
            });
        } catch (error) {
            console.log(tx, error);
            this.creating = false;
            this.global.snackBarTip('signFailed', error);
        }
    }
    private async resolveSend(tx: Transaction) {
        this.loading = true;
        this.loadingMsg = 'Wait';
        try {
            let txid: string;
            const res = await this.neo3Transfer.sendNeo3Tx(tx as Transaction);
            if (!res) {
                throw {
                    msg: 'Transaction rejected by RPC node.'
                };
            }
            txid = res;
            this.creating = false;
            if (this.fromAddress !== this.toAddress) {
                const txTarget = {
                    txid,
                    value: -this.amount,
                    block_time: new Date().getTime() / 1000
                };
                this.pushTransaction(txTarget);
            }
            // todo transfer done
            this.global.log('transfer done', res);
            this.dialog.open(PopupTransferSuccessDialogComponent, {
                panelClass: 'custom-dialog-panel'
            }).afterClosed().subscribe(() => {
                history.go(-1);
            })
            this.loading = false;
            this.loadingMsg = '';
            return res;
        }
        catch (err) {
            this.creating = false;
            this.global.snackBarTip('transferFailed', err.msg || err);
        }
        this.loading = false;
        this.loadingMsg = '';
    }

    public pushTransaction(transaction: any) {
        const net = this.net;
        const address = this.fromAddress;
        const assetId = this.assetId;
        this.chrome.getTransaction().subscribe(async res => {
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
            const setData = {};
            setData[`${this.net}TxArr`] = await this.chrome.getLocalStorage(`${this.net}TxArr`) || [];
            setData[`${this.net}TxArr`].push(transaction.txid);
            this.chrome.setLocalStorage(setData);
        });
    }

    public selectToAddress() {
        this.dialog.open(PopupAddressDialogComponent, {
            data: {},
            maxHeight: 500,
            panelClass: 'custom-dialog-panel'
        }).afterClosed().subscribe((address: string) => {
            this.toAddress = address;
        });
    }

    public selectAsset() {
        if (this.balances.length > 0) {
            this.dialog.open(PopupAssetDialogComponent, {
                data: {
                    balances: this.balances,
                    selected: this.balances.findIndex(item => item.asset_id === this.assetId)
                },
                maxHeight: 500,
                panelClass: 'custom-dialog-panel'
            }).afterClosed().subscribe(async (index: number) => {
                if (index === undefined) {
                    return
                }
                this.chooseAsset = this.balances[index];
                this.assetId = this.chooseAsset.asset_id;
                this.assetLogoUrl = this.asset.getAssetImage(this.chooseAsset);
            });
        }
    }

    public getAddresSub() {
        if (wallet.isAddress(this.toAddress)) {
            return `${this.toAddress.substr(0, 6)}...${this.toAddress.substr(this.toAddress.length - 7, this.toAddress.length - 1)} `
        } else {
            return ''
        }
    }

    public numberCheck(event) {
        const inputStr = String.fromCharCode(event.keyCode);
        let re = /^[0-9\.]+$/;
        if (this.amount !== undefined && this.amount.indexOf('.') >= 0) {
            re = /^[0-9]+$/;
        }
        if (!re.test(inputStr)) {
            return false;
        }
    }

    public editFee() {
        this.dialog.open(PopupEditFeeDialogComponent, {
            panelClass: 'custom-dialog-panel',
            data: {
                fee: this.fee,
                speedFee: this.gasFeeSpeed
            }
        }).afterClosed().subscribe(res => {
            if (res !== false) {
                this.fee = res;
            }
        })
    }

    // Click to transfer all assets
    transferAll(fee = this.fee || 0) {
        if (this.istransferAll) {
            return;
        }
        this.istransferAll = true;
        // When it is not a gas asset
        if (this.chooseAsset.asset_id !== DVG_TOKEN) {
            this.amount = this.chooseAsset.balance;
            this.istransferAll = false;
            return;
        }
        const tAmount = bignumber(this.chooseAsset.balance).minus(fee);
        let tempAmount;
        if (tAmount.comparedTo(0) <= 0) {
            fee = 0;
            this.fee = 0; // When the priority fee is greater than all assets, the tip is reset to0
            tempAmount = this.chooseAsset.balance;
        } else {
            tempAmount = tAmount.toString();
        }
        // neo3 GAS
        const param = {
            addressFrom: this.fromAddress,
            addressTo: this.toAddress || this.fromAddress,
            tokenScriptHash: this.chooseAsset.asset_id,
            amount: tempAmount,
            networkFee: fee,
            decimals: this.chooseAsset.decimals,
        };
        this.loading = true;
        this.neo3Transfer.createNeo3Tx(param, true).subscribe(tx => {
            this.amount = bignumber(this.chooseAsset.balance).minus(tx.networkFee.toString()).minus(tx.systemFee.toString()).toString();
            this.fee = fee;
            this.loading = false;
            this.istransferAll = false;
        }, () => {
            this.loading = false;
            this.istransferAll = false;
        })
    }
}
