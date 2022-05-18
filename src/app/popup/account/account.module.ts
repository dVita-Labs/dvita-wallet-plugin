import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountRoutingModule } from './account-routing.module';
import { PopupAccountComponent } from './account.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupAccountComponent],
  imports: [
    CommonModule,
    ShareModule,
    AccountRoutingModule,
  ]
})
export class AccountModule { }
