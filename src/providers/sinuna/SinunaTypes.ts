import { AuthenticateResponse } from "../../utils/types";

export interface SinunaAuthenticateResponse extends AuthenticateResponse {
  loginCode: string;
}
