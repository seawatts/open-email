// ============================================================================
// JSON TYPES - Shared types for JSON columns
// ============================================================================

// Highlight data types for JSON storage
export type HighlightDataFlight = {
  airline: string;
  arrival: string;
  arrivalTime: string;
  departure: string;
  departureTime: string;
  flightNumber: string;
  type: 'flight';
};

export type HighlightDataHotel = {
  checkIn: string;
  checkOut: string;
  confirmationNumber?: string;
  hotelName: string;
  type: 'hotel';
};

export type HighlightDataPackageTracking = {
  carrier: string;
  estimatedDelivery?: string;
  status?: string;
  trackingNumber: string;
  type: 'package_tracking';
};

export type HighlightDataPayment = {
  amount: string;
  currency: string;
  dueDate?: string;
  payee?: string;
  type: 'payment';
};

export type HighlightDataEvent = {
  dateTime: string;
  eventName: string;
  location?: string;
  type: 'event';
};

export type HighlightDataReservation = {
  confirmationNumber?: string;
  dateTime: string;
  partySize?: number;
  type: 'reservation';
  venue: string;
};

export type HighlightDataActionItem = {
  assignedBy?: string;
  deadline?: string;
  task: string;
  type: 'action_item';
};

export type HighlightDataJson =
  | HighlightDataFlight
  | HighlightDataHotel
  | HighlightDataPackageTracking
  | HighlightDataPayment
  | HighlightDataEvent
  | HighlightDataReservation
  | HighlightDataActionItem;

// Keyword metadata types
export type KeywordMetadataTemporal = {
  resolvedDate?: string; // ISO date string
  isRelative: boolean; // "next week" vs "Dec 20"
  originalText: string;
};

export type KeywordMetadataFinancial = {
  amount: number;
  currency: string;
  originalText: string;
};

export type KeywordMetadataLocation = {
  city?: string;
  country?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
};

export type KeywordMetadataAttachment = {
  filename: string;
  mimeType: string;
  extractedText?: string; // OCR text from image/PDF
};

export type KeywordMetadataJson =
  | KeywordMetadataTemporal
  | KeywordMetadataFinancial
  | KeywordMetadataLocation
  | KeywordMetadataAttachment
  | Record<string, unknown>;

// Draft Reply type for JSON storage
export type DraftReplyJson = {
  id: string;
  subject: string;
  body: string;
  tone: string;
};

// Smart Action type for JSON storage
export type SmartActionJson = {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: string;
  url?: string;
  payload?: Record<string, unknown>;
  confirmRequired?: boolean;
  estimatedTime?: string;
};

// Rule Conditions type for JSON storage
export type RuleConditionsJson = {
  senderEmails?: string[];
  senderDomains?: string[];
  subjectContains?: string[];
  labelIds?: string[];
};

// Rule Actions type for JSON storage
export type RuleActionsJson = {
  labelId?: string;
  archive?: boolean;
  requireApproval?: boolean;
  toneProfile?: {
    style: 'short' | 'direct' | 'friendly' | 'formal' | 'casual';
    maxLength?: number;
    customInstructions?: string;
  };
};

// Tone Profile type for JSON storage
export type ToneProfileJson = {
  style: 'short' | 'direct' | 'friendly' | 'formal' | 'casual';
  maxLength?: number;
  customInstructions?: string;
};

// Vocabulary profile for detailed style analysis
export type VocabularyProfileJson = {
  technicalLevel: number; // 0 = simple, 1 = highly technical
  emojiUsage: number; // 0 = never, 1 = frequent
  contractionUsage: number; // 0 = never, 1 = always
};
