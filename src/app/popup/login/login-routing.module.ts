import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupLoginComponent } from './login.component';
import { PopupLoginGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupLoginComponent, canActivate: [PopupLoginGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoginRoutingModule {}
