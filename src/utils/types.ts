export type AppContext = { appName: string; redirectUrl: string; guid?: string; provider?: string };
export type LoginResponse = { loginCode: string; appContextRedirectUrl: string; provider: string };
