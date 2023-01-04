/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TestbedConsentGrantedResponse = {
    type: TestbedConsentGrantedResponse.type;
    consentToken: string;
};

export namespace TestbedConsentGrantedResponse {

    export enum type {
        CONSENT_GRANTED = 'consentGranted',
    }


}

