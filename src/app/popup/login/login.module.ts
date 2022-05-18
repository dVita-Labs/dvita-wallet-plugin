import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginRoutingModule } from './login-routing.module';
import { PopupLoginComponent } from './login.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupLoginComponent],
  imports: [
    CommonModule,
    ShareModule,
    LoginRoutingModule,
  ]
})
export class LoginModule { }
