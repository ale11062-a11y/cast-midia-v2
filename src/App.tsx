import React, { useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { User, Player } from './types';
import { Navbar } from './components/Navbar';
import { LoginView } from './views/LoginView';
import { AdminDashboard } from './views/AdminDashboard';
import { CompanyDashboard } from './views/CompanyDashboard';
import { OperatorDashboard } from './views/OperatorDashboard';
import { PlayerView } from './views/PlayerView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { KeyRound, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{ id: string; name: string } | undefined>();
  const [currentPlayer, setCurrentPlayer] = useState<Player | undefined>();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Player view simulation modal (for company/operator to test player live)
  const [simulatedPlayerCode, setSimulatedPlayerCode] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Password change modal
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Restore session
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Try to load cached session immediately for instant offline start
    try {
      const cached = localStorage.getItem('indoor_cached_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.user) {
          setUser(parsed.user);
          setCompanyInfo(parsed.company);
          setCurrentPlayer(parsed.player);
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached session:', e);
    }

    api.getMe()
      .then((res) => {
        setUser(res.user);
        setCompanyInfo(res.company);
        setCurrentPlayer(res.player);
        try {
          localStorage.setItem('indoor_cached_session', JSON.stringify(res));
        } catch (e) {}
      })
      .catch((err: any) => {
        // If offline or network error, maintain cached session so player continues functioning
        if (!navigator.onLine || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
          console.warn('Dispositivo em modo offline; mantendo sessão em cache local.');
          return;
        }
        // Only invalidate if the server responded with authentication rejection
        setStoredToken(null);
        localStorage.removeItem('indoor_cached_session');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLoginSuccess = (data: { user: User; company?: { id: string; name: string }; player?: Player }) => {
    setUser(data.user);
    setCompanyInfo(data.company);
    setCurrentPlayer(data.player);
    try {
      localStorage.setItem('indoor_cached_session', JSON.stringify(data));
    } catch (e) {}
  };

  const handleLogout = () => {
    setStoredToken(null);
    localStorage.removeItem('indoor_cached_session');
    setUser(null);
    setCompanyInfo(undefined);
    setCurrentPlayer(undefined);
    setSimulatedPlayerCode(null);
    showToast('info', 'Sessão encerrada com sucesso.');
  };

  // Quick switch between accounts for fast testing
  const handleQuickSwitchRole = async (targetRole: 'admin' | 'company' | 'operator' | 'player') => {
    try {
      let credentials: any = {};
      if (targetRole === 'admin') {
        credentials = { email: 'ale11062@gmail.com', password: 'Admin@123456' };
      } else if (targetRole === 'company') {
        credentials = { email: 'empresa@drogariasp.com.br', password: '123456' };
      } else if (targetRole === 'operator') {
        credentials = { email: 'operador@drogariasp.com.br', password: '123456' };
      } else if (targetRole === 'player') {
        credentials = { playerCode: 'PLAY-REC-01' };
      }

      const res = await api.login(credentials);
      setStoredToken(res.token);
      setUser(res.user);
      setCompanyInfo(res.company);
      setCurrentPlayer(res.player);
      setSimulatedPlayerCode(null);
      showToast('success', `Alternado para perfil: ${res.user.name}`);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao alternar de perfil.');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('error', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'As senhas digitadas não conferem.');
      return;
    }
    setPassLoading(true);
    try {
      const res = await api.changePassword(newPassword);
      showToast('success', res.message || 'Senha alterada com sucesso.');
      setChangePasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao alterar senha.');
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  // DIRECT PLAYER VIEW VIA URL (?player=CODE)
  const urlPlayerParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('player') : null;
  if (urlPlayerParam) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <PlayerView
          overridePlayerCode={urlPlayerParam}
          onExit={() => {
            window.location.search = '';
          }}
        />
      </div>
    );
  }

  // If not logged in, show Login Screen
  if (!user) {
    return (
      <>
        <OfflineIndicator />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
        <LoginView onLoginSuccess={handleLoginSuccess} showToast={showToast} />
      </>
    );
  }

  // PLAYER VIEW: Fullscreen, no admin menu
  if (user.role === 'player') {
    return (
      <>
        <OfflineIndicator />
        <PlayerView onExit={handleLogout} />
      </>
    );
  }

  // SIMULATED PLAYER SCREEN (Pop-over modal for Company and Operator testing)
  if (simulatedPlayerCode) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <PlayerView
          overridePlayerCode={simulatedPlayerCode}
          onExit={() => setSimulatedPlayerCode(null)}
        />
      </div>
    );
  }

  // ADMIN, COMPANY, OPERATOR VIEWS (With top Navbar)
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <OfflineIndicator />
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      <Navbar
        user={user}
        companyName={companyInfo?.name}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        onChangePasswordClick={() => setChangePasswordOpen(true)}
        onQuickSwitchRole={handleQuickSwitchRole}
      />

      <main className="flex-1">
        {user.role === 'admin' && (
          <AdminDashboard showToast={showToast} onLogout={handleLogout} />
        )}

        {user.role === 'company' && (
          <CompanyDashboard
            showToast={showToast}
            onOpenPlayerSimulation={(code) => setSimulatedPlayerCode(code)}
          />
        )}

        {user.role === 'operator' && (
          <OperatorDashboard
            showToast={showToast}
            onOpenPlayerSimulation={(code) => setSimulatedPlayerCode(code)}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="h-9 bg-slate-800 border-t border-slate-700 px-4 sm:px-8 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest">
        <div>© {new Date().getFullYear()} Media Projector Indoor System - v2.4.0</div>
        <div className="flex gap-4 items-center">
          <span className="hidden sm:inline">Transmissão: SSE Realtime</span>
          <span>Status: <span className="text-green-500 font-bold">Operacional</span></span>
        </div>
      </footer>

      {/* MODAL ALTERAR SENHA */}
      {changePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Alterar Minha Senha</h3>
              </div>
              <button
                onClick={() => setChangePasswordOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nova Senha *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Confirmar Nova Senha *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setChangePasswordOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-600 bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-500 cursor-pointer disabled:opacity-50"
                >
                  {passLoading ? 'Salvando...' : 'Salvar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
