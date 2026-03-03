export interface StakkdRoom {
  id: string;
  user_id: string;
  name: string;
  width_ft: number;
  length_ft: number;
  height_ft: number;
  shape: 'rectangular' | 'l_shaped' | 'open_concept';
  floor_type: 'hardwood' | 'carpet' | 'tile' | 'concrete' | 'mixed';
  listening_position: 'centered' | 'desk' | 'couch' | 'near_wall';
  notes: string | null;
  created_at: string;
  updated_at: string;
  features?: StakkdRoomFeature[];
  feature_count?: number;
}

export interface StakkdRoomFeature {
  id: string;
  room_id: string;
  feature_type: 'door' | 'window' | 'closet' | 'fireplace' | 'stairs' | 'opening';
  wall: 'north' | 'south' | 'east' | 'west';
  position_pct: number;
  width_ft: number;
  notes: string | null;
}

export type CreateRoomPayload = Pick<StakkdRoom, 'name' | 'width_ft' | 'length_ft'> &
  Partial<Pick<StakkdRoom, 'height_ft' | 'shape' | 'floor_type' | 'listening_position' | 'notes'>>;

export type CreateRoomFeaturePayload = Pick<StakkdRoomFeature, 'room_id' | 'feature_type' | 'wall' | 'position_pct'> &
  Partial<Pick<StakkdRoomFeature, 'width_ft' | 'notes'>>;

// ── Placement Engine Types ──────────────────────────────────────────

export interface GearPlacement {
  gear_id: string;
  gear_name: string;
  x_pct: number;
  y_pct: number;
  facing: 'north' | 'south' | 'east' | 'west';
  notes: string;
}

export interface ListeningPosition {
  x_pct: number;
  y_pct: number;
  notes: string;
}

export interface StereoTriangle {
  left_speaker_id: string;
  right_speaker_id: string;
  angle_degrees: number;
  notes: string;
}

export interface PlacementResponse {
  placements: GearPlacement[];
  listening_position: ListeningPosition;
  stereo_triangle: StereoTriangle | null;
  tips: string[];
}

// ── Saved Layout Types ──────────────────────────────────────────────

export interface StakkdRoomLayout {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  placements: GearPlacement[];
  listening_position: ListeningPosition;
  stereo_triangle: StereoTriangle | null;
  tips: string[];
  created_at: string;
  updated_at: string;
}

export interface LayoutSummary {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}
