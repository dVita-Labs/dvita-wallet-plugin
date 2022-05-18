import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupNewWalletGuideComponent } from './new-wallet-guide.component';
import { OpenedWalletGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupNewWalletGuideComponent, canActivate: [OpenedWalletGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NewWalletGuideRoutingModule {}
