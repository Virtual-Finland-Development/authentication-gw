export type SuomiFiLoginState = {
  profile: {
    nameID: string;
    email?: string;
    [attr: string]: any;
  };
  context: {
    AuthnContextClassRef: string;
  };
  accessToken: string;
  idToken: string;
  expiresAt: string;
};
