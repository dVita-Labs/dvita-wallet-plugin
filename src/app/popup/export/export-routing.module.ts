import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupExportComponent } from './export.component';
import { PopupWalletGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupExportComponent, canActivate: [PopupWalletGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExportRoutingModule {}
