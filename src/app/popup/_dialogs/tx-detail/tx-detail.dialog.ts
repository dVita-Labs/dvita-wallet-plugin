import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TransactionState, NeonService } from '@/app/core';

@Component({
    templateUrl: 'tx-detail.dialog.html',
    styleUrls: ['tx-detail.dialog.scss'],
})
export class PopupTxDetailDialogComponent {
    constructor(
        private txState: TransactionState,
        private neonService: NeonService,
        @Inject(MAT_DIALOG_DATA)
        public data: {
            tx: any;
            symbol: string;
            address: string;
            assetId: string;
        }
    ) { }
}
