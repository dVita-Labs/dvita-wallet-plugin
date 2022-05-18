import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    templateUrl: 'transfer-success.component.html',
    styleUrls: ['transfer-success.component.scss']
})
export class PopupTransferSuccessDialogComponent {
    constructor(
        private dialogRef: MatDialogRef<PopupTransferSuccessDialogComponent>
    ) { }

    public close() {
        this.dialogRef.close()
    }
}
