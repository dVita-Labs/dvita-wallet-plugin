import {
    Component,
    OnChanges,
    SimpleChanges,
    OnInit,
    OnDestroy,
    ViewChild
} from '@angular/core';
import {
    AssetState,
    NeonService,
    HttpService,
    GlobalService,
    ChromeService
} from '@/app/core';
import { NEO, Balance } from '@/models/models';
import { Wallet } from '@cityofzion/neon-core/lib/wallet';
import { PopupTxPageComponent } from '@share/components/tx-page/tx-page.component';
import { MatDialog } from '@angular/material/dialog';
import { PopupConfirmDialogComponent } from '../_dialogs';
import { Router } from '@angular/router';
import { rpc } from '@cityofzion/neon-core';
import { bignumber } from 'mathjs';
import { DVITA_TOKEN, DVITA_CODE, DVG_TOKEN } from '../_lib';
import { Network, explorerURL } from '@/shared';

@Component({
    templateUrl: 'home.component.html',
    styleUrls: ['home.component.scss']
})
export class PopupHomeComponent implements OnInit {
    @ViewChild('txPage')
    txPageComponent: PopupTxPageComponent;
    public imageUrl: string = '';
    selectedIndex = 0;
    public assetId: string;
    public wallet: Wallet;
    public balance: Balance;
    public rateCurrency: string;
    public net: Network;

    private status = {
        confirmed: 'confirmed',
        estimated: 'estimated',
        success: 'success'
    };

    public currentTxPage = 2;
    assetList: Balance[] = [];

    showBackup: boolean = null;

    // menu
    showMenu = false;
    constructor(
        private assetState: AssetState,
        private neon: NeonService,
        private http: HttpService,
        private global: GlobalService,
        private chrome: ChromeService,
        private dialog: MatDialog,
        private router: Router
    ) {
        this.wallet = this.neon.wallet;
        this.rateCurrency = this.assetState.rateCurrency;
        this.assetId = DVITA_TOKEN;
        this.imageUrl = this.assetState.defaultAssetSrc(DVITA_CODE);

        const imageObj = this.assetState.assetFile.get(this.assetId);
        let lastModified = '';
        if (imageObj) {
            lastModified = imageObj['last-modified'];
            this.imageUrl = imageObj['image-src'];
        }
    }

    ngOnInit(): void {
        this.net = this.global.net;
        this.getAssetList();
        this.showBackup = !!this.chrome.getHaveBackupTip();
        if( this.showBackup === null) {
            this.chrome.getWalletStatus(this.neon.address).subscribe(res => {
                this.showBackup = !res;
            });
        }
    }

    getAssetList() {
        const address = this.wallet.accounts[0].address;
        const balancesOfWellKnownTokens = this.assetState.fetchBalance(address).toPromise();
        const balancesOfWatchedTokens = this.chrome.getWatch(this.neon.address, this.neon.currentWalletChainType).toPromise()
            .then(watchList =>
                Promise.all(watchList.map(watchAsset => this.assetState.fetchBalance(address, watchAsset.asset_id).toPromise()))
            )
            .then(balances => flat(balances));

        Promise.all([balancesOfWellKnownTokens, balancesOfWatchedTokens])
            .then(([balances1, balances2]) => balances1.concat(balances2).filter(uniqueAssets).sort(sortDVITADVGFirst))
            .then(balanceArr => {
                this.balance = balanceArr.find(asset => asset.asset_id === this.assetId);
                this.chrome.getWatch(this.neon.address, this.neon.currentWalletChainType).subscribe(watching => {
                    const rateSymbol = balanceArr
                        .filter(item => item.balance && Number(item.balance) > 0)
                        .map(item => item.symbol)
                        .join();
                    this.getAssetListRate(rateSymbol);
                    this.assetList = balanceArr;
                    this.assetList.forEach((asset, index) => {
                        this.getAssetSrc(asset, index);
                    })
                });
            });
    }

