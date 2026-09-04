import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Send,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  CheckCircle2,
  Radio,
  Monitor,
  Star,
  Pin,
} from 'lucide-react';
import { api } from '../lib/api';
import { CallPhrase, Player } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface OperatorDashboardProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenPlayerSimulation?: (code: string) => void;
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  showToast,
  onOpenPlayerSimulation,
}) => {
  const [activeTab, setActiveTab] = useState<'call' | 'phrases'>('call');
  const [players, setPlayers] = useState<
    Array<Pick<Player, 'id' | 'name' | 'code' | 'location'> & { is_online: boolean; last_seen: string }>
  >([]);
  const [phrases, setPhrases] = useState<CallPhrase[]>([]);
  // Persistent Phrase & Player selection via localStorage
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(() => {
    try {
      return localStorage.getItem('indoor_op_player_id') || '';
    } catch {
      return '';
    }
  });
  const [callText, setCallText] = useState<string>(() => {
    try {
      return localStorage.getItem('indoor_op_call_text') || '';
    } catch {
      return '';
    }
  });
  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('indoor_op_phrase_id') || null;
    } catch {
      return null;
    }
  });
  const [isPriority, setIsPriority] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(10);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [lastCallDelivered, setLastCallDelivered] = useState<boolean | null>(null);

  // Sync chosen phrase and player persistently so they remain fixed after choosing/calling
  useEffect(() => {
    try {
      if (callText) localStorage.setItem('indoor_op_call_text', callText);
      if (selectedPlayerId) localStorage.setItem('indoor_op_player_id', selectedPlayerId);
      if (selectedPhraseId) {
        localStorage.setItem('indoor_op_phrase_id', selectedPhraseId);
      } else {
        localStorage.removeItem('indoor_op_phrase_id');
      }
    } catch {}
  }, [callText, selectedPlayerId, selectedPhraseId]);

  // Phrase management
  const [phraseModalOpen, setPhraseModalOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<CallPhrase | null>(null);
  const [phraseInput, setPhraseInput] = useState('');

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

  const loadData = async () => {
    try {
      const res = await api.getOperatorDashboard();
      setPlayers(res.players);
      setPhrases(res.phrases);
      if (res.players.length > 0 && !selectedPlayerId) {
        setSelectedPlayerId(res.players[0].id);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao carregar dados do operador.');
    }
  };

  useEffect(() => {
    loadData();
    // Poll player status every 10s
    const interval = setInterval(() => {
      api.getOperatorDashboard()
        .then((res) => {
          setPlayers(res.players);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPredefined = (item: CallPhrase) => {
    setCallText(item.phrase);
    setSelectedPhraseId(item.id);
  };

  const handleTriggerCall = async (overridePriority?: boolean) => {
    if (!selectedPlayerId) {
      showToast('error', 'Selecione um player de exibição.');
      return;
    }
    if (!callText.trim()) {
      showToast('error', 'Digite ou selecione uma frase de chamada.');
      return;
    }

    const priorityToSend = overridePriority !== undefined ? overridePriority : isPriority;
    setIsCalling(true);
    try {
      const res = await api.triggerCall({
        playerId: selectedPlayerId,
        phrase: callText.trim(),
        phraseId: selectedPhraseId || undefined,
        duration,
        isPriority: priorityToSend,
      });

      // Synchronize immediately with all open tabs and windows in the browser
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('indoor_media_calls');
          bc.postMessage({ type: 'CALL_EVENT', call: res.call });
          bc.close();
        }
      } catch {}

      try {
        localStorage.setItem(
          'indoor_last_call',
          JSON.stringify({ call: res.call, timestamp: Date.now() })
        );
      } catch {}

      setLastCallDelivered(res.delivered);
      showToast(
        'success',
        priorityToSend
          ? 'Chamada PREFERENCIAL enviada com sucesso!'
          : res.message || 'Chamada enviada com sucesso.'
      );
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao enviar chamada.');
    } finally {
      setIsCalling(false);
    }
  };

  // Quick phrase addition
  const handleSavePhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseInput.trim()) return;
    try {
      if (editingPhrase) {
        await api.updateOperatorPhrase(editingPhrase.id, { phrase: phraseInput.trim() });
        showToast('success', 'Frase atualizada com sucesso.');
      } else {
        await api.createOperatorPhrase(phraseInput.trim());
        showToast('success', 'Nova frase cadastrada.');
      }
      setPhraseModalOpen(false);
      setPhraseInput('');
      setEditingPhrase(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeletePhrase = (item: CallPhrase) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Frase',
      message: `Tem certeza que deseja excluir a frase "${item.phrase}"?`,
      action: async () => {
        try {
          const res = await api.deleteOperatorPhrase(item.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-5 mb-8">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-2.5">
            <BellRing className="h-5 w-5 text-blue-400" />
            <span>Terminal de Chamadas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 tracking-wider">
            Envio instantâneo de frases de atendimento para os players de tela
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="tab-operator-call"
            onClick={() => setActiveTab('call')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'call'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Fazer Chamada
          </button>
          <button
            id="tab-operator-phrases"
            onClick={() => setActiveTab('phrases')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'phrases'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Frases Salvas ({phrases.length})
          </button>
        </div>
      </div>

      {/* VIEW: FAZER CHAMADA */}
      {activeTab === 'call' && (
        <div className="space-y-6">
          {/* 1. SELEÇÃO DO PLAYER COM INDICADOR VISUAL ONLINE/OFFLINE */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Monitor className="h-4 w-4 text-blue-400" />
                <span>1. Selecione o Player Destino</span>
              </label>
              {selectedPlayer && (
                <div className="flex items-center gap-3">
                  <a
                    href={`/?player=${encodeURIComponent(selectedPlayer.code)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold underline flex items-center gap-1 cursor-pointer"
                    title="Abre a tela do player em uma nova aba para acompanhar as chamadas ao vivo"
                  >
                    Abrir Player ({selectedPlayer.code}) em nova aba ↗
                  </a>
                  {onOpenPlayerSimulation && (
                    <button
                      type="button"
                      onClick={() => onOpenPlayerSimulation(selectedPlayer.code)}
                      className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      (simular nesta aba)
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.length === 0 ? (
                <p className="text-xs text-slate-400 col-span-2 py-2">Nenhum player disponível na sua empresa.</p>
              ) : (
                players.map((p) => {
                  const isSelected = p.id === selectedPlayerId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlayerId(p.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-slate-700 bg-slate-900/60 hover:bg-slate-900'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{p.name}</span>
                          <span className="font-mono text-[10px] text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-bold">
                            {p.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{p.location || 'Sem localização'}</p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. DIGITAÇÃO OU SELEÇÃO RÁPIDA DA FRASE (PERSISTENTE) */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>2. Frase de Chamada</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-950/80 border border-blue-800/80 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                    <Pin className="h-3 w-3 text-blue-400" />
                    Frase Fixa (Persistente)
                  </span>
                  {callText && (
                    <button
                      type="button"
                      onClick={() => {
                        setCallText('');
                        setSelectedPhraseId(null);
                        try {
                          localStorage.removeItem('indoor_op_call_text');
                          localStorage.removeItem('indoor_op_phrase_id');
                        } catch {}
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
              <textarea
                id="input-call-phrase"
                rows={3}
                value={callText}
                onChange={(e) => {
                  setCallText(e.target.value);
                  setSelectedPhraseId(null);
                }}
                placeholder="Ex: Favor comparecer ao consultório 02 / Senha P01"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3.5 text-sm font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A frase escolhida permanece fixa na tela após a chamada para facilitar chamadas contínuas.
              </p>
            </div>

            {/* Fila / Atendimento Preferencial */}
            <div className={`rounded-xl border p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isPriority
                ? 'border-amber-500/80 bg-amber-950/40'
                : 'border-amber-900/40 bg-amber-950/15'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Fila Preferencial</span>
                    {isPriority && (
                      <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                        Ativa
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-amber-300/80">
                    Alerta com selo e destaque visual dourado de Atendimento Prioritário na tela
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPriority(!isPriority)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isPriority
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${isPriority ? 'fill-slate-950' : ''}`} />
                  <span>{isPriority ? 'PREFERENCIAL MARCADO' : 'Marcar Preferencial'}</span>
                </button>
              </div>
            </div>

            {/* Frases Rápidas pré-cadastradas para 1 clique */}
            {phrases.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Atalhos Rápidos (Clique para fixar a frase):
                </p>
                <div className="flex flex-wrap gap-2">
                  {phrases.map((ph) => {
                    const isPicked = ph.phrase === callText;
                    return (
                      <button
                        key={ph.id}
                        type="button"
                        onClick={() => handleSelectPredefined(ph)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                          isPicked
                            ? 'bg-blue-600 text-white font-bold shadow-sm ring-1 ring-blue-400'
                            : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {ph.phrase}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tempo de Duração na Tela */}
            <div className="flex items-center justify-between border-t border-slate-700 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium">Tempo de exibição da chamada:</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                {[5, 10, 15, 20].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDuration(sec)}
                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition cursor-pointer ${
                      duration === sec
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. BOTÕES DE AÇÃO: NORMAL E PREFERENCIAL */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botão Chamar Normal / Atual */}
              <button
                id="btn-trigger-call"
                type="button"
                disabled={isCalling || !callText.trim() || !selectedPlayerId}
                onClick={() => handleTriggerCall()}
                className={`flex items-center justify-center gap-2.5 rounded-xl py-4 px-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPriority
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40 focus:ring-2 focus:ring-amber-500/50'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 focus:ring-2 focus:ring-blue-500/50'
                }`}
              >
                {isCalling ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{isPriority ? '[ CHAMAR PREFERENCIAL ]' : '[ CHAMAR NORMAL ]'}</span>
                  </>
                )}
              </button>

              {/* Botão Chamar Preferencial Direto */}
              <button
                id="btn-trigger-call-priority"
                type="button"
                disabled={isCalling || !callText.trim() || !selectedPlayerId}
                onClick={() => handleTriggerCall(true)}
                className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 py-4 px-4 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-950/50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalling ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <Star className="h-4 w-4 fill-slate-950" />
                    <span>[ CHAMAR PREFERENCIAL ]</span>
                  </>
                )}
              </button>
            </div>

            {lastCallDelivered !== null && (
              <p className="mt-2 text-center text-xs font-medium text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Chamada transmitida em tempo real para o player selecionado. A frase permanece fixa.</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* VIEW: FRASES DE CHAMADA */}
      {activeTab === 'phrases' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Banco de Frases</h3>
              <p className="text-xs text-slate-400 mt-0.5">Cadastre frases frequentes para agilizar os atendimentos</p>
            </div>
            <button
              id="btn-nova-frase"
              onClick={() => {
                setEditingPhrase(null);
                setPhraseInput('');
                setPhraseModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Frase</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800 uppercase font-bold text-slate-400 text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Frase de Chamada</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {phrases.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-8 text-center text-slate-400">
                      Nenhuma frase cadastrada. Clique em "Nova Frase".
                    </td>
                  </tr>
                ) : (
                  phrases.map((ph) => (
                    <tr key={ph.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-5 py-4 font-bold text-white text-sm">{ph.phrase}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setCallText(ph.phrase);
                              setActiveTab('call');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-800/80 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-900/60 cursor-pointer"
                          >
                            Usar na Chamada
                          </button>
                          <button
                            onClick={() => {
                              setEditingPhrase(ph);
                              setPhraseInput(ph.phrase);
                              setPhraseModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePhrase(ph)}
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

      {/* MODAL CADASTRAR/EDITAR FRASE */}
      {phraseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-slate-700 pb-3 mb-4">
              {editingPhrase ? 'Editar Frase' : 'Nova Frase de Chamada'}
            </h3>
            <form onSubmit={handleSavePhrase} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Texto da Chamada *</label>
                <textarea
                  rows={3}
                  required
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  placeholder="Ex: Favor comparecer ao consultório 02"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setPhraseModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-500 shadow-sm cursor-pointer"
                >
                  Salvar Frase
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
