import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, X, KeyRound, CheckCircle2, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HRStaffItem } from '../utils/storage';
import { setGoogleBackupToken } from '../utils/googleSheetBackup';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'reviewer';
  roleTitle: string;
  dept?: string;
  campus?: string;
  avatarInitials: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLogin: (user: UserProfile) => void;
  staffList: HRStaffItem[];
  currentUser: UserProfile | null;
}

// Predefined authorized Admin emails
const DEFAULT_ADMIN_EMAILS = [
  'rossukon.piw@rmutr.ac.th',
  'jutamas.won@rmutr.ac.th',
  'chotika.now@rmutr.ac.th',
  'haruthai.s@rmutr.ac.th',
  'tossapon.bua@rmutr.ac.th'
];

type LoginState = 'main' | 'custom_email';

// Zero-dependency JWT Decoder
const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  staffList,
  currentUser
}) => {
  const [loginPath, setLoginPath] = useState<'admin' | 'staff'>('admin');
  const [loginState, setLoginState] = useState<LoginState>('main');
  const [adminError, setAdminError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [verifyingMsg, setVerifyingMsg] = useState('กำลังเข้าสู่ระบบและตรวจสอบสิทธิ์ความปลอดภัย...');

  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

  // Always reset states to main/default when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setLoginState('main');
      setAdminError('');
      setIsLoading(false);
      setManualEmail('');
    }
  }, [isOpen]);

  // Dynamically load Google Identity Services SDK
  useEffect(() => {
    if (!isOpen) return;

    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setSdkLoaded(true);
      document.body.appendChild(script);
    } else {
      setSdkLoaded(true);
    }
  }, [isOpen]);

  // Initialize and Render Real Google Button when SDK loads
  useEffect(() => {
    const gWindow = window as any;
    if (isOpen && sdkLoaded && loginState === 'main' && clientId && gWindow.google?.accounts?.id) {
      try {
        gWindow.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          itp_support: true,
          use_fedcm_for_prompt: false
        });

        // Render standard Google GSI button into target container
        const container = document.getElementById('real-google-btn-container');
        if (container) {
          gWindow.google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: container.offsetWidth || 340,
            logo_alignment: 'left'
          });
        }
      } catch (err) {
        console.error('Failed to initialize Google Identity Services:', err);
      }
    }
  }, [isOpen, sdkLoaded, loginState, clientId]);

  if (!isOpen) return null;

  const getInitials = (name: string, email: string) => {
    if (email && email.includes('@')) {
      return email.substring(0, 2).toUpperCase();
    }
    const parts = name.replace(/^(นาย|นาง|นางสาว|ผศ|รศ|ดร|อ|อาจารย์)\.?\s*/g, '').split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Secure Admin Login with server-side Google Sheets verification
  const handleAdminLoginWithEmail = async (emailAddress: string) => {
    const email = emailAddress.trim().toLowerCase();
    setIsLoading(true);
    setAdminError('');
    setVerifyingMsg('กำลังดึงข้อมูลและยืนยันตัวตนกับฐานข้อมูลผู้ดูแลระบบใน Google Sheets... กรุณารอสักครู่');

    try {
      const response = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `เซิร์ฟเวอร์ตอบสนองด้วยข้อผิดพลาด (สถานะ: ${response.status})`);
      }

      const resData = await response.json();
      if (resData.success) {
        if (resData.authorized && resData.staff) {
          const staff = resData.staff;
          const user: UserProfile = {
            id: staff.id || 'ADM-SHEET',
            name: staff.name,
            email: staff.email,
            role: staff.role || 'admin',
            roleTitle: staff.roleTitle || 'ผู้ดูแลระบบ (Admin - Verified)',
            dept: staff.dept || 'ฝ่ายบริการวิชาการและเครือข่ายสัมพันธ์',
            campus: staff.campus || 'ศาลายา',
            avatarInitials: getInitials(staff.name, staff.email)
          };

          onLogin(user);
          setIsLoading(false);
          setLoginState('main');
          if (onClose) onClose();
        } else {
          setIsLoading(false);
          setAdminError(resData.error || `❌ บัญชี Google Account (${email}) ไม่มีสิทธิ์เข้าใช้งานในฐานะผู้ดูแลระบบ (ไม่พบรายชื่อในตารางแท็บ 'admin' ของ Google Sheets)`);
        }
      } else {
        throw new Error(resData.error || 'การตรวจสอบสิทธิ์ล้มเหลว');
      }
    } catch (err: any) {
      console.error('Verify admin error:', err);
      setIsLoading(false);
      setAdminError(`❌ ${err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อตรวจสอบฐานข้อมูลผู้ดูแลระบบได้'}`);
    }
  };

  // Regular Staff Login (No server-side verification required)
  const handleStaffLoginWithEmail = (emailAddress: string) => {
    const email = emailAddress.trim().toLowerCase();
    setIsLoading(true);
    setAdminError('');
    setVerifyingMsg('กำลังเข้าสู่ระบบสำหรับบุคลากรทั่วไป... โปรดรอสักครู่');

    setTimeout(() => {
      const matchedStaff = staffList.find(s => s.email.toLowerCase() === email);
      const name = matchedStaff?.name || email.split('@')[0];
      const user: UserProfile = {
        id: matchedStaff?.id || 'STAFF-GEN',
        name: name,
        email: email,
        role: 'staff',
        roleTitle: 'บุคลากรทั่วไป (Staff)',
        dept: matchedStaff?.dept || 'ฝ่ายบริการวิชาการและเครือข่ายสัมพันธ์',
        campus: matchedStaff?.campus || 'ศาลายา',
        avatarInitials: getInitials(name, email)
      };

      onLogin(user);
      setIsLoading(false);
      setLoginState('main');
      if (onClose) onClose();
    }, 800);
  };

  // Reusable core login function for both real & simulated flows (No Passcode!)
  const loginWithEmail = (emailAddress: string, path: 'admin' | 'staff' = loginPath) => {
    if (path === 'admin') {
      handleAdminLoginWithEmail(emailAddress);
    } else {
      handleStaffLoginWithEmail(emailAddress);
    }
  };

  // Handle Real Google JWT Auth Success callback
  const handleCredentialResponse = (response: any) => {
    setIsLoading(true);
    setAdminError('');
    setVerifyingMsg('กำลังรับข้อมูลยืนยันตนจาก Google... โปรดรอสักครู่');

    setTimeout(() => {
      try {
        const idToken = response.credential;
        const decoded = decodeJwt(idToken);

        if (!decoded || !decoded.email) {
          throw new Error('ไม่สามารถตรวจสอบข้อมูลอีเมลจาก Google credential ได้');
        }

        const email = decoded.email.toLowerCase();
        // Google Sign-In always triggers the appropriate path verification
        loginWithEmail(email, loginPath);
      } catch (err: any) {
        console.error(err);
        setIsLoading(false);
        setAdminError(err.message || 'เกิดข้อผิดพลาดในการยืนยันสิทธิ์เข้าใช้ระบบกับ Google');
      }
    }, 500);
  };

  // Click handler for Google Sign-In Button: takes them directly to Google OAuth2 token request (dual auth & backup)
  const handleGoogleSignInClick = () => {
    setAdminError('');
    const gWindow = window as any;
    if (clientId && gWindow.google?.accounts?.oauth2) {
      try {
        setIsLoading(true);
        setVerifyingMsg('กำลังเข้าสู่ระบบ Google และตรวจสอบสิทธิ์สำหรับระบบสำรองข้อมูลภายนอก...');
        
        const tokenClient = gWindow.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setAdminError(tokenResponse.error_description || tokenResponse.error);
              setIsLoading(false);
              return;
            }
            if (tokenResponse.access_token) {
              // Store access token in googleSheetBackup utility
              setGoogleBackupToken(tokenResponse.access_token, tokenResponse.expires_in || 3600);
              
              setVerifyingMsg('เชื่อมต่อบัญชีสำเร็จ กำลังดึงข้อมูลโปรไฟล์ผู้ดูแลระบบ...');
              
              // Fetch user profile info using access token
              try {
                const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                });
                
                if (infoRes.ok) {
                  const userInfo = await infoRes.json();
                  if (userInfo && userInfo.email) {
                    loginWithEmail(userInfo.email.toLowerCase(), loginPath);
                  } else {
                    throw new Error('ไม่สามารถรับข้อมูลอีเมลจากบัญชี Google ได้');
                  }
                } else {
                  throw new Error('การติดต่อดึงข้อมูลโปรไฟล์ผู้ใช้ล้มเหลว');
                }
              } catch (err: any) {
                console.error('Fetch profile error:', err);
                setIsLoading(false);
                setAdminError(`เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์: ${err.message || String(err)}`);
              }
            } else {
              setIsLoading(false);
              setAdminError('ไม่ได้รับ Access Token จาก Google');
            }
          }
        });
        
        tokenClient.requestAccessToken();
      } catch (err: any) {
        console.error('Failed to prompt Google Sign-In OAuth2:', err);
        setIsLoading(false);
        setLoginState('custom_email');
      }
    } else {
      setLoginState('custom_email');
    }
  };

  const handleSimulatedGoogleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const emailInput = manualEmail.trim().toLowerCase();

    if (!emailInput) {
      setAdminError('กรุณากรอกบัญชีอีเมล Google ของคุณ');
      return;
    }

    const fullEmail = emailInput.includes('@') ? emailInput : `${emailInput}@rmutr.ac.th`;
    loginWithEmail(fullEmail, loginPath);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden my-8 transform transition-all">
        
        {/* Header - EXACTLY MATCHES the provided image layout & color scheme */}
        <div className="bg-gradient-to-b from-[#1c2a8c] to-[#2a389d] p-8 text-white relative">
          {onClose && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Yellow Rounded Icon with Shield */}
          <div className="w-14 h-14 rounded-2xl bg-[#ffb700] flex items-center justify-center shadow-lg mb-5">
            <ShieldCheck className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>

          <h2 className="text-2xl font-bold leading-snug">เข้าสู่ระบบเพื่อจัดการข้อมูล</h2>
          <p className="text-xs text-blue-100/90 mt-1.5 leading-relaxed font-normal">
            เข้าสู่ระบบด้วย Google Account หรือยืนยันตัวตนด้วยอีเมลสถาบัน
          </p>
        </div>

        {/* Modal Body with Animated States */}
        <div className="p-8 relative min-h-[280px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            
            {/* 1. MAIN STATE (SIGN-IN ENTRY) */}
            {loginState === 'main' && !isLoading && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 w-full flex flex-col justify-between py-2 text-center"
              >
                <div className="py-2 flex flex-col items-center">
                  <p className="text-sm text-slate-600 leading-relaxed max-w-xs mb-8 mt-2 text-center font-medium">
                    กรุณาคลิกปุ่มด้านล่างเพื่อลงชื่อเข้าใช้ด้วยบัญชี <span className="font-bold text-slate-800">Google Account</span> ของคุณ
                  </p>

                  <div className="w-full flex flex-col items-center mb-6">
                    <button
                      type="button"
                      onClick={handleGoogleSignInClick}
                      className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-2xl shadow-xs transition-all cursor-pointer active:scale-[0.99] hover:border-slate-300 group"
                      style={{ boxShadow: '0 4px 12px rgba(66, 133, 244, 0.05)' }}
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span className="text-slate-700 font-bold group-hover:text-slate-800">เข้าสู่ระบบด้วย Google Account</span>
                    </button>
                  </div>
                </div>

                {adminError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{adminError}</span>
                  </div>
                )}

                {/* Footer Notice matching the uploaded image exactly */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[11px] text-slate-400 font-medium">
                    ระบบรองรับ Google Account ทุกโดเมนและ @rmutr.ac.th
                  </p>
                </div>
              </motion.div>
            )}

            {/* 2. STATE: CUSTOM GOOGLE SIGN-IN (Form for standard email typing) */}
            {loginState === 'custom_email' && !isLoading && (
              <motion.div
                key="custom_email"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 w-full flex flex-col"
              >
                {/* Authentic Google Logo and Heading */}
                <div className="text-center pb-2 flex flex-col items-center">
                  <svg className="w-16 h-7 mb-2" viewBox="0 0 74 24">
                    <path fill="#4285F4" d="M9.2 4.4c-4.4 0-8 3.5-8 8s3.6 8 8 8c2.4 0 4.4-.9 5.8-2.3l-1.6-1.6c-.9.9-2.3 1.5-4.2 1.5-3.1 0-5.6-2.5-5.6-5.6S6.1 6.8 9.2 6.8c1.9 0 3.2.7 4 1.5.7.7 1 1.7 1.1 2.9h-5.1v2.4h7.5c.1-.4.1-.8.1-1.3.1-4.2-3.2-7.9-7.7-7.9z"/>
                    <path fill="#EA4335" d="M22.5 8.1c-3.1 0-5.6 2.5-5.6 5.6s2.5 5.6 5.6 5.6c3.1 0 5.6-2.5 5.6-5.6S25.6 8.1 22.5 8.1zm0 8.8c-1.8 0-3.2-1.5-3.2-3.2s1.4-3.2 3.2-3.2c1.8 0 3.2 1.5 3.2 3.2s-1.4 3.2-3.2 3.2z"/>
                    <path fill="#FBBC05" d="M35.5 8.1c-3.1 0-5.6 2.5-5.6 5.6s2.5 5.6 5.6 5.6c3.1 0 5.6-2.5 5.6-5.6s-2.5-5.6-5.6-5.6zm0 8.8c-1.8 0-3.2-1.5-3.2-3.2s1.4-3.2 3.2-3.2c1.8 0 3.2 1.5 3.2 3.2s-1.4 3.2-3.2 3.2z"/>
                    <path fill="#4285F4" d="M48.2 8.1c-2.9 0-5.2 2.3-5.2 5.6s2.3 5.6 5.2 5.6c1.7 0 3-.7 3.8-1.6V19c0 2.1-1.2 3.3-3.1 3.3-1.6 0-2.6-1.1-3-2.1l-2.1.9c.6 1.5 2.2 3.6 5.1 3.6 3 0 5.5-1.8 5.5-5.8V8.4H52V9.4c-.8-1-2.1-1.3-3.8-1.3zm-.2 8.8c-1.8 0-3.1-1.5-3.1-3.2s1.3-3.2 3.1-3.2 3.1 1.5 3.1 3.2-1.3 3.2-3.1 3.2z"/>
                    <path fill="#34A853" d="M57.6 1.4h2.4v17.9h-2.4V1.4z"/>
                    <path fill="#EA4335" d="M67.5 8.1c-2.7 0-5 2.1-5 5.6 0 3.3 2.2 5.6 5.3 5.6 2.5 0 3.9-1.5 4.5-2.4l-1.8-1.2c-.6.8-1.4 1.3-2.7 1.3-1.8 0-3.1-1.1-3.5-2.7l7.5-3.1-2.3-3.1zm-2.4 5.4c.4-1.3 1.6-2.2 2.9-2.2.9 0 1.8.4 2.2 1.1l-5.1 1.1z"/>
                  </svg>
                  <h3 className="text-xl font-medium text-slate-800 tracking-tight">ลงชื่อเข้าใช้งาน</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    ด้วย Google Account เพื่อดำเนินการต่อในระบบควบคุมข้อมูลผู้ดูแลระบบ
                  </p>
                </div>

                {/* Simulated Google Sign-In Input Form */}
                <form onSubmit={handleSimulatedGoogleSignIn} className="space-y-4 w-full text-left">
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={manualEmail}
                      onChange={(e) => {
                        setManualEmail(e.target.value);
                        setAdminError('');
                      }}
                      placeholder="อีเมล Google Account หรืออีเมลสถาบัน (เช่น name.sur@rmutr.ac.th)"
                      className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition-all placeholder:text-slate-400 font-medium"
                    />
                  </div>

                  {adminError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{adminError}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 leading-relaxed font-normal">
                    ไม่ใช่คอมพิวเตอร์ของคุณใช่ไหม ใช้หน้าต่างการท่องเว็บแบบส่วนตัวเพื่อลงชื่อเข้าใช้งาน <a href="#" className="text-blue-600 hover:underline">ดูข้อมูลเพิ่มเติม</a>
                  </div>

                  <div className="flex justify-between items-center pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminError('');
                        setLoginState('main');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-bold text-xs px-3 py-2 rounded-lg hover:bg-blue-50/50 transition-colors"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer active:scale-[0.98]"
                    >
                      ถัดไป
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* SIMULATED GOOGLE OAUTH LOADING SCREEN */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-20 space-y-4"
              >
                {/* Authentic Google loading spinner */}
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-bold text-slate-800">{verifyingMsg}</p>
                  <p className="text-xs text-slate-400 mt-1">โปรดรอสักครู่ ระบบกำลังประมวลผลการยืนยันสิทธิ์ความปลอดภัย...</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
