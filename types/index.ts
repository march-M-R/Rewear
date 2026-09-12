export type GarmentCategory =
	| "top"
	| "bottom"
	| "dress"
	| "outerwear"
	| "shoes"
	| "bag"
	| "accessory";

export type GarmentSeason =
	| "spring"
	| "summer"
	| "fall"
	| "winter"
	| "all-season";

export type GarmentFormality =
	| "casual"
	| "smart-casual"
	| "professional"
	| "dressy"
	| "formal";

export type GarmentStatus =
	| "active"
	| "clutter"
	| "revamp"
	| "sell"
	| "donate"
	| "sold"
	| "donated";

export interface Garment {
	id: string;
	name: string;
	category: GarmentCategory;
	color: string;
	secondaryColors: string[];
	style: string[];
	material: string;
	pattern: string;
	season: GarmentSeason[];
	formality: GarmentFormality;
	occasions: string[];
	weather: {
		minTempF: number;
		maxTempF: number;
		rainFriendly: boolean;
	};
	image: string;
	timesShown: number;
	timesAccepted: number;
	timesRejected: number;
	timesLocked: number;
	timesWorn: number;
	/** ISO 8601 date or timestamp; null until the garment is worn. */
	lastWorn: string | null;
	status: GarmentStatus;
}

export interface CalendarEvent {
	id: string;
	title: string;
	/** Calendar date in YYYY-MM-DD format. */
	date: string;
	time: string;
	context: string;
	dressCode: string;
}


export type ResponseSource = "gemini" | "openai" | "fallback";
export interface Provenance { source: ResponseSource; notice?: string }
export interface Outfit extends Partial<Provenance> {
  generatorVersion?: number;
  id: string;
  eventId: string;
  garmentIds: string[];
  lockedIds: string[];
  decision: "pending" | "love" | "nope" | "superseded";
  reasoning?: string;
  wornAt?: string;
  shown?: boolean;
}
export type InteractionAction = "shown" | "accept" | "reject" | "lock" | "unlock" | "swap" | "remix" | "wear" | "revamp" | "sell" | "donate" | "buy" | "skip" | "keep";
export interface Interaction {
  id: string;
  /** Legacy fields are retained for existing saved history. */
  type: string;
  garmentIds: string[];
  date: string;
  action?: InteractionAction;
  timestamp?: string;
  outfitId?: string;
  garmentId?: string;
  lockedGarmentIds?: string[];
  detail?: string;
}
export interface CandidateItem {
  category: GarmentCategory;
  color: string;
  secondaryColors: string[];
  style: string[];
  material: string;
  pattern: string;
  formality: GarmentFormality;
  silhouette: string;
}
export interface OutfitResponse extends Provenance { garmentIds: string[]; reasoning: string }
export interface RevampIdea {
  title: string; description: string; difficulty: "Easy" | "Medium";
  timeMinutes: number; materials: string[]; steps: string[];
}
export interface RevampResponse extends Provenance { ideas: RevampIdea[] }
export interface ListingResponse extends Provenance {
  title: string; description: string; category: string; condition: string;
  suggestedPriceRange: string; keywords: string[];
}
export interface ShopAnalysis extends Provenance {
  item: CandidateItem;
  styleMatch: number; compatibility: number; redundancy: number;
  wardrobeNeed: number; wardrobeImpact: number; upcomingUtility: number;
  verdict: "buy" | "skip";
  similarGarmentIds: string[];
  compatibleGarmentIds: string[];
  reasoning: string;
  reasons: string[];
  semanticReasoning?: string;
  outfits: { garmentIds: string[]; reasoning: string }[];
}
export interface ShoppingResult {
  id: string; category: GarmentCategory; verdict: "BUY" | "SKIP"; match: number; date: string;
  analysis?: ShopAnalysis;
}
