import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function useAuth() {
  return useContext(AuthContext);
}
useAuth.whyDidYouRender = true;
export { useAuth };
