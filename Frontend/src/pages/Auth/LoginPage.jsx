// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useForm } from 'react-hook-form';
// import { z } from 'zod';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { HiOutlineChip, HiEye, HiEyeOff } from 'react-icons/hi';
// import useAuthStore from '../../auth/authStore.js';
// import Button from '../../components/ui/Button.jsx';

// const schema = z.object({
//    email: z.string().email('Enter a valid email'),
//    password: z.string().min(1, 'Password is required'),
// });

// export default function LoginPage() {
//    const navigate = useNavigate();
//    const login = useAuthStore((s) => s.login);
//    const [showPw, setShowPw] = useState(false);
//    const [apiErr, setApiErr] = useState('');

//    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
//       resolver: zodResolver(schema),
//    });

//    const onSubmit = async (values) => {
//       setApiErr('');
//       const result = await login(values.email, values.password);
//       if (result.success) {
//          navigate('/', { replace: true });
//       } else {
//          setApiErr(result.message);
//       }
//    };

//    return (
//       <div style={{
//          minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
//          background: 'var(--bg)',
//          backgroundImage: `
//         radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 70%),
//         radial-gradient(ellipse 40% 40% at 80% 80%, rgba(99,102,241,0.07) 0%, transparent 60%)
//       `,
//          padding: '24px',
//       }}>
//          <div className="animate-fade-up" style={{ width: '100%', maxWidth: 420 }}>

//             {/* Brand mark */}
//             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
//                <div style={{
//                   width: 44, height: 44, borderRadius: 12, background: 'var(--accent)',
//                   display: 'flex', alignItems: 'center', justifyContent: 'center',
//                   color: '#fff', fontSize: 22, boxShadow: 'var(--shadow-accent)',
//                }}>
//                   <HiOutlineChip />
//                </div>
//                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>
//                   Nagar Admin
//                </span>
//             </div>

//             {/* Card */}
//             <div style={{
//                background: 'var(--surface)', border: '1px solid var(--border-2)',
//                borderRadius: 'var(--radius-xl)', padding: '32px',
//                boxShadow: 'var(--shadow-lg)',
//             }}>
//                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>
//                   Welcome back
//                </h2>
//                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>
//                   Sign in to your admin account
//                </p>

//                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

//                   {/* Email */}
//                   <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
//                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-2)' }}>
//                         Email address
//                      </label>
//                      <input
//                         {...register('email')}
//                         type="email"
//                         placeholder="admin@company.com"
//                         autoComplete="email"
//                         style={{
//                            height: 44, padding: '0 14px', borderRadius: 'var(--radius)',
//                            background: 'var(--bg-3)', border: `1px solid ${errors.email ? 'var(--red)' : 'var(--border)'}`,
//                            color: 'var(--text)', fontSize: 14, outline: 'none',
//                            fontFamily: 'var(--font-body)', transition: 'border-color 0.15s',
//                         }}
//                         onFocus={(e) => { if (!errors.email) e.target.style.borderColor = 'var(--accent)'; }}
//                         onBlur={(e) => { if (!errors.email) e.target.style.borderColor = 'var(--border)'; }}
//                      />
//                      {errors.email && <p style={{ fontSize: 12, color: 'var(--red)' }}>{errors.email.message}</p>}
//                   </div>

//                   {/* Password */}
//                   <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
//                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-2)' }}>
//                         Password
//                      </label>
//                      <div style={{ position: 'relative' }}>
//                         <input
//                            {...register('password')}
//                            type={showPw ? 'text' : 'password'}
//                            placeholder="••••••••"
//                            autoComplete="current-password"
//                            style={{
//                               width: '100%', height: 44, padding: '0 42px 0 14px',
//                               borderRadius: 'var(--radius)',
//                               background: 'var(--bg-3)', border: `1px solid ${errors.password ? 'var(--red)' : 'var(--border)'}`,
//                               color: 'var(--text)', fontSize: 14, outline: 'none',
//                               fontFamily: 'var(--font-body)', transition: 'border-color 0.15s',
//                            }}
//                            onFocus={(e) => { if (!errors.password) e.target.style.borderColor = 'var(--accent)'; }}
//                            onBlur={(e) => { if (!errors.password) e.target.style.borderColor = 'var(--border)'; }}
//                         />
//                         <button
//                            type="button"
//                            onClick={() => setShowPw((v) => !v)}
//                            style={{
//                               position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
//                               background: 'none', border: 'none', cursor: 'pointer',
//                               color: 'var(--text-3)', fontSize: 18, display: 'flex',
//                            }}
//                         >
//                            {showPw ? <HiEyeOff /> : <HiEye />}
//                         </button>
//                      </div>
//                      {errors.password && <p style={{ fontSize: 12, color: 'var(--red)' }}>{errors.password.message}</p>}
//                   </div>

