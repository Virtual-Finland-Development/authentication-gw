export type SuomiFiProfile = { nameID: string; nameIDFormat: string; issuer: string; [attr: string]: any };

export type SuomiFiLoginState = {
  profileData: {
    profile: SuomiFiProfile;
    context: {
      AuthnContextClassRef: string;
    };
    email?: string;
  };
  accessToken: string;
  idToken: string;
  expiresAt: string;
};
