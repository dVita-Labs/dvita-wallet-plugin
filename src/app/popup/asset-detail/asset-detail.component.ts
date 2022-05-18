import { Component, OnInit, ViewChild } from '@angular/core';
import {
    AssetState,
    NeonService,
    ChromeService,
    GlobalService,
} from '@/app/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NEO, Balance, GAS } from '@/models/models';
import { PopupTxPageComponent } from '@share/components/tx-page/tx-page.component';
import { MatDialog } from '@angular/material/dialog';
import { DVITA_TOKEN } from '@/app/popup/_lib/neo3';
import { PopupConfirmDialogComponent } from '@popup/_dialogs';
import { bignumber } from 'mathjs';
import { Network, explorerURL } from '@/shared';

@Component({
    templateUrl: 'asset-detail.component.html',
    styleUrls: ['asset-detail.component.scss'],
})
export class PopupAssetDetailComponent implements OnInit {
    balance: Balance;
    assetId: string;
    imageUrl: string = '';
    rateCurrency: string;
    // trade record
    @ViewChild('txPage') txPageComponent: PopupTxPageComponent;
    sourceScrollHeight = 0;
    currentTxPage = 1;

    // menu
    showMenu = false;
    watch: Balance[]; // User-added assets
    canHideBalance = false;
    net: Network;

    constructor(
        private assetState: AssetState,
        private aRouter: ActivatedRoute,
        private chrome: ChromeService,
        private neon: NeonService,
        private dialog: MatDialog,
        private global: GlobalService,
        private router: Router
    ) {
        this.rateCurrency = this.assetState.rateCurrency;
    }

    ngOnInit(): void {
        this.net = this.global.net;
        this.aRouter.params.subscribe(async (params: any) => {
            this.assetId = params.assetId || DVITA_TOKEN;

            // Get asset information
            this.assetState
                .fetchBalance(this.neon.address, this.assetId)
                .subscribe(async (balanceArr) => {
                    this.balance = balanceArr.find(({ asset_id }) => asset_id === this.assetId);
                    this.imageUrl = this.assetState.getAssetImage(this.balance);
                });

            this.chrome.getWatch(this.neon.address, this.neon.currentWalletChainType).subscribe((res) => {
                this.watch = res;
                this.canHideBalance =
                    res.findIndex((w) => w.asset_id === this.assetId) >= 0;
            });
        });
    }

    public onScrolltaChange(el: Element) {
        const clientHeight = el.clientHeight;
        const scrollHeight = el.scrollHeight;
        const scrollTop = el.scrollTop;
        if (
            scrollHeight - clientHeight < scrollTop + 100 &&
            this.sourceScrollHeight < scrollHeight &&
            !this.txPageComponent.noMoreData
        ) {
            this.txPageComponent.getInTransactions(++this.currentTxPage);
            this.sourceScrollHeight = scrollHeight;
        }
    }

    hideBalance() {
        this.dialog
            .open(PopupConfirmDialogComponent, {
                data: 'delAssetTip',
                panelClass: 'custom-dialog-panel',
            })
            .afterClosed()
            .subscribe((confirm) => {
                if (confirm) {
                    const i = this.watch.findIndex(
                        (w) => w.asset_id === this.assetId
                    );
                    if (i >= 0) {
                        this.watch.splice(i, 1);
                        this.chrome.setWatch(this.neon.address, this.watch, this.neon.currentWalletChainType);
                        this.global.snackBarTip('hiddenSucc');
                        this.router.navigateByUrl('/popup/home');
                    }
                }
            });
    }

    toWeb() {
        this.showMenu = false;
        window.open(explorerURL(this.net, `contract/${this.assetId}`));
    }
}
