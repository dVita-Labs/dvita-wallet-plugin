import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FeeSpeed } from '@popup/_lib/type';
import { AssetState } from '@app/core';
import { bignumber } from 'mathjs';

@Component({
    templateUrl: 'edit-fee.dialog.html',
    styleUrls: ['edit-fee.dialog.scss']
})
export class PopupEditFeeDialogComponent {
    showCustom = false;
    minFee = 0;
    fee: any = 0;
    feeSpeed: FeeSpeed;
    level = 1;
    constructor(
        private dialogRef: MatDialogRef<PopupEditFeeDialogComponent>,
        private assetState: AssetState,
        @Inject(MAT_DIALOG_DATA)
        public data: {
            fee: number;
            speedFee?: any;
            minFee: number;
        }
    ) {
        this.minFee = this.data.minFee || 0;
        this.fee = bignumber(this.data.fee).toFixed();
        if (this.data.speedFee) {
            this.feeSpeed = this.data.speedFee;
            this.updateFeeSpeed();
            this.updateLevel();
        } else {
            this.getFee();
        }
    }

    private getFee() {
        if (this.assetState.gasFeeSpeed) {
            this.feeSpeed = this.assetState.gasFeeSpeed;
            if(Number(this.feeSpeed.slow_price) === 0) {
                this.updateFeeSpeed()
            }
            this.updateLevel();
        } else {
            this.feeSpeed = this.assetState.gasFeeDefaultSpeed;
            this.updateLevel();
            this.updateFeeSpeed()
            this.assetState.getGasFee().subscribe((res: FeeSpeed) => {
                this.feeSpeed = res;
                this.updateLevel();
                this.updateFeeSpeed()
            });
        }
    }

    private updateFeeSpeed() {
        this.feeSpeed.slow_price = bignumber(this.feeSpeed.slow_price).add(bignumber(this.minFee)).toFixed();
        this.feeSpeed.propose_price = bignumber(this.feeSpeed.propose_price).add(bignumber(this.minFee)).toFixed();
        this.feeSpeed.fast_price = bignumber(this.feeSpeed.fast_price).add(bignumber(this.minFee)).toFixed();
    }

    private updateLevel() {
        const slow = bignumber(this.feeSpeed.slow_price)
        const middle = bignumber(this.feeSpeed.propose_price)
        const fast = bignumber(this.feeSpeed.fast_price)
        const current = bignumber(this.fee)
        if(current.comparedTo(slow) <= 0) {
            this.level = 0
        } else if(current.comparedTo(slow) > 0 && current.comparedTo(fast) < 0) {
            this.level = 1;
        } else {
            this.level = 2;
        }
    }

    updateFee() {
        switch (this.level) {
            case 0:
                this.fee = bignumber((this.feeSpeed && this.feeSpeed.slow_price) || this.fee).toFixed();
                break;
            case 1:
                this.fee = bignumber(this.feeSpeed && this.feeSpeed.propose_price || this.fee).toFixed();
                break;
            case 2:
                this.fee = bignumber(this.feeSpeed && this.feeSpeed.fast_price || this.fee).toFixed();
                break;
        }
    }

    ok() {
        this.dialogRef.close(this.fee);
    }
}
