import type { Perfil, Servei } from "./config";

export interface SimDish {
  id: number;
  slug: string;
  section: "casa" | "fes" | "acompanyar" | "postres" | "begudes";
  price_cents: number;
  season: string;
  tags: string[];
  available: boolean;
  supplement: { name: string; price_cents: number } | null;
}

export interface SimCustomer {
  id: string;
  created_at: Date;
  profile: Perfil;
  weekly_rate: number;
  days: number[];
  service: Servei;
  favourite_dish_ids: number[];
  scan_prob: number;
  churns_at: string | null;
}

export interface SimCampaign {
  id: string;
  sent_at: Date;
  double_days: number[] | null;
  double_from: string | null;
  double_to: string | null;
  starts_on: string | null;
  ends_on: string | null;
  /** Destinataris que SÍ reben l'avís (sense el grup de control). */
  recipients: Set<string>;
}

/** Tot el que una franja necessita saber. La franja només depèn d'això i de la seva llavor. */
export interface SimContext {
  dishes: SimDish[];
  customers: SimCustomer[];
  holidays: Set<string>;
  /** Pluja (mm) per dia local. */
  rain: Map<string, number>;
  campaigns: SimCampaign[];
}

export interface PlannedItem {
  dish_id: number;
  qty: number;
  unit_price_cents: number;
}

export interface PlannedOrder {
  id: string;
  customer_id: string | null;
  channel: "web" | "local" | "plataforma";
  created_at: string;
  pickup_at: string;
  dinar: boolean;
  total_cents: number;
  status: "confirmada" | "cancel·lada";
  cancelled_at: string | null;
  qr_code: string | null;
  scan: boolean;
  items: PlannedItem[];
}

export interface SlotPlan {
  slot_start: string;
  service: "migdia" | "vespre";
  first_of_service: boolean;
  orders: PlannedOrder[];
}
