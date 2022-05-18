import { Component, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Wallet } from '@cityofzion/neon-core/lib/wallet';
import { NeonService, ChromeService, GlobalService } from '@/app/core';
import { Router } from '@angular/router';
import { EVENT } from '@/models/dapi';
import { PopupSelectDialogComponent } from '../select/select.dialog';
import { ChainType } from '@popup/_lib';

@Component({
    templateUrl: 'home-menu.dialog.html',
    styleUrls: ['home-menu.dialog.scss'],
})
export class PopupHomeMenuDialogComponent {
    @ViewChild('walletContainer') private walletContainer: ElementRef;
    public walletArr: Array<Wallet> = [];
    public wallet: Wallet;
    constructor(
        private router: Router,
        private chrome: ChromeService,
        private dialogRef: MatDialogRef<PopupHomeMenuDialogComponent>,
        private neon: NeonService,
        private global: GlobalService,
        private dialog: MatDialog
    ) {
        this.walletArr = this.neon.neo3WalletArr;
        this.wallet = this.neon.wallet;
    }
    public isActivityWallet(w: Wallet) {
        if (w.accounts[0].address === this.wallet.accounts[0].address) {
            return true;
        } else {
            return false;
        }
    }
    public scrollToBottom() {
        try {
            this.walletContainer.nativeElement.scrollTo(
                0,
                this.walletContainer.nativeElement.scrollHeight
            );
        } catch (err) {}
    }

    public dismiss() {
        this.dialogRef.close();
    }

    public export() {
        download(`${this.neon.wallet.name}.json`, JSON.stringify(this.neon.export()));
    }

    public selectAccount(w: Wallet) {
        this.wallet = this.neon.parseWallet(w);
        this.chrome.setWallet(this.wallet.export());
        this.chrome.windowCallback({
            data: {
                address: this.wallet.accounts[0].address,
                label: this.wallet.name,
            },
            return: EVENT.ACCOUNT_CHANGED,
        });
        location.href = `index.html#popup`;
    }

    public lock() {
        this.global.$wallet.next('close');
        this.dialogRef.close('lock');
        this.chrome.clearLogin();
        this.router.navigateByUrl('/popup/login');
    }

    to(type: 'create' | 'import') {
        if (type === 'create') {
            this.router.navigateByUrl('/popup/wallet/create');
        } else {
            this.router.navigateByUrl('/popup/wallet/import');
        }
    }
}

// https://stackoverflow.com/a/31438726/1860900
function download(filename, text) {
    const link = document.createElement("a");
    link.setAttribute("target","_blank");
    if (Blob !== undefined) {
        const blob = new Blob([text], {type: "text/plain"});
        link.setAttribute("href", URL.createObjectURL(blob));
    } else {
        link.setAttribute("href","data:text/plain," + encodeURIComponent(text));
    }
    link.setAttribute("download",filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
