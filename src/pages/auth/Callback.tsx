import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        createOrFetchProfile(session.user)
        // navigate('/', { replace: true });
      }
    });
  }, [navigate]);

  function createOrFetchProfile(user: User) {
    try {
      // First try to fetch existing profile
      let { data: existingProfile, error: fetchError } = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
  
      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: insertError } = supabase
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
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      CallBack
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}