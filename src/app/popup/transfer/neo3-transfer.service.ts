import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { CONST, rpc, sc, tx, u, wallet } from '@cityofzion/neon-core/lib';
import { Transaction } from '@cityofzion/neon-core/lib/tx';
import { Observable, from } from 'rxjs';
import { AssetState, NotificationService, GlobalService } from '@app/core';
import { bignumber } from 'mathjs';
import { fetchBlockHeight, broadcast, fees, balance } from '@/shared';

interface CreateNeo3TxInput {
    addressFrom: string;
    addressTo: string;
    tokenScriptHash: string;
    amount: any;
    networkFee: number;
    decimals: number;
    script?: string;
}

@Injectable()
export class Neo3TransferService {
    rpcClient;
    constructor(
        public assetState: AssetState,
        public notification: NotificationService,
        private globalService: GlobalService,
    ) {
        this.rpcClient = new rpc.RPCClient(this.globalService.Neo3RPCDomain);
    }
    createNeo3Tx(
        params: CreateNeo3TxInput,
        isTransferAll = false
    ): Observable<Transaction> {
        return from(this.createNeo3TxPromise(params, isTransferAll))
    }

    private async createNeo3TxPromise(
        params: CreateNeo3TxInput,
        isTransferAll = false
    ): Promise<Transaction> {
        const assetStateTemp = this.assetState;
        const notificationTemp = this.notification;
        const rpcClientTemp = this.rpcClient;
        const neo3This = this;

        const tempScriptHash = wallet.getScriptHashFromAddress(
            params.addressFrom
        );
        params.amount = bignumber(params.amount)
            .mul(bignumber(10).pow(params.decimals))
            .toNumber();
        const inputs = {
            scriptHash: tempScriptHash,
            fromAccountAddress: params.addressFrom,
            toAccountAddress: params.addressTo,
            tokenScriptHash: params.tokenScriptHash,
            amountToTransfer: params.amount,
            systemFee: 0,
            networkFee: bignumber(params.networkFee).toNumber() || 0,
        };

        const NEW_GAS = '0xd2a4cff31913016155e38e474a2c06d08be276cf';

        const validUntilBlock = await fetchBlockHeight(this.globalService.net) + 1000;

        const script = params.script || sc.createScript({
            scriptHash: inputs.tokenScriptHash,
            operation: 'transfer',
            args: [
                sc.ContractParam.hash160(inputs.fromAccountAddress),
                sc.ContractParam.hash160(inputs.toAccountAddress),
                inputs.amountToTransfer,
                null,
            ],
        });

        const signers = [
            {
                account: inputs.scriptHash,
                scopes: tx.WitnessScope.CalledByEntry,
            },
        ];

        const txLength = new tx.Transaction({ signers, script, validUntilBlock }).serialize().length;

        const { systemFee, networkFee } = await fees(this.globalService.net, script, txLength);


        const balanceResponse = await balance(this.globalService.net, inputs.fromAccountAddress);
        
        // Check for token funds
        const assetBalance = balanceResponse.find((bal) =>
            bal.asset.hash.includes(inputs.tokenScriptHash)
        );
        const sourceBalanceAmount = assetBalance?.amount ?? 0;
        const balanceAmount = bignumber(sourceBalanceAmount)
            .mul(bignumber(10).pow(params.decimals))
            .toNumber();
        if (balanceAmount < inputs.amountToTransfer) {
            throw {
                msg: `${
                    notificationTemp.content['insufficientSystemFee'] +
                    sourceBalanceAmount
                }`,
            };
        } else {
            console.log('\u001b[32m  ✓ Token funds found \u001b[0m');
        }

        // Check for gas funds for fees
        const gasRequirements = bignumber(networkFee).plus(systemFee);
        const gasBalance = balanceResponse.find((bal) =>
            bal.asset.hash.includes(NEW_GAS)
        );
        const gasAmount =
            gasBalance
                ? bignumber(gasBalance.amount)
                : bignumber(0)
        if (gasAmount.lessThan(gasRequirements)) {
            throw {
                msg: `${
                    notificationTemp.content['insufficientBalance'] +
                    gasRequirements.toString() +
                    notificationTemp.content['butOnlyHad'] +
                    gasAmount.toString()
                }`,
            };
        }

        // If the transfer is gas
        if (inputs.tokenScriptHash.indexOf(NEW_GAS) >= 0) {
            const gasRequirements8 = gasRequirements.mul(bignumber(10).pow(params.decimals));
            const totalRequirements = bignumber(inputs.amountToTransfer)
                .add(gasRequirements8)
                .toNumber();
            if (balanceAmount < totalRequirements) {
                throw {
                    msg: `${
                        notificationTemp.content['insufficientSystemFee'] +
                        sourceBalanceAmount
                    }`,
                };
            }
        }

        return new tx.Transaction({
            signers,
            script,
            validUntilBlock,
            networkFee,
            systemFee,
        });
    }

    async sendNeo3Tx(transaction: Transaction): Promise<string | null> {
        const hexSerializedTx = transaction.serialize(true);
        const response = await broadcast(this.globalService.net, hexSerializedTx);
        return response.status === 'ANNOUNCED' ? response.transaction.hash : null;
    }

    // String tobase64
    hexToBase64(str: string) {
        return Buffer.from(str, 'hex').toString('base64');
    }
}