    // Get asset exchange rate
    getAssetListRate(rateSymbol: string) {
        this.assetState.getAssetRate(rateSymbol).subscribe(rateBalance => {
            this.assetList.map(d => {
                if (d.symbol.toLowerCase() in rateBalance) {
                    try {
                        d.rateBalance = bignumber(rateBalance[d.symbol.toLowerCase()] || '0').mul(bignumber(d.balance)).toNumber();
                    } catch (error) {
                        d.rateBalance = 0;
                    }
                }
                return d;
            });
        });
    }

    public getAssetSrc(asset: Balance, index) {
        const imageObj = this.assetState.assetFile.get(asset.asset_id);
        let lastModified = '';
        if (imageObj) {
            lastModified = imageObj['last-modified'];
            this.assetList[index].image_url = imageObj['image-src'];
        }
        this.assetState
            .getAssetImageFromUrl(asset.image_url, lastModified)
            .subscribe(assetRes => {
                if (assetRes && assetRes.status === 200) {
                    this.assetState
                        .setAssetFile(assetRes, asset.asset_id)
                        .then(src => {
                            this.assetList[index].image_url = src;
                        });
                } else {
                    this.assetList[index].image_url = this.assetState.defaultAssetSrc(this.assetList[index].symbol);
                }
                if(asset.asset_id === DVITA_TOKEN) {
                    this.imageUrl = this.assetList[index].image_url;
                }
            });
    }

    public onScrolltaChange(el: Element) {
        const tabGroup = el.children[el.children.length - 1];
        if (
            tabGroup.clientHeight - el.scrollTop < 343 &&
            !this.txPageComponent.loading && !this.txPageComponent.noMoreData
        ) {
            this.txPageComponent.getInTransactions(this.currentTxPage);
            this.currentTxPage++;
        }
    }

    public getAssetRate() {
        if (this.balance.balance && bignumber(this.balance.balance ).comparedTo(0) === 1) {
            this.assetState
                .getAssetRate(this.balance.symbol)
                .subscribe(rateBalance => {
                    if (this.balance.symbol.toLowerCase() in rateBalance) {
                        this.balance.rateBalance =
                            (rateBalance[this.balance.symbol.toLowerCase()] || 0) *
                            bignumber(this.balance.balance || 0 ).toNumber();
                    } else {
                        this.balance.rateBalance = 0;
                    }
                });
        } else {
            this.balance.rateBalance = 0;
        }
    }

    toWeb() {
        this.showMenu = false;
        window.open(explorerURL(this.net, `wallet/${this.neon.address}`));
    }
    removeAccount() {
        this.showMenu = false;
        this.dialog
            .open(PopupConfirmDialogComponent, {
                data: 'delWalletConfirm',
                panelClass: 'custom-dialog-panel'
            })
            .afterClosed()
            .subscribe(confirm => {
                if (confirm) {
                    this.neon.delWallet(this.wallet).subscribe(res => {
                        if (this.neon.walletArr.length === 0) {
                            this.router.navigateByUrl('/popup/wallet/new-guide');
                        } else {
                            location.reload();
                        }
                    });
                }
            });
    }
    backupLater() {
        this.chrome.setHaveBackupTip(false);
        this.showBackup = false;
    }
}

function flat<T>(arr: T[][]): T[] {
    return arr.reduce((acc, val) => acc.concat(val), []);
}

function uniqueAssets<T extends { asset_id: string }>(asset: T, index: number, all: T[]): boolean {
    return all.findIndex(item => item.asset_id === asset.asset_id) === index;
}

function sortDVITADVGFirst<T extends { asset_id: string }>(a: T, b: T) {
    // put DVITA and DVG at the beginning
    const orderA = a.asset_id === DVITA_TOKEN ? 2 : a.asset_id === DVG_TOKEN ? 1 : 0;
    const orderB = b.asset_id === DVITA_TOKEN ? 2 : b.asset_id === DVG_TOKEN ? 1 : 0;
    return orderB - orderA;
}
