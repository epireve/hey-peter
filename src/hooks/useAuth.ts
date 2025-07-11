import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface AuthUser extends User {
  role?: UserRole;
  full_name?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    phone?: string;
  };
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  initializing: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileData {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface UseAuthReturn {
  // State
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  initializing: boolean;
  
  // Auth methods
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: AuthError }>;
  signup: (credentials: SignupCredentials) => Promise<{ success: boolean; error?: AuthError }>;
  logout: () => Promise<{ success: boolean; error?: AuthError }>;
  resetPassword: (data: ResetPasswordData) => Promise<{ success: boolean; error?: AuthError }>;
  updatePassword: (data: UpdatePasswordData) => Promise<{ success: boolean; error?: AuthError }>;
  updateProfile: (data: UpdateProfileData) => Promise<{ success: boolean; error?: AuthError }>;
  
  // Utility methods
  isAuthenticated: boolean;
  isRole: (role: UserRole) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  redirectToLogin: () => void;
  redirectToDashboard: () => void;
  
  // Profile methods
  refreshProfile: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: AuthError }>;
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: false,
    initializing: true,
  });

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setAuthState(prev => ({ ...prev, initializing: false }));
          }
          return;
        }

        if (session?.user && mounted) {
          const enhancedUser = await enhanceUser(session.user);
          setAuthState({
            user: enhancedUser,
            session,
            loading: false,
            initializing: false,
          });
        } else if (mounted) {
          setAuthState(prev => ({ ...prev, initializing: false }));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, initializing: false }));
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const enhancedUser = await enhanceUser(session.user);
          setAuthState({
            user: enhancedUser,
            session,
            loading: false,
            initializing: false,
          });
        } else if (event === 'SIGNED_OUT' || !session) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initializing: false,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Enhance user with profile data
  const enhanceUser = async (user: User): Promise<AuthUser> => {
    try {
      // Get user profile from database
      const { data: profile, error } = await supabase
        .from('users')
        .select('role, full_name, first_name, last_name, phone, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return {
          ...user,
          role: 'student' as UserRole,
        };
      }

      return {
        ...user,
        role: profile.role as UserRole,
        full_name: profile.full_name,
        profile: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
        },
      };
    } catch (error) {
      console.error('Error enhancing user:', error);
      return {
        ...user,
        role: 'student' as UserRole,
      };
    }
  };

  // Login
  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false }));
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error,
          },
        };
      }

      // Auth state will be updated via the onAuthStateChange listener
      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, loading: false }));
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during login',
          details: error,
        },
      };
    }
  }, []);

  // Signup
  const signup = useCallback(async (credentials: SignupCredentials) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.full_name,
            role: credentials.role || 'student',
          },
        },
      });

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false }));
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error,
          },
        };
      }

      // If signup was successful, create user record in database
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: credentials.email,
            full_name: credentials.full_name,
            role: credentials.role || 'student',
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, loading: false }));
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during signup',
          details: error,
        },
      };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false }));
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error,
          },
        };
      }

      // Auth state will be updated via the onAuthStateChange listener
      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, loading: false }));
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during logout',
          details: error,
        },
      };
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (data: ResetPasswordData) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/password-update`,
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error,
          },
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during password reset',
          details: error,
        },
      };
    }
  }, []);

  // Update password
  const updatePassword = useCallback(async (data: UpdatePasswordData) => {
    if (data.password !== data.confirmPassword) {
      return {
        success: false,
        error: {
          message: 'Passwords do not match',
          code: 'PASSWORD_MISMATCH',
        },
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.message,
            details: error,
          },
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during password update',
          details: error,
        },
      };
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    if (!authState.user) {
      return {
        success: false,
        error: {
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      };
    }

    try {
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: data.full_name,
        },
      });

      if (authError) {
        return {
          success: false,
          error: {
            message: authError.message,
            code: authError.message,
            details: authError,
          },
        };
      }

      // Update database profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          avatar_url: data.avatar_url,
        })
        .eq('id', authState.user.id);

      if (profileError) {
        return {
          success: false,
          error: {
            message: profileError.message,
            code: profileError.code,
            details: profileError,
          },
        };
      }

      // Refresh profile
      await refreshProfile();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during profile update',
          details: error,
        },
      };
    }
  }, [authState.user]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (!authState.user) return;

    try {
      const enhancedUser = await enhanceUser(authState.user);
      setAuthState(prev => ({
        ...prev,
        user: enhancedUser,
      }));
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [authState.user]);

  // Upload avatar
  const uploadAvatar = useCallback(async (file: File) => {
    if (!authState.user) {
      return {
        success: false,
        error: {
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      };
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${authState.user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        return {
          success: false,
          error: {
            message: uploadError.message,
            code: uploadError.message,
            details: uploadError,
          },
        };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const updateResult = await updateProfile({ avatar_url: publicUrl });

      if (!updateResult.success) {
        return updateResult;
      }

      return {
        success: true,
        url: publicUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during avatar upload',
          details: error,
        },
      };
    }
  }, [authState.user, updateProfile]);

  // Utility methods
  const isAuthenticated = !!authState.user;

  const isRole = useCallback((role: UserRole) => {
    return authState.user?.role === role;
  }, [authState.user]);

  const hasRole = useCallback((roles: UserRole[]) => {
    return authState.user?.role ? roles.includes(authState.user.role) : false;
  }, [authState.user]);

  const redirectToLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  const redirectToDashboard = useCallback(() => {
    if (!authState.user) {
      router.push('/login');
      return;
    }

    switch (authState.user.role) {
      case 'admin':
        router.push('/admin');
        break;
      case 'teacher':
        router.push('/teacher');
        break;
      case 'student':
        router.push('/dashboard');
        break;
      default:
        router.push('/dashboard');
    }
  }, [authState.user, router]);

  return {
    // State
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    initializing: authState.initializing,
    
    // Auth methods
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    
    // Utility methods
    isAuthenticated,
    isRole,
    hasRole,
    redirectToLogin,
    redirectToDashboard,
    
    // Profile methods
    refreshProfile,
    uploadAvatar,
  };
};

// Higher-order component for protecting routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: UserRole[]
) => {
  return function AuthenticatedComponent(props: P) {
    const { user, loading, initializing, isAuthenticated, hasRole, redirectToLogin } = useAuth();

    useEffect(() => {
      if (initializing || loading) return;

      if (!isAuthenticated) {
        redirectToLogin();
        return;
      }

      if (allowedRoles && !hasRole(allowedRoles)) {
        toast.error('You do not have permission to access this page');
        // Redirect to appropriate dashboard
        if (user?.role === 'admin') {
          window.location.href = '/admin';
        } else if (user?.role === 'teacher') {
          window.location.href = '/teacher';
        } else {
          window.location.href = '/dashboard';
        }
        return;
      }
    }, [user, loading, initializing, isAuthenticated, hasRole, redirectToLogin]);

    if (initializing || loading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return null;
    }

    if (allowedRoles && !hasRole(allowedRoles)) {
      return <div>Access denied</div>;
    }

    return <Component {...props} />;
  };
};