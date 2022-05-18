import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupHomeComponent } from './home.component';
import { PopupWalletGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupHomeComponent, canActivate: [PopupWalletGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeRoutingModule {}
