import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { NEO, GAS, EXT, EDS, Balance } from '@/models/models';
import { GlobalService } from '@/app/core';
import { DVITA_TOKEN, DVG_TOKEN } from '@popup/_lib';

@Component({
    selector: 'app-asset-item',
    templateUrl: './asset-item.component.html',
    styleUrls: ['./asset-item.component.scss']
})
export class PopupAssetItemComponent implements OnInit {
    @Input() asset: Balance;
    @Input() index: number;
    @Input() isSearchAssets: boolean;

    // tslint:disable-next-line:no-output-on-prefix
    @Output() onAddAsset = new EventEmitter<any>();

    constructor(public global: GlobalService) {}

    ngOnInit(): void {}

    public fixed() {
        return [DVITA_TOKEN, DVG_TOKEN].indexOf(this.asset.asset_id) >= 0;
    }

    public addAsset(index: number) {
        this.onAddAsset.emit(index);
    }
}
