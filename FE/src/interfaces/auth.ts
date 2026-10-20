/** Create a club account (POST /auth/register): the club, the person who signs in for it. */
export interface RegisterRequest {
  clubName: string;
  countryCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
