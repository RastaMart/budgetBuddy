import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useContext';

export function Callback() {
  const navigate = useNavigate();

  const { createOrFetchProfile } = useAuth();
  async function initialSession() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await createOrFetchProfile(session.user);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      navigate('/');
    }
  }
  initialSession();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}
