import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupAssetDetailComponent } from './asset-detail.component';
import { PopupWalletGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupAssetDetailComponent, canActivate: [PopupWalletGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AssetDetailRoutingModule {}
