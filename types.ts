export enum ObjectType {
  MOTORCYCLE = 'motorcycle',
  RIDER = 'rider',
  HELMET = 'helmet',
  NO_HELMET = 'no_helmet',
  LICENSE_PLATE = 'license_plate'
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  label: ObjectType;
  confidence: number;
  text_content?: string; // For License Plate OCR
}

export interface DetectionResult {
  boxes: BoundingBox[];
  timestamp: number;
  processingTimeMs: number;
}

export interface ViolationRecord {
  id: string;
  timestamp: Date;
  imageUrl: string; // Base64 snapshot
  cameraLocation: string;
  confidence: number;
  type: 'NO_HELMET';
  vehicleNumber?: string;
}

export interface SystemStats {
  totalMotorcycles: number;
  compliantRiders: number;
  violations: number;
  currentFPS: number;
  accuracy: number; // Simulated based on confidence
}