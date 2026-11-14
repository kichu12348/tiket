export interface ScanResultItem {
  id: string;
  ticketId?: string;
  code: string;
  status: "success" | "error";
  message: string;
  attendeeName?: string;
  attendeeEmail?: string;
  ticketTier?: string;
  todayCheckInCount?: number;
  totalCheckIns?: number;
  checkInDate?: string;
  timestamp: string;
  undone?: boolean;
}

export interface DetectedBarcode {
  rawValue: string;
  format: string;
}

export interface BarcodeDetectorInstance {
  detect(
    source: HTMLVideoElement | HTMLCanvasElement | ImageBitmapSource,
  ): Promise<DetectedBarcode[]>;
}

export interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

export interface DoorScannerProps {
  eventId?: string;
  onScanChange?: () => void;
  // Fallbacks for test suites or backwards compatibility
  disabled?: boolean;
  scan?: (value: string) => Promise<boolean | unknown>;
  undoCheckIn?: (ticketId: string) => Promise<boolean>;
}