//                   {/* API error */}
//                   {apiErr && (
//                      <div style={{
//                         padding: '10px 14px', borderRadius: 'var(--radius)',
//                         background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
//                         fontSize: 13, color: 'var(--red)',
//                      }}>
//                         {apiErr}
//                      </div>
//                   )}

//                   <Button type="submit" loading={isSubmitting} size="lg" style={{ width: '100%', marginTop: 4 }}>
//                      Sign in
//                   </Button>
//                </form>

//                {/* Demo hint */}
//                <div style={{
//                   marginTop: 24, padding: '12px 14px', borderRadius: 'var(--radius)',
//                   background: 'var(--bg-3)', border: '1px solid var(--border)',
//                }}>
//                   <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
//                      Demo credentials
//                   </p>
//                   <p style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
//                      admin@nagar.dev  /  Admin@1234
//                   </p>
//                </div>
//             </div>
//          </div>
//       </div>
//    );
// }
/**
 * @file LoginPage.jsx
 * @description Animated, production-ready login page.
 *
 * Features:
 *  - Zod + react-hook-form validation
 *  - Password visibility toggle
 *  - API error display
 *  - Staggered fade-up animations on mount
 *  - Redirects to dashboard on success
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { HiOutlineChip, HiEye, HiEyeOff, HiOutlineLockClosed, HiOutlineMail } from 'react-icons/hi';
import useAuthStore from '../../auth/authStore.js';

// ─── Validation schema ────────────────────────────────────────────────────────

const loginSchema = z.object({
   email:    z.string().email('Enter a valid email address'),
   password: z.string().min(1, 'Password is required'),
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({ label, error, icon: Icon, children }) {
   return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
         <label style={{
            fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--text-2)',
         }}>
            {label}
         </label>
         <div style={{ position: 'relative' }}>
            {Icon && (
               <Icon style={{
                  position: 'absolute', left: 13, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-3)', fontSize: 16, pointerEvents: 'none',
               }} />
            )}
            {children}
         </div>
         {error && (
            <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>{error}</p>
         )}
      </div>
   );
}

function StyledInput({ hasLeftIcon = false, hasRightIcon = false, error, ...props }) {
   const [focused, setFocused] = useState(false);

   return (
      <input
         {...props}
         onFocus={(e) => { setFocused(true);  props.onFocus?.(e); }}
         onBlur={(e)  => { setFocused(false); props.onBlur?.(e);  }}
         style={{
            width: '100%', height: 46,
            padding: `0 ${hasRightIcon ? 42 : 14}px 0 ${hasLeftIcon ? 40 : 14}px`,
            borderRadius: 'var(--radius)',
            background: 'var(--bg-3)',
            border: `1.5px solid ${error ? 'var(--red)' : focused ? 'var(--accent)' : 'var(--border)'}`,
            color: 'var(--text)', fontSize: 14,
            outline: 'none', fontFamily: 'var(--font-body)',
            boxShadow: focused && !error ? '0 0 0 3px var(--accent-glow)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxSizing: 'border-box',
         }}
      />
   );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LoginPage() {
   const navigate  = useNavigate();
   const login     = useAuthStore((s) => s.login);

   const [showPassword, setShowPassword] = useState(false);
   const [apiError,     setApiError]     = useState('');

   const {
      register,
      handleSubmit,
      formState: { errors, isSubmitting },
   } = useForm({ resolver: zodResolver(loginSchema) });

   const onSubmit = async ({ email, password }) => {
      setApiError('');
      const result = await login(email, password);
      if (result.success) {
         navigate('/', { replace: true });
      } else {
         setApiError(result.message);
      }
   };

   return (
      <>
         <style>{`
            @keyframes fadeUp {
               from { opacity: 0; transform: translateY(20px); }
               to   { opacity: 1; transform: translateY(0);    }
            }
            @keyframes floatOrb {
               0%, 100% { transform: translateY(0px) scale(1);    }
               50%       { transform: translateY(-20px) scale(1.05); }
            }
            .login-card    { animation: fadeUp 0.5s ease 0.1s both; }
            .login-field-1 { animation: fadeUp 0.4s ease 0.25s both; }
            .login-field-2 { animation: fadeUp 0.4s ease 0.35s both; }
            .login-btn     { animation: fadeUp 0.4s ease 0.45s both; }
            .login-demo    { animation: fadeUp 0.4s ease 0.55s both; }
         `}</style>

         <div style={{
            minHeight: '100dvh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg)',
            backgroundImage: `
               radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.18) 0%, transparent 70%),
               radial-gradient(ellipse 40% 40% at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 60%)
            `,
            padding: 24,
            position: 'relative',
            overflow: 'hidden',
         }}>
            {/* Decorative background orbs */}
            <div style={{
               position: 'absolute', width: 400, height: 400, borderRadius: '50%',
               background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
               top: '-10%', left: '-10%', pointerEvents: 'none',
               animation: 'floatOrb 8s ease-in-out infinite',
            }} />
            <div style={{
               position: 'absolute', width: 300, height: 300, borderRadius: '50%',
               background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)',
               bottom: '5%', right: '5%', pointerEvents: 'none',
               animation: 'floatOrb 10s ease-in-out infinite reverse',
            }} />

            <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

               {/* Brand mark */}
               <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginBottom: 32, justifyContent: 'center',
                  animation: 'fadeUp 0.5s ease both',
               }}>
                  <div style={{
                     width: 46, height: 46, borderRadius: 14,
                     background: 'var(--accent)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     color: '#fff', fontSize: 24,
                     boxShadow: '0 8px 24px -4px rgba(99,102,241,0.5)',
                  }}>
                     <HiOutlineChip />
                  </div>
                  <span style={{
                     fontFamily: 'var(--font-display)',
                     fontWeight: 800, fontSize: 24,
                     color: 'var(--text)',
                  }}>
                     Nagar Admin
                  </span>
               </div>

               {/* Card */}
               <div className="login-card" style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 32,
                  boxShadow: 'var(--shadow-lg)',
               }}>
                  <h2 style={{
                     fontFamily: 'var(--font-display)',
                     fontWeight: 700, fontSize: 20,
                     color: 'var(--text)', margin: '0 0 4px',
                  }}>
                     Welcome back
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px' }}>
                     Sign in to your admin account to continue
                  </p>

                  <form
                     onSubmit={handleSubmit(onSubmit)}
                     style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
                  >
                     {/* Email */}
                     <div className="login-field-1">
                        <FormField label="Email address" error={errors.email?.message} icon={HiOutlineMail}>
                           <StyledInput
                              {...register('email')}
                              type="email"
                              placeholder="admin@company.com"
                              autoComplete="email"
                              hasLeftIcon
                              error={errors.email?.message}
                           />
                        </FormField>
                     </div>

                     {/* Password */}
                     <div className="login-field-2">
                        <FormField label="Password" error={errors.password?.message} icon={HiOutlineLockClosed}>
                           <StyledInput
                              {...register('password')}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              hasLeftIcon
                              hasRightIcon
                              error={errors.password?.message}
                           />
                           {/* Toggle visibility */}
                           <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              style={{
                                 position: 'absolute', right: 12, top: '50%',
                                 transform: 'translateY(-50%)',
                                 background: 'none', border: 'none',
                                 cursor: 'pointer', color: 'var(--text-3)',
                                 fontSize: 18, display: 'flex', padding: 0,
                                 transition: 'color 0.15s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-2)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
                           >
                              {showPassword ? <HiEyeOff /> : <HiEye />}
                           </button>
                        </FormField>
                     </div>

                     {/* API error */}
                     {apiError && (
                        <div style={{
                           padding: '10px 14px', borderRadius: 'var(--radius)',
                           background: 'var(--red-dim)',
                           border: '1px solid rgba(239,68,68,0.25)',
                           fontSize: 13, color: 'var(--red)',
                        }}>
                           {apiError}
                        </div>
                     )}

                     {/* Submit */}
                     <div className="login-btn">
                        <button
                           type="submit"
                           disabled={isSubmitting}
                           style={{
                              width: '100%', height: 46,
                              borderRadius: 'var(--radius)',
                              background: isSubmitting ? 'var(--accent-2)' : 'var(--accent)',
                              color: '#fff', fontSize: 15, fontWeight: 700,
                              border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                              fontFamily: 'var(--font-body)',
                              boxShadow: '0 4px 16px -4px rgba(99,102,241,0.5)',
                              transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                           }}
                           onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                           onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                           {isSubmitting ? (
                              <>
                                 <span style={{
                                    width: 16, height: 16, borderRadius: '50%',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff',
                                    animation: 'spin 0.7s linear infinite',
                                    display: 'inline-block',
                                 }} />
                                 Signing in…
                              </>
                           ) : 'Sign in'}
                        </button>
                     </div>
                  </form>

                  {/* Demo credentials hint */}
                  <div className="login-demo" style={{
                     marginTop: 24, padding: '12px 14px',
                     borderRadius: 'var(--radius)',
                     background: 'var(--bg-3)',
                     border: '1px solid var(--border)',
                  }}>
                     <p style={{
                        fontSize: 10, color: 'var(--text-3)',
                        fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.08em', margin: '0 0 6px',
                     }}>
                        Demo credentials
                     </p>
                     <p style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace', margin: 0 }}>
                        admin@nagar.dev  /  Admin@1234
                     </p>
                  </div>
               </div>

               {/* Footer */}
               <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 24, animation: 'fadeUp 0.4s ease 0.6s both' }}>
                  Nagar Field Operations Platform · v1.0
               </p>
            </div>
         </div>

         <style>{`
            @keyframes spin {
               to { transform: rotate(360deg); }
            }
         `}</style>
      </>
   );
}
