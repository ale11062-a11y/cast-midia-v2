export type Role = 'admin' | 'company' | 'operator' | 'player';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company_id: string | null;
  must_change_password?: boolean;
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
  plan_name?: string;
  start_date: string;
  due_date: string;
  status: 'active' | 'inactive';
  player_count?: number;
  operator_count?: number;
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

export type PlayerOrientation = 'horizontal' | 'vertical';

export interface Player {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  code: string;
  location: string;
  description: string;
  orientation?: PlayerOrientation; // 'horizontal' (16:9 - 1920x1080) | 'vertical' (9:16 - 1080x1920)
  playlist_id: string | null;
  playlist_name?: string;
  status: 'active' | 'inactive';
  is_online?: boolean;
  last_seen: string;
  email?: string;
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
  name?: string;
  type?: 'image' | 'video' | 'rss';
  file_url?: string;
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

export interface AdminStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  totalPlayers: number;
}

export interface CompanyStats {
  playersCount: number;
  activePlayersCount: number;
  onlinePlayersCount: number;
  operatorsCount: number;
  playlistsCount: number;
  mediaCount: number;
  plan: Plan | null;
  limits: {
    max_players: number;
    max_operators: number;
    max_storage: number;
  };
}
