export type AppContext = { appName: string; redirectUrl: string; guid: string; authProvider?: string };
export type LoginResponse = { loginCode: string; appContextRedirectUrl: string; authProvider: string };
