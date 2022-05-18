import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetDetailRoutingModule } from './asset-detail-routing.module';
import { PopupAssetDetailComponent } from './asset-detail.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupAssetDetailComponent],
  imports: [
    CommonModule,
    ShareModule,
    AssetDetailRoutingModule,
  ]
})
export class AssetDetailModule { }
