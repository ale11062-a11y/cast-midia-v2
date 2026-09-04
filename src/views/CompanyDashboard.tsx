import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Users,
  Film,
  Image as ImageIcon,
  Rss,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  Power,
  ExternalLink,
  UploadCloud,
  Clock,
  Radio,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoveUp,
  MoveDown,
  Tv,
  Smartphone,
} from 'lucide-react';
import { api } from '../lib/api';
import { CompanyStats, Player, Operator, Playlist, Media, RssFeed } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface CompanyDashboardProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenPlayerSimulation: (code: string) => void;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  showToast,
  onOpenPlayerSimulation,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'operators' | 'playlists' | 'media' | 'rss'>('dashboard');
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [rssList, setRssList] = useState<RssFeed[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [rssModalOpen, setRssModalOpen] = useState(false);
  const [editingRss, setEditingRss] = useState<RssFeed | null>(null);

  const [resetPasswordData, setResetPasswordData] = useState<{
    isOpen: boolean;
    type: 'player' | 'operator';
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: 'player',
    id: '',
    title: '',
  });
  const [newPasswordInput, setNewPasswordInput] = useState('');

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

  // Forms
  const [playerForm, setPlayerForm] = useState<{
    name: string;
    code: string;
    location: string;
    description: string;
    orientation: 'horizontal' | 'vertical';
    playlist_id: string;
    password: string;
  }>({
    name: '',
    code: '',
    location: '',
    description: '',
    orientation: 'horizontal',
    playlist_id: '',
    password: '',
  });

  const [operatorForm, setOperatorForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [playlistForm, setPlaylistForm] = useState<{
    name: string;
    description: string;
    weather_city: string;
    items: Array<{
      media_id: string;
      duration: number;
    }>;
  }>({
    name: '',
    description: '',
    weather_city: '',
    items: [],
  });

  const [mediaForm, setMediaForm] = useState({
    name: '',
    type: 'image' as 'image' | 'video',
    file_url: '',
    duration: 10,
  });

  const [rssForm, setRssForm] = useState({
    name: '',
    url: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, pl, op, py, md, rs] = await Promise.all([
        api.getCompanyStats(),
        api.getCompanyPlayers(),
        api.getCompanyOperators(),
        api.getCompanyPlaylists(),
        api.getCompanyMedia(),
        api.getCompanyRss(),
      ]);
      setStats(s);
      setPlayers(pl);
      setOperators(op);
      setPlaylists(py);
      setMediaList(md);
      setRssList(rs);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao carregar dados da empresa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh stats and player status periodically
    const interval = setInterval(() => {
      api.getCompanyPlayers().then(setPlayers).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- PLAYER HANDLERS ---
  const handleOpenPlayerModal = (player?: Player) => {
    if (player) {
      setEditingPlayer(player);
      setPlayerForm({
        name: player.name,
        code: player.code,
        location: player.location || '',
        description: player.description || '',
        orientation: player.orientation || 'horizontal',
        playlist_id: player.playlist_id || '',
        password: '',
      });
    } else {
      setEditingPlayer(null);
      const nextCode = `PLAY-0${players.length + 1}`;
      setPlayerForm({
        name: '',
        code: nextCode,
        location: '',
        description: '',
        orientation: 'horizontal',
        playlist_id: playlists[0]?.id || '',
        password: '',
      });
    }
    setPlayerModalOpen(true);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await api.updateCompanyPlayer(editingPlayer.id, playerForm);
        showToast('success', 'Player atualizado com sucesso.');
      } else {
        await api.createCompanyPlayer(playerForm);
        showToast('success', 'Player cadastrado com sucesso.');
      }
      setPlayerModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleTogglePlayer = (player: Player) => {
    const isActivating = player.status === 'inactive';
    setConfirmData({
      isOpen: true,
      title: isActivating ? 'Ativar Player' : 'Desativar Player',
      message: isActivating
        ? `Deseja ativar o player ${player.name}?`
        : `Deseja desativar o player ${player.name}? Ele não reproduzirá conteúdos enquanto inativo.`,
      action: async () => {
        try {
          const res = await api.togglePlayerStatus(player.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  const handleDeletePlayer = (player: Player) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Player',
      message: `Tem certeza que deseja excluir o player ${player.name} (${player.code})?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyPlayer(player.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // --- OPERATOR HANDLERS ---
  const handleOpenOperatorModal = (operator?: Operator) => {
    if (operator) {
      setEditingOperator(operator);
      setOperatorForm({
        name: operator.name,
        email: operator.email,
        phone: operator.phone || '',
        password: '',
      });
    } else {
      setEditingOperator(null);
      setOperatorForm({
        name: '',
        email: '',
        phone: '',
        password: '',
      });
    }
    setOperatorModalOpen(true);
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOperator) {
        await api.updateCompanyOperator(editingOperator.id, operatorForm);
        showToast('success', 'Operador atualizado com sucesso.');
      } else {
        await api.createCompanyOperator(operatorForm);
        showToast('success', 'Operador cadastrado com sucesso.');
      }
      setOperatorModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleToggleOperator = async (operator: Operator) => {
    try {
      const res = await api.toggleOperatorStatus(operator.id);
      showToast('success', res.message);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeleteOperator = (operator: Operator) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Operador',
      message: `Tem certeza que deseja excluir o operador ${operator.name}?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyOperator(operator.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // --- PLAYLIST HANDLERS ---
  const handleOpenPlaylistModal = (playlist?: Playlist) => {
    if (playlist) {
      setEditingPlaylist(playlist);
      setPlaylistForm({
        name: playlist.name,
        description: playlist.description || '',
        weather_city: playlist.weather_city || '',
        items: playlist.items.map((it) => ({
          media_id: it.media_id,
          duration: it.duration || 10,
        })),
      });
    } else {
      setEditingPlaylist(null);
      setPlaylistForm({
        name: '',
        description: '',
        weather_city: '',
        items: mediaList.slice(0, 2).map((m) => ({ media_id: m.id, duration: m.duration || 10 })),
      });
    }
    setPlaylistModalOpen(true);
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlaylist) {
        await api.updateCompanyPlaylist(editingPlaylist.id, playlistForm);
        showToast('success', 'Playlist atualizada com sucesso.');
      } else {
        await api.createCompanyPlaylist(playlistForm);
        showToast('success', 'Playlist criada com sucesso.');
      }
      setPlaylistModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleTogglePlaylist = async (playlist: Playlist) => {
    try {
      const res = await api.togglePlaylistStatus(playlist.id);
      showToast('success', res.message);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Playlist',
      message: `Tem certeza que deseja excluir a playlist ${playlist.name}?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyPlaylist(playlist.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // --- MEDIA HANDLERS ---
  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.uploadCompanyMedia(mediaForm);
      showToast('success', 'Mídia cadastrada com sucesso.');
      setMediaModalOpen(false);
      setMediaForm({ name: '', type: 'image', file_url: '', duration: 10 });
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeleteMedia = (media: Media) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Mídia',
      message: `Tem certeza que deseja excluir a mídia "${media.name}"?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyMedia(media.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // Sample media templates for quick testing
  const addPresetMedia = (title: string, type: 'image' | 'video', url: string, duration: number) => {
    setMediaForm({
      name: title,
      type,
      file_url: url,
      duration,
    });
  };

  // --- RSS HANDLERS ---
  const handleOpenRssModal = (rss?: RssFeed) => {
    if (rss) {
      setEditingRss(rss);
      setRssForm({ name: rss.name, url: rss.url });
    } else {
      setEditingRss(null);
      setRssForm({ name: '', url: 'https://g1.globo.com/rss/g1/brasil/' });
    }
    setRssModalOpen(true);
  };

  const handleSaveRss = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRss) {
        await api.updateCompanyRss(editingRss.id, rssForm);
        showToast('success', 'Feed RSS atualizado.');
      } else {
        await api.createCompanyRss(rssForm);
        showToast('success', 'Feed RSS cadastrado.');
      }
      setRssModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleToggleRss = async (rss: RssFeed) => {
    try {
      const res = await api.toggleRssStatus(rss.id);
      showToast('success', res.message);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeleteRss = (rss: RssFeed) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Feed RSS',
      message: `Tem certeza que deseja remover o feed "${rss.name}"?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyRss(rss.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // --- PASSWORD RESET HANDLER ---
  const handlePerformPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (resetPasswordData.type === 'player') {
        const res = await api.resetPlayerPassword(resetPasswordData.id, newPasswordInput || undefined);
        showToast('success', res.message);
      } else {
        const res = await api.resetOperatorPassword(resetPasswordData.id, newPasswordInput || undefined);
        showToast('success', res.message);
      }
      setResetPasswordData((p) => ({ ...p, isOpen: false }));
      setNewPasswordInput('');
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Top Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-5 mb-8">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight uppercase">Painel da Empresa</h2>
          <p className="text-xs text-slate-400 mt-0.5 tracking-wider">Gestão de players, operadores, playlists e mídias</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'players'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Players ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('operators')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'operators'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Operadores ({operators.length})
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Playlists ({playlists.length})
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'media'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Mídias ({mediaList.length})
          </button>
          <button
            onClick={() => setActiveTab('rss')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'rss'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            RSS ({rssList.length})
          </button>
        </div>
      </div>

      {/* VIEW: DASHBOARD MINIMALISTA COM LIMITES DO PLANO */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-8">
          {/* 4 Cards de Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Players Ativos
                </span>
                <Monitor className="h-4 w-4 text-blue-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white tracking-tight">
                {stats.activePlayersCount}{' '}
                <span className="text-xs font-normal text-slate-400">/ {stats.playersCount} total</span>
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium">{stats.onlinePlayersCount} online no momento</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Operadores
                </span>
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white tracking-tight">{stats.operatorsCount}</p>
              <p className="mt-2 text-xs text-slate-400">Atendentes autorizados</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Playlists
                </span>
                <Film className="h-4 w-4 text-purple-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white tracking-tight">{stats.playlistsCount}</p>
              <p className="mt-2 text-xs text-slate-400">Grades de reprodução</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mídias Cadastradas
                </span>
                <ImageIcon className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white tracking-tight">{stats.mediaCount}</p>
              <p className="mt-2 text-xs text-slate-400">Imagens e vídeos</p>
            </div>
          </div>

          {/* Resumo dos Limites do Plano */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Limites do Plano: {stats.plan?.name || 'Plano Personalizado'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consumo em tempo real em relação à cota máxima contratada
                </p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800/80">
                R$ {Number(stats.plan?.monthly_price || 0).toFixed(2)}/mês
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Players limit */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Players Utilizados</span>
                  <span className="font-semibold text-white">
                    {stats.playersCount} / {stats.limits.max_players}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (stats.playersCount / stats.limits.max_players) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Operators limit */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Operadores Utilizados</span>
                  <span className="font-semibold text-white">
                    {stats.operatorsCount} / {stats.limits.max_operators}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (stats.operatorsCount / stats.limits.max_operators) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Storage limit */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Mídias em Armazenamento</span>
                  <span className="font-semibold text-white">
                    {stats.mediaCount} / {stats.limits.max_storage}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (stats.mediaCount / stats.limits.max_storage) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: PLAYERS */}
      {activeTab === 'players' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Players de Mídia</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pontos de exibição instalados em TVs e monitores</p>
            </div>
            <button
              onClick={() => handleOpenPlayerModal()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Player</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800 uppercase font-bold text-slate-400 text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Identificação / Nome</th>
                  <th className="px-5 py-3.5">Código Único</th>
                  <th className="px-5 py-3.5">Formato & Resolução</th>
                  <th className="px-5 py-3.5">Localização</th>
                  <th className="px-5 py-3.5">Playlist Associada</th>
                  <th className="px-5 py-3.5">Conexão</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      Nenhum player cadastrado. Clique em "Novo Player" para adicionar uma tela.
                    </td>
                  </tr>
                ) : (
                  players.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white text-sm">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.description || 'Sem descrição'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono bg-slate-900 px-2.5 py-1 rounded text-xs font-bold text-blue-400 border border-slate-700">
                          {p.code}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {p.orientation === 'vertical' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                            <Smartphone className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span>9:16 (1080×1920) Vertical</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-950/60 text-blue-300 border border-blue-800/80">
                            <Tv className="h-3 w-3 text-blue-400 shrink-0" />
                            <span>16:9 (1920×1080) Horizontal</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-200">{p.location || 'Não informada'}</td>
                      <td className="px-5 py-4">
                        <span className="rounded bg-slate-900/80 px-2.5 py-1 text-slate-300 border border-slate-700 text-xs">
                          {p.playlist_name || 'Nenhuma'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.is_online
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          {p.is_online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'active'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-800'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {p.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de abrir simulador do player */}
                          <button
                            onClick={() => onOpenPlayerSimulation(p.code)}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Abrir reprodutor de tela"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPlayerModal(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetPasswordData({
                                isOpen: true,
                                type: 'player',
                                id: p.id,
                                title: `Resetar Senha do Player ${p.name}`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Resetar senha"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleTogglePlayer(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title={p.status === 'active' ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(p)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* VIEW: OPERADORES */}
      {activeTab === 'operators' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Operadores de Atendimento</h3>
              <p className="text-xs text-slate-400 mt-0.5">Usuários autorizados a realizar chamadas nos players</p>
            </div>
            <button
              onClick={() => handleOpenOperatorModal()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Operador</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800 uppercase font-bold text-slate-400 text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nome</th>
                  <th className="px-5 py-3.5">E-mail de Acesso</th>
                  <th className="px-5 py-3.5">Telefone</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {operators.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      Nenhum operador cadastrado. Clique em "Novo Operador".
                    </td>
                  </tr>
                ) : (
                  operators.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-5 py-4 font-bold text-white text-sm">{op.name}</td>
                      <td className="px-5 py-4 text-slate-300 font-mono">{op.email}</td>
                      <td className="px-5 py-4 text-slate-300">{op.phone || 'Não informado'}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            op.active
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${op.active ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          />
                          {op.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenOperatorModal(op)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetPasswordData({
                                isOpen: true,
                                type: 'operator',
                                id: op.id,
                                title: `Resetar Senha do Operador ${op.name}`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Resetar senha"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleOperator(op)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title={op.active ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOperator(op)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* VIEW: PLAYLISTS */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Playlists de Exibição</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monte grades de conteúdo e ordene a reprodução</p>
            </div>
            <button
              onClick={() => handleOpenPlaylistModal()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Playlist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {playlists.length === 0 ? (
              <div className="col-span-2 rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400 text-xs">
                Nenhuma playlist cadastrada.
              </div>
            ) : (
              playlists.map((pl) => (
                <div key={pl.id} className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{pl.name}</h4>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border tracking-wider ${
                            pl.active
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          {pl.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{pl.description || 'Sem descrição'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-sky-300 bg-sky-950/70 border border-sky-800/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium">
                          🌤️ Clima: {pl.weather_city || 'São Paulo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPlaylistModal(pl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                        title="Editar playlist"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePlaylist(pl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                        title={pl.active ? 'Desativar' : 'Ativar'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlaylist(pl)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Itens da Playlist */}
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Sequência ({pl.items.length} itens):
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
                      {pl.items.map((it, idx) => (
                        <div
                          key={it.id || idx}
                          className="flex items-center justify-between rounded-lg bg-slate-900/70 border border-slate-700/60 px-3 py-2 text-slate-300"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-slate-500 font-bold">{idx + 1}.</span>
                            <span className="truncate text-white font-medium">{it.name || 'Mídia'}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">({it.type})</span>
                          </div>
                          <span className="shrink-0 font-mono text-xs text-blue-400 font-bold">
                            {it.duration}s
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW: MÍDIAS */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Biblioteca de Mídias</h3>
              <p className="text-xs text-slate-400 mt-0.5">Imagens (JPG, PNG, WEBP) e Vídeos (MP4, WebM)</p>
            </div>
            <button
              onClick={() => {
                setMediaForm({
                  name: '',
                  type: 'image',
                  file_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
                  duration: 10,
                });
                setMediaModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Cadastrar Mídia</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {mediaList.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {m.type === 'video' ? (
                    <video
                      src={m.file_url}
                      muted
                      className="h-full w-full object-cover"
                      poster=""
                    />
                  ) : (
                    <img
                      src={m.file_url}
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute top-2 right-2 rounded bg-slate-900/90 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-xs">
                    {m.type}
                  </span>
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-white text-sm truncate">{m.name}</h4>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {m.duration} segundos
                    </span>
                    <button
                      onClick={() => handleDeleteMedia(m)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: RSS */}
      {activeTab === 'rss' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Feeds RSS (Letreiro de Notícias)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Os títulos são exibidos automaticamente na barra inferior dos players
              </p>
            </div>
            <button
              onClick={() => handleOpenRssModal()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Feed RSS</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800 uppercase font-bold text-slate-400 text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nome do Canal</th>
                  <th className="px-5 py-3.5">URL do Feed</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {rssList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      Nenhum canal RSS cadastrado.
                    </td>
                  </tr>
                ) : (
                  rssList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-5 py-4 font-bold text-white">{r.name}</td>
                      <td className="px-5 py-4 font-mono text-slate-300 truncate max-w-xs">{r.url}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            r.active
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {r.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRssModal(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleRss(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title={r.active ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRss(r)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* MODAL PLAYER */}
      {playerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-4">
              {editingPlayer ? 'Editar Player' : 'Novo Player'}
            </h3>
            <form onSubmit={handleSavePlayer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome do Ponto de Exibição *</label>
                <input
                  type="text"
                  required
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                  placeholder="Ex: TV Recepção Principal"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Código Único (TV) *</label>
                  <input
                    type="text"
                    required
                    value={playerForm.code}
                    onChange={(e) => setPlayerForm({ ...playerForm, code: e.target.value.toUpperCase() })}
                    placeholder="EX: PLAY-01"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono uppercase text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Localização</label>
                  <input
                    type="text"
                    value={playerForm.location}
                    onChange={(e) => setPlayerForm({ ...playerForm, location: e.target.value })}
                    placeholder="Ex: Balcão 01"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Orientação & Resolução */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Orientação da Tela & Resolução *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPlayerForm({ ...playerForm, orientation: 'horizontal' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      playerForm.orientation === 'horizontal'
                        ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-slate-200">
                        Horizontal (16:9)
                      </span>
                      <Tv className="h-4 w-4 text-blue-400 shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-9 h-5 rounded border border-current flex items-center justify-center text-[8px] font-mono font-bold">
                        16:9
                      </div>
                      <span className="text-xs font-semibold text-white">1920 × 1080 px</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Smart TVs, Monitores em Modo Paisagem
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlayerForm({ ...playerForm, orientation: 'vertical' })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      playerForm.orientation === 'vertical'
                        ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-slate-200">
                        Vertical (9:16)
                      </span>
                      <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-8 rounded border border-current flex items-center justify-center text-[8px] font-mono font-bold">
                        9:16
                      </div>
                      <span className="text-xs font-semibold text-white">1080 × 1920 px</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Totens Digitais, Telas em Modo Retrato
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Playlist Padrão</label>
                <select
                  value={playerForm.playlist_id}
                  onChange={(e) => setPlayerForm({ ...playerForm, playlist_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sem playlist associada</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>

              {!editingPlayer && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Senha de Acesso do Player</label>
                  <input
                    type="password"
                    value={playerForm.password}
                    onChange={(e) => setPlayerForm({ ...playerForm, password: e.target.value })}
                    placeholder="Padrão: 123456"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPlayerModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                >
                  Salvar Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL OPERADOR */}
      {operatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-4">
              {editingOperator ? 'Editar Operador' : 'Novo Operador'}
            </h3>
            <form onSubmit={handleSaveOperator} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome do Operador *</label>
                <input
                  type="text"
                  required
                  value={operatorForm.name}
                  onChange={(e) => setOperatorForm({ ...operatorForm, name: e.target.value })}
                  placeholder="Ex: Carlos Atendente"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">E-mail para Login *</label>
                <input
                  type="email"
                  required
                  value={operatorForm.email}
                  onChange={(e) => setOperatorForm({ ...operatorForm, email: e.target.value })}
                  placeholder="operador@empresa.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={operatorForm.phone}
                  onChange={(e) => setOperatorForm({ ...operatorForm, phone: e.target.value })}
                  placeholder="(11) 98888-8888"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {!editingOperator && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Senha Provisória</label>
                  <input
                    type="password"
                    value={operatorForm.password}
                    onChange={(e) => setOperatorForm({ ...operatorForm, password: e.target.value })}
                    placeholder="Padrão: 123456"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOperatorModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                >
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PLAYLIST (COM SELEÇÃO E ORDENAÇÃO DE MÍDIAS) */}
      {playlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 my-8">
            <h3 className="text-base font-bold text-white mb-4">
              {editingPlaylist ? 'Editar Playlist' : 'Nova Playlist'}
            </h3>

            <form onSubmit={handleSavePlaylist} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome da Playlist *</label>
                <input
                  type="text"
                  required
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, name: e.target.value })}
                  placeholder="Ex: Programação Diária - Farmácia"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })}
                  placeholder="Observações da grade"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Cidade do Widget de Clima / Temperatura</span>
                  <span className="text-[10px] text-slate-400 font-normal">Fixo no rodapé do player</span>
                </label>
                <input
                  type="text"
                  value={playlistForm.weather_city}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, weather_city: e.target.value })}
                  placeholder="Ex: São Paulo, Campinas, Belo Horizonte, Rio de Janeiro"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  O player buscará a temperatura e clima em tempo real para exibir de forma fixa no ticker da tela.
                </p>
              </div>

              {/* Itens na Playlist */}
              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-300">Itens e Tempos de Exibição</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaList.length > 0) {
                        setPlaylistForm({
                          ...playlistForm,
                          items: [...playlistForm.items, { media_id: mediaList[0].id, duration: 10 }],
                        });
                      }
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar Mídia
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {playlistForm.items.length === 0 ? (
                    <p className="text-slate-400 py-3 text-center">Nenhuma mídia nesta playlist.</p>
                  ) : (
                    playlistForm.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800/60 p-2.5"
                      >
                        <span className="font-mono text-slate-400 font-bold text-xs w-5">{idx + 1}.</span>
                        <select
                          value={it.media_id}
                          onChange={(e) => {
                            const newItems = [...playlistForm.items];
                            newItems[idx].media_id = e.target.value;
                            setPlaylistForm({ ...playlistForm, items: newItems });
                          }}
                          className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-white text-xs"
                        >
                          {mediaList.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.type.toUpperCase()})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={2}
                            max={600}
                            value={it.duration}
                            onChange={(e) => {
                              const newItems = [...playlistForm.items];
                              newItems[idx].duration = Number(e.target.value);
                              setPlaylistForm({ ...playlistForm, items: newItems });
                            }}
                            className="w-16 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-white text-xs text-center"
                          />
                          <span className="text-slate-400 text-[11px]">seg</span>
                        </div>

                        {/* Order buttons */}
                        <div className="flex items-center">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...playlistForm.items];
                                const temp = newItems[idx - 1];
                                newItems[idx - 1] = newItems[idx];
                                newItems[idx] = temp;
                                setPlaylistForm({ ...playlistForm, items: newItems });
                              }}
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                              title="Subir"
                            >
                              <MoveUp className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {idx < playlistForm.items.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...playlistForm.items];
                                const temp = newItems[idx + 1];
                                newItems[idx + 1] = newItems[idx];
                                newItems[idx] = temp;
                                setPlaylistForm({ ...playlistForm, items: newItems });
                              }}
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                              title="Descer"
                            >
                              <MoveDown className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = playlistForm.items.filter((_, i) => i !== idx);
                              setPlaylistForm({ ...playlistForm, items: newItems });
                            }}
                            className="p-1 text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPlaylistModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                >
                  Salvar Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MÍDIA */}
      {mediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-4">Cadastrar Nova Mídia</h3>
            <form onSubmit={handleSaveMedia} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título / Nome *</label>
                <input
                  type="text"
                  required
                  value={mediaForm.name}
                  onChange={(e) => setMediaForm({ ...mediaForm, name: e.target.value })}
                  placeholder="Ex: Campanha Gripe 2026"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipo de Mídia *</label>
                  <select
                    value={mediaForm.type}
                    onChange={(e) => setMediaForm({ ...mediaForm, type: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="image">Imagem (JPG, PNG, WEBP)</option>
                    <option value="video">Vídeo (MP4, WebM)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tempo Padrão (seg) *</label>
                  <input
                    type="number"
                    min={2}
                    required
                    value={mediaForm.duration}
                    onChange={(e) => setMediaForm({ ...mediaForm, duration: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">URL do Arquivo / Mídia *</label>
                <input
                  type="url"
                  required
                  value={mediaForm.file_url}
                  onChange={(e) => setMediaForm({ ...mediaForm, file_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Exemplos Rápidos para Teste */}
              <div className="rounded-lg bg-slate-800/60 p-2.5 border border-slate-800 text-[11px]">
                <p className="text-slate-400 font-medium mb-1.5">Mídias de Exemplo para Teste:</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Medicamentos com Desconto',
                        'image',
                        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80',
                        12
                      )
                    }
                    className="bg-slate-700 px-2 py-1 rounded text-slate-200 hover:bg-slate-600 transition cursor-pointer"
                  >
                    + Banner Farmácia
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Dicas de Hidratação',
                        'image',
                        'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=1200&q=80',
                        10
                      )
                    }
                    className="bg-slate-700 px-2 py-1 rounded text-slate-200 hover:bg-slate-600 transition cursor-pointer"
                  >
                    + Banner Saúde
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Vídeo Institucional',
                        'video',
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                        15
                      )
                    }
                    className="bg-slate-700 px-2 py-1 rounded text-slate-200 hover:bg-slate-600 transition cursor-pointer"
                  >
                    + Vídeo Exemplo
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMediaModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                >
                  Salvar Mídia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RSS */}
      {rssModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-4">
              {editingRss ? 'Editar Feed RSS' : 'Novo Feed RSS'}
            </h3>
            <form onSubmit={handleSaveRss} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome do Canal *</label>
                <input
                  type="text"
                  required
                  value={rssForm.name}
                  onChange={(e) => setRssForm({ ...rssForm, name: e.target.value })}
                  placeholder="Ex: G1 Brasil"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">URL do Link RSS (XML) *</label>
                <input
                  type="url"
                  required
                  value={rssForm.url}
                  onChange={(e) => setRssForm({ ...rssForm, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRssModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                >
                  Salvar RSS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESET SENHA (PLAYER OU OPERADOR) */}
      {resetPasswordData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white mb-2">{resetPasswordData.title}</h3>
            <p className="text-xs text-slate-400 mb-4">
              Informe a nova senha temporária para o acesso.
            </p>
            <form onSubmit={handlePerformPasswordReset} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Deixe em branco para o padrão: 123456"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordData((p) => ({ ...p, isOpen: false }))}
                  className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                >
                  Salvar
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
        onCancel={() => setConfirmData((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};
