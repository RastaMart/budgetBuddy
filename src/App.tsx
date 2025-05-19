import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Budgets } from './pages/Budgets';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Accounts } from './pages/Accounts';
import { Login } from './pages/auth/Login';
import { SignUp } from './pages/auth/SignUp';
import { Callback } from './pages/auth/Callback';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<SignUp />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="budgets/:budgetId" element={<Budgets />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}
App.whyDidYouRender = true;
export default App;
