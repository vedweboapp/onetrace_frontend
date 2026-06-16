
export const AUTH_API_PATHS = {
  login: "auth/login/",
  otpRequest: "auth/login/otp/request/",
  otpVerify: "auth/login/otp/verify/",
  sendOtp:"auth/send-otp/",
  verifyOtp:"auth/verify-otp/",
  signUp: "auth/org-user/signup/",
  forgotOtpRequest: "auth/forgot-password/otp/request/",
  passwordResetConfirm: "auth/forgot-password/reset/",
  logout: "auth/logout/",
  tokenRefresh: "auth/token/refresh/",
} as const;
