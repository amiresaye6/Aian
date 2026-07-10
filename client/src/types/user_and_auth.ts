export interface User {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  role: string;
  organizationId: string;
  organization: string;
}

export interface AuthResponse { 
  success: boolean;
  data:{
    access_token: string; 
    refresh_token: string; 
    user: User; 
  }
  
};

export interface VerifyOtpResponse { 
  success: boolean;
  data:{
    resetToken: string;  
  }
  
};

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
};

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}