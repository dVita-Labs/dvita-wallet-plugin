import { Injectable } from '@angular/core';
import { ChromeService } from './chrome.service';

const defaultMessages = {
    close: 'Close',
    copied: 'Copied!',
    hiddenSucc: 'Hidden success!',
    clearSuccess: 'Clear success!',
    addSucc: 'Add success!',
    loginSucc: 'Login success!',
    loginFailed: 'Login failed',
    balanceLack: 'Not enough balance',
    checkAddress: 'Please check your address',
    wentWrong: 'Something went wrong',
    verifyFailed: 'Verify Failed',
    langSetSucc: 'language switched!',
    checkInput: 'Please check your input',
    signFailed: 'Signature failed',
    transferFailed: 'Transfer failed',
    nameModifySucc: 'Name modify success!',
    nameModifyFailed: 'Name modify failed',
    walletCreateSucc: 'Wallet creation success!',
    walletCreateFailed: 'Wallet creation failed',
    walletImportFailed: 'Wallet import failed',
    existingWallet: 'Wallet already exists',
    wrongAddress: 'Please enter a legal address',
    rejected: 'Rejected',
    rateCurrencySetSucc: 'Asset conversion target revised successfully!',
    dep6Wrong: 'Choose the correct file',
    agreePrivacyPolicy: 'Please agree to the privacy agreement',
    insufficientBalance: 'Insufficient GAS to pay for fees! Required',
    butOnlyHad: 'but only had',
    insufficientSystemFee: 'Insufficient balance when system fee added'
};

export type NotificationMessage = keyof typeof defaultMessages;

@Injectable()
export class NotificationService {
    content: any;
    EN = defaultMessages;
    constructor(
        public chrome: ChromeService
    ) {
        this.content = this.EN;
    }
}
