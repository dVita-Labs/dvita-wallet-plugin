import { Component, OnInit } from '@angular/core';
import { ChromeService } from '@/app/core';

@Component({
    templateUrl: 'about.component.html',
    styleUrls: ['about.component.scss']
})
export class PopupAboutComponent implements OnInit {
    public version = '';
    constructor(
        private chrome: ChromeService
    ) { }

    ngOnInit(): void {
        this.version = this.chrome.getVersion();
    }

    public async jumbToWeb(type: number) {
        const lang = await this.chrome.getLang().toPromise()
        switch (type) {
            case 0:
                window.open(`https://dvita.com/compliance`);
                break;
            case 1:
                window.open(`https://dvita.com/compliance`);
                break;
            case 2:
                window.open(`https://dvita.com`);
                break;
            case 3:
                window.open(`mailto:support@dvita.com`);
                break;
        }
    }
}