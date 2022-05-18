import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewWalletGuideRoutingModule } from './new-wallet-guide-routing.module';
import { PopupNewWalletGuideComponent } from './new-wallet-guide.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupNewWalletGuideComponent],
  imports: [
    CommonModule,
    ShareModule,
    NewWalletGuideRoutingModule,
  ]
})
export class NewWalletGuideModule { }
