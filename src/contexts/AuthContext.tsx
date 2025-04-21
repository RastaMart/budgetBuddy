import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  console.log('AuthProvider');
  
  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('getSession');
      setUser(session?.user ?? null);
      if (session?.user) {
        createOrFetchProfile(session.user);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (signed in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange');
      setUser(session?.user ?? null);
      if (session?.user) {
        await createOrFetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);

      // // Handle redirect after auth events
      // if (event === 'SIGNED_IN') {
      //   // navigate('/', { replace: true });
      // } else if (event === 'SIGNED_OUT') {
      //   // navigate('/auth/login', { replace: true });
      // }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function createOrFetchProfile(user: User) {
    try {
      // First try to fetch existing profile
      let { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
  
      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              name: user.user_metadata.full_name || user.email,
              avatar_url: user.user_metadata.avatar_url
            }
          ])
          .select()
          .single();
  
        if (insertError) throw insertError;
        existingProfile = newProfile;
      } else if (fetchError) {
        throw fetchError;
      }
  
      setProfile(existingProfile);
    } catch (error) {
      console.error('Error handling profile:', error);
    }
  }
  
  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password');
        }
        throw error;
      }
      navigate('/', { replace: true });
    } catch (error) {
      throw error;
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  async function signUp(email: string, password: string) {
    try {
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) throw signUpError;
      if (!user) throw new Error('User creation failed');

      // Profile creation is handled by createOrFetchProfile via onAuthStateChange
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/', { replace: true });
    } catch (error) {
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}


export const useAuth = () => useContext(AuthContext);