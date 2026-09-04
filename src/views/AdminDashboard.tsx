import React, { useState, useEffect } from 'react';
import { Building2, Layers, Monitor, Plus, CheckCircle, XCircle, KeyRound, Edit2, Power } from 'lucide-react';
import { api } from '../lib/api';
import { Company, Plan, AdminStats } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface AdminDashboardProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ showToast, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies' | 'plans'>('dashboard');
  const [stats, setStats] = useState<AdminStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    totalPlayers: 0,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Password reset modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetCompanyId, setResetCompanyId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Confirmation modal
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  // Company Form state
  const [companyForm, setCompanyForm] = useState({
    legal_name: '',
    trade_name: '',
    cnpj: '',
    email: '',
    phone: '',
    responsible: '',
    address: '',
    city: '',
    state: '',
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    password: '',
  });

  // Plan Form state
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    max_players: 5,
    max_operators: 2,
    max_storage: 100,
    monthly_price: 199,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, c, p] = await Promise.all([
        api.getAdminStats(),
        api.getCompanies(),
        api.getPlans(),
      ]);
      setStats(s);
      setCompanies(c);
      setPlans(p);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCompanyModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setCompanyForm({
        legal_name: company.legal_name,
        trade_name: company.trade_name,
        cnpj: company.cnpj,
        email: company.email,
        phone: company.phone || '',
        responsible: company.responsible || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        plan_id: company.plan_id,
        start_date: company.start_date || '',
        due_date: company.due_date || '',
        password: '',
      });
    } else {
      setEditingCompany(null);
      setCompanyForm({
        legal_name: '',
        trade_name: '',
        cnpj: '',
        email: '',
        phone: '',
        responsible: '',
        address: '',
        city: '',
        state: '',
        plan_id: plans[0]?.id || '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        password: '',
      });
    }
    setCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await api.updateCompany(editingCompany.id, companyForm);
        showToast('success', 'Empresa atualizada com sucesso.');
      } else {
        await api.createCompany(companyForm);
        showToast('success', 'Empresa cadastrada com sucesso.');
      }
      setCompanyModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao salvar empresa.');
    }
  };

  const handleToggleCompany = (company: Company) => {
    const isActivating = company.status === 'inactive';
    setConfirmData({
      isOpen: true,
      title: isActivating ? 'Ativar Empresa' : 'Desativar Empresa',
      message: isActivating
        ? `Deseja ativar a empresa ${company.trade_name}? Seus players voltarão a operar.`
        : `Deseja desativar a empresa ${company.trade_name}? Uma empresa inativa não poderá operar seus players.`,
      action: async () => {
        try {
          const res = await api.toggleCompanyStatus(company.id);
          showToast('success', res.message);
          setConfirmData((prev) => ({ ...prev, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCompanyId) return;
    try {
      const res = await api.resetCompanyPassword(resetCompanyId, newPasswordInput || undefined);
      showToast('success', res.message);
      setResetModalOpen(false);
      setNewPasswordInput('');
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleOpenPlanModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        description: plan.description,
        max_players: plan.max_players,
        max_operators: plan.max_operators,
        max_storage: plan.max_storage,
        monthly_price: plan.monthly_price,
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: '',
        description: '',
        max_players: 5,
        max_operators: 2,
        max_storage: 100,
        monthly_price: 199,
      });
    }
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, planForm);
        showToast('success', 'Plano atualizado com sucesso.');
      } else {
        await api.createPlan(planForm);
        showToast('success', 'Plano criado com sucesso.');
      }
      setPlanModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleTogglePlan = async (plan: Plan) => {
    try {
      const res = await api.togglePlanStatus(plan.id);
      showToast('success', res.message);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      {/* Subheader / Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-5 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">Visão Geral Administrativa</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Acompanhamento central de empresas, planos e operações globais</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="tab-admin-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Dashboard
          </button>
          <button
            id="tab-admin-companies"
            onClick={() => setActiveTab('companies')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'companies'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Empresas ({companies.length})
          </button>
          <button
            id="tab-admin-plans"
            onClick={() => setActiveTab('plans')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Planos ({plans.length})
          </button>
        </div>
      </div>

      {/* VIEW: DASHBOARD MINIMALISTA */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Empresas Ativas
                </span>
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="mt-3 text-4xl font-light text-white">{stats.activeCompanies}</p>
              <div className="mt-4 flex items-center text-xs text-emerald-400 font-medium gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Empresas em operação regular</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Empresas Inativas
                </span>
                <XCircle className="h-5 w-5 text-rose-400" />
              </div>
              <p className="mt-3 text-4xl font-light text-white">{stats.inactiveCompanies}</p>
              <div className="mt-4 flex items-center text-xs text-rose-400/80 font-medium gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                <span>Acesso suspenso ou bloqueado</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Total de Players
                </span>
                <Monitor className="h-5 w-5 text-blue-400" />
              </div>
              <p className="mt-3 text-4xl font-light text-white">{stats.totalPlayers}</p>
              <div className="mt-4 flex items-center text-xs text-blue-400 font-medium gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>Dispositivos conectados na rede</span>
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Atalhos Principais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('companies')}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-750 hover:border-slate-600 transition cursor-pointer text-left group"
              >
                <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">Gerenciar Empresas</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Cadastrar, editar e monitorar planos</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('plans')}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-750 hover:border-slate-600 transition cursor-pointer text-left group"
              >
                <div className="p-2.5 rounded-lg bg-purple-600/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">Gerenciar Planos</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Definir cotas e limites operacionais</p>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/40 transition cursor-pointer text-left"
              >
                <div className="p-2.5 rounded-lg bg-rose-600/20 text-rose-400">
                  <Power className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-200">Encerrar Sessão</h4>
                  <p className="text-xs text-rose-400/80 mt-0.5">Sair com segurança do sistema</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: EMPRESAS */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Empresas Contratantes</h3>
            <button
              id="btn-nova-empresa"
              onClick={() => handleOpenCompanyModal()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Empresa</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800/80 uppercase font-semibold text-slate-400 text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Empresa</th>
                  <th className="px-5 py-3.5">CNPJ / E-mail</th>
                  <th className="px-5 py-3.5">Plano Contratado</th>
                  <th className="px-5 py-3.5">Players / Operadores</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      Nenhuma empresa cadastrada.
                    </td>
                  </tr>
                ) : (
                  companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white text-sm">{c.trade_name}</p>
                        <p className="text-[11px] text-slate-400">{c.legal_name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-slate-200">{c.cnpj}</p>
                        <p className="text-[11px] text-slate-400">{c.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block rounded px-2 py-0.5 bg-blue-900/40 text-blue-300 border border-blue-800 text-[10px] font-bold tracking-wider uppercase">
                          {c.plan_name || 'Plano Padrão'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-300 font-medium">
                          {c.player_count || 0} players | {c.operator_count || 0} operadores
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            c.status === 'active'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {c.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenCompanyModal(c)}
                            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Editar empresa"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetCompanyId(c.id);
                              setResetModalOpen(true);
                            }}
                            className="p-1.5 rounded text-amber-400 hover:bg-slate-700 transition cursor-pointer"
                            title="Resetar senha"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleCompany(c)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                              c.status === 'active'
                                ? 'border border-rose-800 text-rose-300 hover:bg-rose-950/40'
                                : 'border border-emerald-800 text-emerald-300 hover:bg-emerald-950/40'
                            }`}
                          >
                            {c.status === 'active' ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: PLANOS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Planos Comerciais</h3>
            <button
              id="btn-novo-plano"
              onClick={() => handleOpenPlanModal()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Plano</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border p-6 bg-slate-800 flex flex-col justify-between shadow-sm ${
                  p.active ? 'border-slate-700' : 'border-slate-700/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-white tracking-tight">{p.name}</h4>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        p.active
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-slate-700 text-slate-400 border-slate-600'
                      }`}
                    >
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-5 min-h-[32px]">{p.description}</p>

                  <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-700 pt-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">Limite de Players:</span>
                      <strong className="text-white">{p.max_players} pontos</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">Limite de Operadores:</span>
                      <strong className="text-white">{p.max_operators} usuários</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">Armazenamento / Mídias:</span>
                      <strong className="text-white">{p.max_storage} arquivos</strong>
                    </div>
                    <div className="flex justify-between items-baseline pt-3 border-t border-slate-700">
                      <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">Mensalidade:</span>
                      <strong className="text-lg text-blue-400 font-bold">
                        R$ {Number(p.monthly_price).toFixed(2)}<span className="text-xs text-slate-400 font-normal">/mês</span>
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenPlanModal(p)}
                    className="px-3 py-1.5 rounded-lg border border-slate-600 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleTogglePlan(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                      p.active
                        ? 'border border-rose-800 text-rose-300 hover:bg-rose-950/40'
                        : 'border border-emerald-800 text-emerald-300 hover:bg-emerald-950/40'
                    }`}
                  >
                    {p.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL EMPRESA */}
      {companyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl text-slate-100 my-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-slate-700 pb-3 mb-4">
              {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
            </h3>

            <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.trade_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, trade_name: e.target.value })}
                    placeholder="Ex: Drogaria Central"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.legal_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                    placeholder="Ex: Drogaria Central Ltda"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.cnpj}
                    onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">E-mail Principal *</label>
                  <input
                    type="email"
                    required
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    placeholder="contato@empresa.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Responsável</label>
                  <input
                    type="text"
                    value={companyForm.responsible}
                    onChange={(e) => setCompanyForm({ ...companyForm, responsible: e.target.value })}
                    placeholder="Nome do gestor"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    placeholder="São Paulo"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Plano Contratado *</label>
                  <select
                    required
                    value={companyForm.plan_id}
                    onChange={(e) => setCompanyForm({ ...companyForm, plan_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione um plano</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.max_players} players)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={companyForm.start_date}
                    onChange={(e) => setCompanyForm({ ...companyForm, start_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={companyForm.due_date}
                    onChange={(e) => setCompanyForm({ ...companyForm, due_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {!editingCompany && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Senha Inicial de Acesso</label>
                  <input
                    type="password"
                    value={companyForm.password}
                    onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })}
                    placeholder="Padrão: 123456 (alteração obrigatória no 1º acesso)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-500 shadow-sm cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PLANO */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-slate-700 pb-3 mb-4">
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome do Plano *</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="Ex: Plano Profissional"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Detalhes sobre a capacidade deste plano"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Limite de Players *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planForm.max_players}
                    onChange={(e) => setPlanForm({ ...planForm, max_players: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Limite de Operadores *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planForm.max_operators}
                    onChange={(e) => setPlanForm({ ...planForm, max_operators: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Limite de Mídias *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planForm.max_storage}
                    onChange={(e) => setPlanForm({ ...planForm, max_storage: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Valor Mensal (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={planForm.monthly_price}
                    onChange={(e) => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-500 shadow-sm cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESET SENHA */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-slate-700 pb-3 mb-2">Resetar Senha da Empresa</h3>
            <p className="text-xs text-slate-400 mb-4">
              Defina a nova senha temporária para o usuário administrador da empresa.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nova Senha Provisória</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Deixe em branco para o padrão: 123456"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-500 shadow-sm cursor-pointer"
                >
                  Confirmar Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE AÇÃO */}
      <ConfirmModal
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={confirmData.action}
        onCancel={() => setConfirmData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
