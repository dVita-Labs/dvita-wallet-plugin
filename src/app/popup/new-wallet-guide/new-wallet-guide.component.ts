import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
    templateUrl: './new-wallet-guide.component.html',
    styleUrls: ['./new-wallet-guide.component.scss'],
})
export class PopupNewWalletGuideComponent implements OnInit {
    constructor(private dialog: MatDialog, private router: Router) {}

    ngOnInit(): void {}

    to(type: 'create' | 'import') {
        if (type === 'create') {
            this.router.navigateByUrl('/popup/wallet/create');
        } else {
            this.router.navigateByUrl('/popup/wallet/import');
        }
    }
}
