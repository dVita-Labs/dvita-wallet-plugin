import { Injectable } from '@angular/core';
import { Transaction } from '@cityofzion/neon-core/lib/tx';
import { Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { UTXO, GAS } from '@/models/models';
import { NeonService, HttpService, GlobalService } from '@/app/core';
import { Neo3TransferService } from './neo3-transfer.service';

@Injectable()
export class TransferService {
    constructor(
        private neon: NeonService,
        private http: HttpService,
        private global: GlobalService,
        private neo3TransferService: Neo3TransferService
    ) { }
    public create(from: string, to: string, asset: string, amount: string, fee: number = 0, decimals: number = 0,
        broadcastOverride: boolean = false): Observable<Transaction> {
        return new Observable(observer => {
            this.neo3TransferService.createNeo3Tx({addressFrom: from, addressTo: to, tokenScriptHash: asset, amount, networkFee: fee, decimals}).subscribe(tx => {
                    observer.next(tx);
                    observer.complete();
            }, error => {
                console.error(error);
                observer.error(error.msg);
                observer.complete();
            })
        });
    }
}
