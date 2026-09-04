import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  role: 'admin' | 'company' | 'operator' | 'player';
  company_id: string | null;
  active: boolean;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  legal_name: string;
  trade_name: string;
  cnpj: string;
  email: string;
  phone: string;
  responsible: string;
  address: string;
  city: string;
  state: string;
  plan_id: string;
  start_date: string;
  due_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  max_players: number;
  max_operators: number;
  max_storage: number;
  monthly_price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  code: string;
  location: string;
  description: string;
  orientation: 'horizontal' | 'vertical'; // 'horizontal' (16:9 - 1920x1080) | 'vertical' (9:16 - 1080x1920)
  playlist_id: string | null;
  status: 'active' | 'inactive';
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Operator {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
  duration: number; // in seconds
  created_at: string;
}

export interface Playlist {
  id: string;
  company_id: string;
  name: string;
  description: string;
  weather_city?: string;
  active: boolean;
  items: PlaylistItem[];
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: string;
  company_id: string;
  name: string;
  type: 'image' | 'video' | 'rss';
  file_url: string;
  duration: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RssFeed {
  id: string;
  company_id: string;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallPhrase {
  id: string;
  company_id: string;
  operator_id: string | null;
  phrase: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerCall {
  id: string;
  company_id: string;
  player_id: string;
  operator_id: string;
  phrase_id: string | null;
  phrase: string;
  duration: number;
  is_priority?: boolean;
  created_at: string;
}

export interface DatabaseSchema {
  users: User[];
  companies: Company[];
  plans: Plan[];
  players: Player[];
  operators: Operator[];
  playlists: Playlist[];
  media: Media[];
  rss_feeds: RssFeed[];
  call_phrases: CallPhrase[];
  player_calls: PlayerCall[];
}

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
}

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'indoor_media.json');

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        this.data = JSON.parse(raw);
        // Normalize player orientation
        let changed = false;
        if (this.data.players) {
          for (const p of this.data.players) {
            if (!p.orientation) {
              p.orientation = p.code?.includes('SALA') ? 'vertical' : 'horizontal';
              changed = true;
            }
          }
        }
        if (changed) {
          this.save();
        }
      } catch {
        this.data = this.createInitialData();
        this.save();
      }
    } else {
      this.data = this.createInitialData();
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db file:', err);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public persist() {
    this.save();
  }

  private createInitialData(): DatabaseSchema {
    const now = new Date().toISOString();
    const adminPass = hashPassword(process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456');
    const demoPass = hashPassword('123456');

    const adminUser: User = {
      id: 'usr-admin-1',
      name: 'Administrador Geral',
      email: 'ale11062@gmail.com',
      password_hash: adminPass.hash,
      salt: adminPass.salt,
      role: 'admin',
      company_id: null,
      active: true,
      must_change_password: true,
      created_at: now,
      updated_at: now,
    };

    const plans: Plan[] = [
      {
        id: 'plan-basic',
        name: 'Plano Básico',
        description: 'Ideal para clínicas e pequenos estabelecimentos.',
        max_players: 2,
        max_operators: 2,
        max_storage: 50,
        monthly_price: 149.0,
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'plan-pro',
        name: 'Plano Profissional',
        description: 'Para médias empresas com múltiplos pontos de exibição.',
        max_players: 10,
        max_operators: 5,
        max_storage: 250,
        monthly_price: 349.0,
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'plan-enterprise',
        name: 'Plano Empresarial',
        description: 'Escala total com capacidade para redes e franquias.',
        max_players: 50,
        max_operators: 20,
        max_storage: 1000,
        monthly_price: 799.0,
        active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    const companyId = 'comp-demo-1';
    const companyUser: User = {
      id: 'usr-comp-1',
      name: 'Gerente Drogaria São Paulo',
      email: 'empresa@drogariasp.com.br',
      password_hash: demoPass.hash,
      salt: demoPass.salt,
      role: 'company',
      company_id: companyId,
      active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    };

    const company: Company = {
      id: companyId,
      legal_name: 'Drogaria São Paulo S/A',
      trade_name: 'Drogaria São Paulo - Matriz',
      cnpj: '61.412.110/0001-55',
      email: 'contato@drogariasp.com.br',
      phone: '(11) 3345-8000',
      responsible: 'Roberto Ferreira',
      address: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
      plan_id: 'plan-pro',
      start_date: '2026-01-01',
      due_date: '2027-01-01',
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    const operatorUser: User = {
      id: 'usr-op-1',
      name: 'Carlos Atendimento',
      email: 'operador@drogariasp.com.br',
      password_hash: demoPass.hash,
      salt: demoPass.salt,
      role: 'operator',
      company_id: companyId,
      active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    };

    const operator: Operator = {
      id: 'op-1',
      company_id: companyId,
      user_id: operatorUser.id,
      name: 'Carlos Atendimento',
      email: 'operador@drogariasp.com.br',
      phone: '(11) 98765-4321',
      active: true,
      created_at: now,
      updated_at: now,
    };

    const playerUser1: User = {
      id: 'usr-play-1',
      name: 'Player Recepção',
      email: 'player1@drogariasp.com.br',
      password_hash: demoPass.hash,
      salt: demoPass.salt,
      role: 'player',
      company_id: companyId,
      active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    };

    const playerUser2: User = {
      id: 'usr-play-2',
      name: 'Player Caixa 02',
      email: 'player2@drogariasp.com.br',
      password_hash: demoPass.hash,
      salt: demoPass.salt,
      role: 'player',
      company_id: companyId,
      active: true,
      must_change_password: false,
      created_at: now,
      updated_at: now,
    };

    const mediaList: Media[] = [
      {
        id: 'med-1',
        company_id: companyId,
        name: 'Ofertas da Semana - Até 40% OFF',
        type: 'image',
        file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%231e3a8a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg)"/><circle cx="1600" cy="250" r="380" fill="%232563eb" opacity="0.15"/><circle cx="200" cy="900" r="300" fill="%2338bdf8" opacity="0.1"/><rect x="120" y="100" width="220" height="48" rx="8" fill="%232563eb"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">DROGARIA SÃO PAULO</text><text x="120" y="320" fill="%2338bdf8" font-size="38" font-family="system-ui, sans-serif" font-weight="bold" letter-spacing="4">SEMANA DA SAÚDE E BEM-ESTAR</text><text x="120" y="440" fill="%23ffffff" font-size="82" font-family="system-ui, sans-serif" font-weight="900">ATÉ 40% DE DESCONTO</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">Em medicamentos selecionados, dermocosméticos e vitaminas.</text><rect x="120" y="640" width="560" height="180" rx="16" fill="%231e293b" stroke="%23334155" stroke-width="2"/><text x="160" y="710" fill="%2338bdf8" font-size="26" font-family="system-ui, sans-serif" font-weight="bold">CONSULTE NOSSO FARMACÊUTICO</text><text x="160" y="760" fill="%23cbd5e1" font-size="22" font-family="system-ui, sans-serif">Aferição de pressão e testes rápidos disponíveis no guichê 2.</text></svg>',
        duration: 8,
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'med-2',
        company_id: companyId,
        name: 'Horário de Atendimento e Delivery',
        type: 'image',
        file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23091e3a"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg2)"/><rect x="120" y="100" width="220" height="48" rx="8" fill="%2310b981"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">ATENDIMENTO 24 HORAS</text><text x="120" y="320" fill="%2334d399" font-size="38" font-family="system-ui, sans-serif" font-weight="bold">COMODIDADE PARA VOCÊ</text><text x="120" y="440" fill="%23ffffff" font-size="78" font-family="system-ui, sans-serif" font-weight="900">RECEBA SEUS MEDICAMENTOS EM CASA</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">Peça pelo WhatsApp oficial ou aplicativo com entrega expressa em até 45 minutos.</text><g transform="translate(120, 650)"><rect width="450" height="140" rx="12" fill="%231e293b"/><text x="40" y="60" fill="%2338bdf8" font-size="22" font-family="system-ui, sans-serif">WHATSAPP OFICIAL</text><text x="40" y="105" fill="%23ffffff" font-size="32" font-family="system-ui, sans-serif" font-weight="bold">(11) 98765-0000</text></g></svg>',
        duration: 8,
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'med-3',
        company_id: companyId,
        name: 'Dica de Saúde - Hidratação Diária',
        type: 'image',
        file_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080"><defs><linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23172554"/><stop offset="100%" stop-color="%231e293b"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23bg3)"/><rect x="120" y="100" width="180" height="48" rx="8" fill="%230284c7"/><text x="140" y="132" fill="%23ffffff" font-size="22" font-family="system-ui, sans-serif" font-weight="bold">DICA DE SAÚDE</text><text x="120" y="320" fill="%2338bdf8" font-size="36" font-family="system-ui, sans-serif" font-weight="bold">CUIDE DO SEU CORPO</text><text x="120" y="440" fill="%23ffffff" font-size="80" font-family="system-ui, sans-serif" font-weight="900">VOCÊ JÁ BEBEU ÁGUA HOJE?</text><text x="120" y="540" fill="%2394a3b8" font-size="34" font-family="system-ui, sans-serif">A hidratação regular melhora a disposição, circulação e o funcionamento renal.</text><rect x="120" y="650" width="700" height="140" rx="14" fill="%230f172a" stroke="%23334155" stroke-width="2"/><text x="160" y="715" fill="%2338bdf8" font-size="24" font-family="system-ui, sans-serif" font-weight="bold">RECOMENDAÇÃO MÉDICA</text><text x="160" y="755" fill="%23e2e8f0" font-size="20" font-family="system-ui, sans-serif">Consuma no mínimo 2 litros de água filtrada ao longo do dia.</text></svg>',
        duration: 8,
        active: true,
        created_at: now,
        updated_at: now,
      }
    ];

    const playlistId = 'pl-1';
    const playlist: Playlist = {
      id: playlistId,
      company_id: companyId,
      name: 'Programação Recepção Geral',
      description: 'Loop institucional com promoções e dicas de saúde.',
      weather_city: 'São Paulo',
      active: true,
      items: [
        {
          id: 'pli-1',
          playlist_id: playlistId,
          media_id: 'med-1',
          position: 1,
          duration: 8,
          created_at: now,
        },
        {
          id: 'pli-2',
          playlist_id: playlistId,
          media_id: 'med-2',
          position: 2,
          duration: 8,
          created_at: now,
        },
        {
          id: 'pli-3',
          playlist_id: playlistId,
          media_id: 'med-3',
          position: 3,
          duration: 8,
          created_at: now,
        }
      ],
      created_at: now,
      updated_at: now,
    };

    const players: Player[] = [
      {
        id: 'play-1',
        company_id: companyId,
        user_id: playerUser1.id,
        name: 'PLAYER RECEPÇÃO',
        code: 'PLAY-REC-01',
        location: 'Hall de Entrada Principal',
        description: 'Smart TV 55 polegadas na recepção principal.',
        orientation: 'horizontal',
        playlist_id: playlistId,
        status: 'active',
        last_seen: new Date().toISOString(), // Online
        created_at: now,
        updated_at: now,
      },
      {
        id: 'play-2',
        company_id: companyId,
        user_id: playerUser2.id,
        name: 'PLAYER SALA 02 (TOTEM)',
        code: 'PLAY-SALA-02',
        location: 'Sala de Espera 02',
        description: 'Totem digital vertical 9:16 na sala de espera.',
        orientation: 'vertical',
        playlist_id: playlistId,
        status: 'active',
        last_seen: new Date(Date.now() - 3600000).toISOString(), // Offline (1h ago)
        created_at: now,
        updated_at: now,
      }
    ];

    const callPhrases: CallPhrase[] = [
      {
        id: 'phr-1',
        company_id: companyId,
        operator_id: operator.id,
        phrase: 'Cliente, favor dirigir-se ao atendimento.',
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'phr-2',
        company_id: companyId,
        operator_id: operator.id,
        phrase: 'Senha 25, dirigir-se ao caixa 03.',
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'phr-3',
        company_id: companyId,
        operator_id: operator.id,
        phrase: 'Favor comparecer à recepção.',
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'phr-4',
        company_id: companyId,
        operator_id: operator.id,
        phrase: 'Próximo atendimento, guichê 01.',
        active: true,
        created_at: now,
        updated_at: now,
      }
    ];

    const rssFeeds: RssFeed[] = [
      {
        id: 'rss-1',
        company_id: companyId,
        name: 'G1 - Saúde e Bem-Estar',
        url: 'https://g1.globo.com/rss/g1/saude/',
        active: true,
        created_at: now,
        updated_at: now,
      }
    ];

    return {
      users: [adminUser, companyUser, operatorUser, playerUser1, playerUser2],
      companies: [company],
      plans,
      players,
      operators: [operator],
      playlists: [playlist],
      media: mediaList,
      rss_feeds: rssFeeds,
      call_phrases: callPhrases,
      player_calls: [],
    };
  }
}

export const db = new DatabaseStore();
