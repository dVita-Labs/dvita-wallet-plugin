import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { PopupQRCodeDialogComponent } from '@popup/_dialogs';
import { PopupNameDialogComponent } from '@popup/_dialogs';
import { explorerURL } from '@/shared';
import { GlobalService, NeonService } from '@app/core';

@Component({
    templateUrl: 'account.component.html',
    styleUrls: ['account.component.scss']
})
export class PopupAccountComponent implements OnInit {
    public address: string;
    public walletName: string;

    constructor(
        private router: Router,
        private global: GlobalService,
        private neon: NeonService,
        private dialog: MatDialog
    ) {
        this.address = '';
        this.walletName = '';
    }

    ngOnInit(): void {
        this.address = this.neon.address;
        this.neon.walletSub().subscribe(() => {
            this.walletName = this.neon.wallet.name;
        });
    }

    public wif() {
        this.router.navigate(['/popup/export']);
    }

    public qrcode() {
        return this.dialog.open(PopupQRCodeDialogComponent, {
            data: this.address
        });
    }

    public updateName() {
        return this.dialog.open(PopupNameDialogComponent, {
            panelClass: 'custom-dialog-panel'
        });
    }

    toWeb() {
        window.open(explorerURL(this.global.net, `wallet/${this.neon.address}`));
    }

    copy() {
        const input = document.createElement('input');
        input.setAttribute('readonly', 'readonly');
        input.setAttribute('value', this.address);
        document.body.appendChild(input);
        input.select();
        if (document.execCommand('copy')) {
            document.execCommand('copy');
            this.global.snackBarTip('copied');
        }
        document.body.removeChild(input);
    }
}
