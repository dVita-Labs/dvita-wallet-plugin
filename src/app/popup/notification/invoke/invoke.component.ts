import { AssetState, ChromeService, GlobalService, HttpService, NeonService } from '@/app/core';
import { DVITA_CODE, DVITA_TOKEN } from '@/app/popup/_lib/neo3';
import { ERRORS, requestTarget, TxHashAttribute } from '@/models/dapi';
import { UTXO } from '@/models/models';
import { InvokeArgs, Network, fetchBlockHeight } from '@/shared';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { rpc, sc, tx, u } from '@cityofzion/neon-core';
import { Transaction } from '@cityofzion/neon-core/lib/tx';
import { Neo3TransferService } from '../../transfer/neo3-transfer.service';
import { bignumber } from 'mathjs';
import { PopupEditFeeDialogComponent, PopupTransferSuccessDialogComponent } from '../../_dialogs';
import { FeeSpeed } from '../../_lib/type';
import { MAGIC_NUMBER_TESTNET, MAGIC_NUMBER_MAINNET } from '../../_lib';

@Component({
    templateUrl: 'invoke.component.html',
    styleUrls: ['invoke.component.scss']
})
export class PopupNoticeInvokeComponent implements OnInit {

    public net: string = '';
    public feeMoney = '0';
    public rateCurrency = '';
    public txSerialize = ''
    public assetImageUrl: string = '';
    public showFeeEdit: boolean = true;

    public txParams: (InvokeArgs & { network: Network }) | tx.TransactionJson;
    public scriptHash = '';
    public operation = '';
    public args = null;
    public tx: Transaction;
    public attachedAssets = null;
    public fee: number = 0;
    public minFee = 0;
    public broadcastOverride = null;
    public assetIntentOverrides = null;
    public loading = false;
    public loadingMsg: string;
    private messageID: string = '';
    private script = '';
    private txHashAttributes: TxHashAttribute[] = null;
    private utxos: UTXO[] = [];
    private signers: InvokeArgs['signers'] = [];
    private extraWitness: [] = [];

    constructor(
        private aRoute: ActivatedRoute,
        private router: Router,
        private global: GlobalService,
        private neon: NeonService,
        private dialog: MatDialog,
        private http: HttpService,
        private chrome: ChromeService,
        private neo3Transfer: Neo3TransferService,
        private assetState: AssetState
    ) { }

    ngOnInit(): void {
        this.assetImageUrl = this.assetState.getAssetImage({ asset_id: DVITA_TOKEN, symbol: DVITA_CODE })
        this.aRoute.queryParams.subscribe(async (params: { tx: string, messageID: string }) => {

            // can pass either InvokeArgs as defined in Neoline docs, or can mass full json tx as expected by neon-js
            const txParams: (InvokeArgs | tx.TransactionJson) & { network: Network; } = JSON.parse(decodeURIComponent(params.tx));
            this.txParams = txParams;

            this.messageID = params.messageID;
            if (txParams.network !== undefined) {
                if (txParams.network === 'MainNet') {
                    this.global.modifyNet('MainNet');
                } else {
                    this.global.modifyNet('TestNet');
                }
            }
            this.net = this.global.net;

            if (isFullTx(txParams)) {
                const gasDecimals = 8; // TODO fetch gas decimals from server
                this.fee = bignumber(txParams.netfee).plus(txParams.sysfee).div(bignumber(10).pow(gasDecimals)).toNumber();
                this.resolveSign(tx.Transaction.fromJson(txParams));
                return;
            }

            this.signers = txParams.signers;

            if (Number(txParams.fee) > 0) {
                this.assetState.getMoney('DVG', Number(txParams.fee)).then(res => {
                    this.feeMoney = res;
                })
            }
            if (txParams.fee) {
                this.fee = Number(txParams.fee);
            } else {
                this.fee = 0;
                if (this.showFeeEdit) {
                    if (this.assetState.gasFeeSpeed) {
                        this.fee = bignumber(this.minFee).add(bignumber(this.assetState.gasFeeSpeed.propose_price)).toNumber();
                    } else {
                        this.assetState.getGasFee().subscribe((res: FeeSpeed) => {
                            this.fee = bignumber(this.minFee).add(bignumber(res.propose_price)).toNumber();
                            this.signTx(this.signers);
                        });
                    }
                }
            }
            this.signTx(this.signers);
        });
        window.onbeforeunload = () => {
            this.chrome.windowCallback({
                error: ERRORS.CANCELLED,
                return: requestTarget.Invoke,
                ID: this.messageID
            });
        };
    }

