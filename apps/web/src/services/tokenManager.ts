import Cookies from 'js-cookie';

class TokenManager {
  private readonly ACCESS_TOKEN_KEY = 'tatame_access_token';
  private readonly REFRESH_TOKEN_KEY = 'tatame_refresh_token';

  getAccessToken(): string | undefined {
    return Cookies.get(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | undefined {
    return Cookies.get(this.REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    // Set access token with 7 days expiry
    Cookies.set(this.ACCESS_TOKEN_KEY, accessToken, { 
      expires: 7,
      secure: window.location.protocol === 'https:',
      sameSite: 'lax'
    });

    if (refreshToken) {
      // Set refresh token with 30 days expiry
      Cookies.set(this.REFRESH_TOKEN_KEY, refreshToken, { 
        expires: 30,
        secure: window.location.protocol === 'https:',
        sameSite: 'lax'
      });
    }
  }

  clearTokens(): void {
    Cookies.remove(this.ACCESS_TOKEN_KEY);
    Cookies.remove(this.REFRESH_TOKEN_KEY);
  }

  hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      // Decode JWT to check expiry (without verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < expiryTime;
    } catch {
      return false;
    }
  }
}

export default new TokenManager();