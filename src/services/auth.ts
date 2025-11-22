import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoAccessToken,
  CognitoIdToken,
  CognitoRefreshToken
} from 'amazon-cognito-identity-js';

// Cognito configuration from environment variables
const COGNITO_USER_POOL_ID = process.env.REACT_APP_COGNITO_USER_POOL_ID || '';
const COGNITO_CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID || '';

const userPool = new CognitoUserPool({
  UserPoolId: COGNITO_USER_POOL_ID,
  ClientId: COGNITO_CLIENT_ID
});

export interface User {
  email: string;
  username: string;
  attributes: {
    email: string;
    email_verified: boolean;
    sub: string;
  };
}

export interface AuthSession {
  user: User;
  accessToken: string;
  idToken: string;
  refreshToken: string;
  isValid: boolean;
}

class AuthService {
  private currentUser: CognitoUser | null = null;
  private session: CognitoUserSession | null = null;

  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({
          Name: 'email',
          Value: email
        })
      ];

      userPool.signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          console.error('Signup error:', err);
          reject({
            success: false,
            message: this.getReadableError(err.message)
          });
          return;
        }

        if (result?.user) {
          resolve({
            success: true,
            message: 'Account created successfully! Please check your email for verification code.'
          });
        } else {
          reject({
            success: false,
            message: 'Failed to create account'
          });
        }
      });
    });
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<AuthSession> {
    return new Promise((resolve, reject) => {
      const authenticationData = {
        Username: email,
        Password: password
      };
      const authenticationDetails = new AuthenticationDetails(authenticationData);

      const userData = {
        Username: email,
        Pool: userPool
      };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          this.currentUser = cognitoUser;
          this.session = session;

          // Get user attributes
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              reject(new Error(this.getReadableError(err.message)));
              return;
            }

            const userAttributes = this.parseAttributes(attributes || []);
            
            const authSession: AuthSession = {
              user: {
                email: email,
                username: cognitoUser.getUsername(),
                attributes: userAttributes
              },
              accessToken: session.getAccessToken().getJwtToken(),
              idToken: session.getIdToken().getJwtToken(),
              refreshToken: session.getRefreshToken().getToken(),
              isValid: session.isValid()
            };

            // Store session in localStorage
            this.storeSession(authSession);

            resolve(authSession);
          });
        },
        onFailure: (err) => {
          console.error('SignIn error:', err);
          reject(new Error(this.getReadableError(err.message)));
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // Handle first-time login with temporary password
          reject(new Error('New password required. Please contact administrator.'));
        }
      });
    });
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    if (this.currentUser) {
      this.currentUser.signOut();
    }
    
    this.currentUser = null;
    this.session = null;
    localStorage.removeItem('authSession');
    localStorage.removeItem('lastAuthCheck');
  }

  /**
   * Get current authenticated session
   */
  async getCurrentSession(): Promise<AuthSession | null> {
    return new Promise((resolve) => {
      const currentUser = userPool.getCurrentUser();
      
      if (!currentUser) {
        // Try to restore from localStorage
        const storedSession = this.getStoredSession();
        if (storedSession && this.isSessionValid(storedSession)) {
          resolve(storedSession);
          return;
        }
        resolve(null);
        return;
      }

      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
          return;
        }

        this.currentUser = currentUser;
        this.session = session;

        // Get fresh user attributes
        currentUser.getUserAttributes((err, attributes) => {
          if (err) {
            resolve(null);
            return;
          }

          const userAttributes = this.parseAttributes(attributes || []);
          
          const authSession: AuthSession = {
            user: {
              email: userAttributes.email,
              username: currentUser.getUsername(),
              attributes: userAttributes
            },
            accessToken: session.getAccessToken().getJwtToken(),
            idToken: session.getIdToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
            isValid: session.isValid()
          };

          // Update stored session
          this.storeSession(authSession);

          resolve(authSession);
        });
      });
    });
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<AuthSession | null> {
    const currentUser = userPool.getCurrentUser();
    
    if (!currentUser) {
      return null;
    }

    return new Promise((resolve) => {
      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          resolve(null);
          return;
        }

        if (session.isValid()) {
          // Session is still valid, return current session
          this.getCurrentSession().then(resolve);
        } else {
          // Try to refresh the session
          const refreshToken = session.getRefreshToken();
          currentUser.refreshSession(refreshToken, (err, newSession) => {
            if (err || !newSession) {
              resolve(null);
              return;
            }

            this.session = newSession;
            this.getCurrentSession().then(resolve);
          });
        }
      });
    });
  }

  /**
   * Verify email with confirmation code
   */
  async confirmSignUp(email: string, confirmationCode: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool
      };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmRegistration(confirmationCode, true, (err, result) => {
        if (err) {
          reject({
            success: false,
            message: this.getReadableError(err.message)
          });
          return;
        }

        resolve({
          success: true,
          message: 'Email verified successfully! You can now sign in.'
        });
      });
    });
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool
      };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve({
            success: true,
            message: 'Password reset code sent to your email'
          });
        },
        onFailure: (err) => {
          reject({
            success: false,
            message: this.getReadableError(err.message)
          });
        }
      });
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null && session.isValid;
  }

  private parseAttributes(attributes: any[]): any {
    const parsed: any = {};
    
    attributes.forEach((attr) => {
      if (attr.getName && attr.getValue) {
        parsed[attr.getName()] = attr.getValue();
      }
    });

    return {
      email: parsed.email || '',
      email_verified: parsed.email_verified === 'true',
      sub: parsed.sub || ''
    };
  }

  private getReadableError(errorMessage: string): string {
    const errorMap: { [key: string]: string } = {
      'User does not exist': 'No account found with this email address',
      'Incorrect username or password': 'Invalid email or password',
      'User is not confirmed': 'Please verify your email address before signing in',
      'Invalid verification code provided': 'Invalid verification code',
      'Password did not conform with policy': 'Password does not meet requirements',
      'UsernameExistsException': 'An account with this email already exists',
      'TooManyRequestsException': 'Too many requests. Please try again later',
      'NotAuthorizedException': 'Invalid email or password',
      'UserNotFoundException': 'No account found with this email address'
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    return errorMessage || 'An unexpected error occurred';
  }

  private storeSession(session: AuthSession): void {
    try {
      localStorage.setItem('authSession', JSON.stringify(session));
      localStorage.setItem('lastAuthCheck', Date.now().toString());
    } catch (error) {
      console.warn('Failed to store auth session:', error);
    }
  }

  private getStoredSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem('authSession');
      if (!stored) return null;

      const session = JSON.parse(stored) as AuthSession;
      
      // Check if stored session is too old (more than 1 hour)
      const lastCheck = localStorage.getItem('lastAuthCheck');
      if (lastCheck) {
        const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
        if (timeSinceLastCheck > 60 * 60 * 1000) { // 1 hour
          return null;
        }
      }

      return session;
    } catch (error) {
      console.warn('Failed to parse stored auth session:', error);
      return null;
    }
  }

  private isSessionValid(session: AuthSession): boolean {
    if (!session || !session.accessToken) {
      return false;
    }

    try {
      // Decode JWT token to check expiration
      const tokenParts = session.accessToken.split('.');
      if (tokenParts.length !== 3) {
        return false;
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp > currentTime;
    } catch (error) {
      console.warn('Failed to validate session:', error);
      return false;
    }
  }
}

export const authService = new AuthService();