    private async resolveSign(transaction: Transaction) {
        this.loading = true;
        this.loadingMsg = 'Wait';
        if (this.extraWitness.length > 0) {
            this.extraWitness.forEach((item: any) => {
                if (item.invocationScript !== undefined || item.verificationScript !== undefined) {
                    const tempWitness = new tx.Witness({
                        invocationScript: item.invocationScript || '',
                        verificationScript: item.verificationScript || ''
                    })
                    // @ts-ignore
                    tempWitness.scriptHash = item.scriptHash // TODO check how to do it for neo3
                    // @ts-ignore
                    transaction.scripts.push(tempWitness) // TODO check how to do it for neo3
                }
            });
        }
        if (transaction === null) {
            return;
        }
        try {
            const wif = this.neon.WIFArr[
                this.neon.walletArr.findIndex(item => item.accounts[0].address === this.neon.wallet.accounts[0].address)
            ]
            try {
                transaction.sign(wif, this.net === 'MainNet' ? MAGIC_NUMBER_MAINNET : MAGIC_NUMBER_TESTNET);
            } catch (error) {
                console.log(error);
            }
            this.tx = transaction;
            this.txSerialize = this.tx.serialize(true);
            this.loading = false
        } catch (error) {
            this.loading = false;
            this.loadingMsg = '';
            this.global.snackBarTip('verifyFailed', error);
            this.chrome.windowCallback({
                error: ERRORS.DEFAULT,
                return: requestTarget.Invoke,
                ID: this.messageID
            }).then(() => window.close());
        }
    }

    private async resolveSend(transaction: Transaction) {
        this.loading = true;
        this.loadingMsg = 'Wait';
        this.neo3Transfer.sendNeo3Tx(transaction)
            .then(txHash => txHash ? { result: { succeed: true, hash: txHash } } : { error: "Unsuccessfull broadcast request" })
            .then(async res => {
                if (
                    !res.result ||
                    (res.result && typeof res.result === 'object' && res.result.succeed === false)
                ) {
                    throw {
                        msg: 'Transaction rejected by RPC node.'
                    };
                }
                this.loading = false;
                this.loadingMsg = '';
                if (res.error !== undefined) {
                    this.chrome.windowCallback({
                        error: ERRORS.RPC_ERROR,
                        return: requestTarget.Invoke,
                        ID: this.messageID
                    });
                    this.global.snackBarTip('transferFailed');
                } else {
                    this.chrome.windowCallback({
                        data: {
                            txid: res.result.hash,
                        },
                        return: requestTarget.Invoke,
                        ID: this.messageID
                    });
                    const setData = {};
                    setData[`${this.net}TxArr`] = await this.chrome.getLocalStorage(`${this.net}TxArr`) || [];
                    setData[`${this.net}TxArr`].push('0x' + res.result.hash);
                    this.chrome.setLocalStorage(setData);
                    this.dialog.open(PopupTransferSuccessDialogComponent, {
                        panelClass: 'custom-dialog-panel'
                    }).afterClosed().subscribe(() => {
                        window.close();
                    });
                }
            }).catch(err => {
                console.log(err);
                this.loading = false;
                this.loadingMsg = '';
                this.chrome.windowCallback({
                    error: ERRORS.RPC_ERROR,
                    return: requestTarget.Invoke,
                    ID: this.messageID
                });
                this.global.snackBarTip('transferFailed', err.msg || err);
            });
    }

    public exit() {
        this.chrome.windowCallback({
            error: ERRORS.CANCELLED,
            return: requestTarget.Invoke,
            ID: this.messageID
        }).then(() => window.close());
    }

    public confirm() {
        if (this.broadcastOverride === true) {
            this.loading = false;
            this.loadingMsg = '';
            this.chrome.windowCallback({
                data: {
                    txid: this.tx.hash,
                    signedTx: this.tx.serialize(true)
                },
                return: requestTarget.Invoke,
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
                fee: this.fee,
                minFee: this.minFee
            }
        }).afterClosed().subscribe(res => {
            if (res !== false) {
                this.fee = res;
                if (res < this.minFee) {
                    this.fee = this.minFee;
                }
                if (res === 0 || res === '0') {
                    this.feeMoney = '0';
                } else {
                    this.assetState.getMoney('DVG', Number(this.fee)).then(feeMoney => {
                        this.feeMoney = feeMoney;
                    });
                }
                this.signTx(this.signers);
            }
        })
    }

    private async signTx(signers: InvokeArgs["signers"]) {
        const transaction = new tx.Transaction({
            signers: signers,
            script: this.script,
            validUntilBlock: await fetchBlockHeight(this.global.net) + 1000,
        });
        this.resolveSign(transaction);
    }
}

function isFullTx(
    maybeFullTx: (InvokeArgs | tx.TransactionJson) & { network: Network; }
): maybeFullTx is (tx.TransactionJson & { network: Network }) {
    return "script" in maybeFullTx;
}
