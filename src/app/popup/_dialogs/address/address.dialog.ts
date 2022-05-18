import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { ChromeService, NeonService } from '@app/core';
import { WalletJSON } from '@cityofzion/neon-core/lib/wallet';
import { wallet } from '@cityofzion/neon-core';
@Component({
    templateUrl: 'address.dialog.html',
    styleUrls: ['address.dialog.scss'],
})
export class PopupAddressDialogComponent implements OnInit {
    public address: string = '';

    public addressArr: Array<WalletJSON> = [];

    constructor(
        private dialogRef: MatDialogRef<PopupAddressDialogComponent>,
        private chromeSer: ChromeService,
        private neonService: NeonService
    ) {
    }

    ngOnInit() {
        this.chromeSer.getWalletArray(this.neonService.currentWalletChainType).subscribe((res) => {
            this.addressArr = res;
        });
    }

    public checkAddress(inputStr: string) {
        if (wallet.isAddress(inputStr)) {
            this.dialogRef.close(inputStr);
        }
    }

    public select(selectAddress: string) {
        this.dialogRef.close(selectAddress);
    }

    public getAddressSub(address: string) {
        return `${address.substr(0, 6)}...${address.substr(
            address.length - 7,
            address.length - 1
        )} `;
    }
}
