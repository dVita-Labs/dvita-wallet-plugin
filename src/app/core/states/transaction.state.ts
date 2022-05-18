import { Injectable } from '@angular/core';
import { bignumber } from 'mathjs';
import { HttpService } from '../services/http.service';
import { GlobalService } from '../services/global.service';
import { Subject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { NeonService } from '../services/neon.service';
import { TX_LIST_PAGE_SIZE, DVITA_TOKEN, DVG_TOKEN } from '@popup/_lib';
import { txsByAddress, tx } from '@/shared';

@Injectable()
export class TransactionState {
    public txSource = new Subject();
    public txSub$ = this.txSource.asObservable();

    constructor(
        private http: HttpService,
        private global: GlobalService,
        private neonService: NeonService
    ) {}

    public pushTxSource() {
        this.txSource.next('new');
    }

    //#region neo3
    /**
     * Format neo3 interface to return data, field name contract => asset_id
     * @param data Interface data
     */
    formatResponseData(data: TransactionN3API[] | undefined): Transaction[] | undefined {
        return data && data.map((item) => {
            const tx: Transaction = Object.assign(item, {
                asset_id: item.contract,
                value: item.amount,
                from: [item.from],
                to: [item.to],
            });
            tx.block_time /= 1000;
            return tx;
        });
    }
    /**
     * Get the trade list of an asset
     * @param address address
     * @param assetId Asset id
     * @param maxId maxid
     */
    public fetchTx(
        address: string,
        assetId?: string,
        maxId: number = -1
    ): Observable<Transaction[] | undefined> {
        return from(
            txsByAddress(this.global.net, address, TX_LIST_PAGE_SIZE, maxId, assetId)
                .then((res) => {
                    const txs: TransactionN3API[] = res
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(transfer => {
                            const sign = transfer.type === 'SENT' ? -1 : 1;
                            const tx: TransactionN3API = {
                                amount: bignumber(transfer.amount).div(bignumber(10).pow(transfer.asset.decimals)).mul(sign).toString(),
                                block_index: transfer.blockIndex,
                                block_time: transfer.timestamp,
                                contract: transfer.asset.hash,
                                from: transfer.from,
                                id: 1, // transfer.txHash,
                                name: transfer.asset.code,
                                src: 'tx',
                                symbol: transfer.asset.code,
                                to: transfer.to,
                                txid: transfer.txHash,
                            };
                            return tx;
                        })
                        .filter(tx => assetId ? tx.contract === assetId : true)

                    return this.formatResponseData(txs);
                })
        );
    }
    //#endregion
}

interface TransactionN3API {
    amount: string;
    block_index: number;
    block_time: number;
    contract: string;
    from: string;
    id: number;
    name: string;
    src: string;
    symbol: string;
    to: string;
    txid: string;
}

type Transaction = Omit<TransactionN3API, 'from' | 'to'> & {
    asset_id: string;
    value: string;
    from: string[];
    to: string[];
}

interface TransactionDetail {
    hash: string;
    size: number;
    sys_fee: string;
    net_fee: string;
    block_index: number;
    block_time: number;
    version: number;
    transfer: {
        txid: string;
        src: string;
        contract: string;
        from: string;
        to: string;
        amount: string;
    }[];
}

function mockTransactionDetail(addr: string, assetId: string, txid: string): TransactionDetail {
    return {
        "hash": "0xed699d7fc946c5b12e0266dd689bad319de9c15ebcdb2bba68b2cddfaee2b5ea",
        "size": 248,
        "sys_fee": "0.04988875",
        "net_fee": "0.16240125",
        "block_index": 250406,
        "block_time": 1630663351393,
        "version": 0,
        "transfer": [
            {
                "txid": "0xed699d7fc946c5b12e0266dd689bad319de9c15ebcdb2bba68b2cddfaee2b5ea",
                "src": "tx",
                "contract": "0xd2a4cff31913016155e38e474a2c06d08be276cf",
                "from": addr,
                "to": "NLg91vbeQXg7DMwzcg4UhYtgFdrTBNi3fG",
                "amount": "1.234"
            }
        ]
    }
}
