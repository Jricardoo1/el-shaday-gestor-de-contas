import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Store,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Users,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AuthService } from '../services/auth';
import { UserAccount } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  initialMode?: 'login' | 'register';
  canClose?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login',
  canClose = true,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('SAO PAULO');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedUsers, setSavedUsers] = useState<UserAccount[]>([]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      AuthService.getAllUsers().then((list) => setSavedUsers(list));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const user = await AuthService.login(email, password);
      setSuccessMessage(`Bem-vindo de volta, ${user.name}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await AuthService.register({
        name,
        storeName,
        email,
        password,
        phone,
        city,
      });
      setSuccessMessage(`Conta criada com sucesso! Loja "${user.storeName}" configurada.`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await AuthService.login('demo@fiado.com', '123456');
      setSuccessMessage('Acessando com a Loja Demonstração...');
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 600);
    } catch (err: any) {
      // If demo user wasn't registered yet, try registering it
      try {
        const user = await AuthService.register({
          name: 'José Ricardo Martins',
          storeName: 'Restaurante & Marmitaria do Zé',
          email: 'demo@fiado.com',
          password: '123456',
          phone: '11988887777',
          city: 'SAO PAULO',
        });
        setSuccessMessage('Conta demonstração criada e acessada!');
        setTimeout(() => {
          onLoginSuccess(user);
          onClose();
        }, 600);
      } catch (innerErr: any) {
        setError(innerErr?.message || 'Erro ao acessar conta de demonstração.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuickAccount = (user: UserAccount) => {
    setEmail(user.email);
    setPassword('');
  };

  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <User className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {mode === 'login' ? 'Acessar Minha Conta' : 'Criar Nova Conta de Usuário'}
              </h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Dados, fiados e clientes salvos individualmente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Opções de Subir ou Descer a Janela */}
            <div className="hidden sm:flex items-center bg-black/25 rounded-xl p-0.5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setVerticalPosition('top')}
                title="Subir Janela para o Topo"
                className={`p-1.5 rounded-lg transition ${
                  verticalPosition === 'top'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setVerticalPosition('center')}
                title="Centralizar Janela"
                className={`px-1.5 py-0.5 text-[10px] rounded-lg transition ${
                  verticalPosition === 'center'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Centro
              </button>
              <button
                type="button"
                onClick={() => setVerticalPosition('bottom')}
                title="Descer Janela para a Base"
                className={`p-1.5 rounded-lg transition ${
                  verticalPosition === 'bottom'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {canClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab switcher: Entrar vs Criar Conta */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Entrar com Minha Conta</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Criar Nova Conta</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Alerts */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail ou Nome de Usuário *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="seuemail@comercio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha de Acesso *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Verificando dados...' : 'Entrar no Sistema'}</span>
              </button>

              {/* Atalho Demo */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Acessar Loja Demonstração (demo@fiado.com)</span>
                </button>
              </div>

              {/* Saved accounts on this device */}
              {savedUsers.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Contas salvas neste dispositivo:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {savedUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectQuickAccount(u)}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition flex items-center justify-between group"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-800 block truncate group-hover:text-emerald-700">
                            {u.name}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {u.storeName} • {u.email}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 group-hover:underline">
                          Usar
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seu Nome Completo (Responsável) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do seu Comércio / Loja *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bar & Lanchonete do Carlos"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail ou Usuário para Login *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="carlos@bar.com ou carlos_bar"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="tel"
                    placeholder="11999998888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    placeholder="São Paulo - SP"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha de Acesso (mínimo 4 dígitos) *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Crie uma senha segura"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirme a Senha *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Criando conta privada...' : 'Criar Conta e Iniciar'}</span>
              </button>
            </form>
          )}

          <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Seus dados ficam 100% isolados e seguros na nuvem</span>
          </div>
        </div>
      </div>
    </div>
  );
};
