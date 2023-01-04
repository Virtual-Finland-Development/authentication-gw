/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TestbedVerificationRequiredResponse = {
    type: TestbedVerificationRequiredResponse.type;
    /**
     * URL which user should follow to verify the consent request
     */
    verifyUrl: string;
};

export namespace TestbedVerificationRequiredResponse {

    export enum type {
        VERIFY_USER_CONSENT = 'verifyUserConsent',
    }


}

