import * as Papa from 'papaparse';
import { supabase } from '../services/supabaseService';
import { triggerDownload } from './exportHelpers';
import type { Album } from '../types';
import type { ShelfConfig, ShelfSortPreference, SortScheme } from '../types/shelf';

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }
}

// ── Shelf Config ────────────────────────────────────────────────────

export async function getShelfConfigs(userId: string): Promise<ShelfConfig[]> {
  assertClient();

  const { data, error } = await supabase!
    .from('shelf_config')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shelf configs:', error);
    throw error;
  }

  return data ?? [];
}

export async function upsertShelfConfig(
  config: Partial<ShelfConfig> & { user_id: string },
): Promise<ShelfConfig> {
  assertClient();

  const { data, error } = await supabase!
    .from('shelf_config')
    .upsert(config, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting shelf config:', error);
    throw error;
  }

  return data;
}

export async function deleteShelfConfig(configId: string): Promise<void> {
  assertClient();

  // Clear shelf assignments for albums on this shelf before deleting
  await supabase!
    .from('albums')
    .update({ shelf_unit: null, shelf_manual_override: false })
    .eq('shelf_config_id', configId);

  const { error } = await supabase!
    .from('shelf_config')
    .delete()
    .eq('id', configId);

  if (error) {
    console.error('Error deleting shelf config:', error);
    throw error;
  }
}

// ── Sort Preference ─────────────────────────────────────────────────

export async function getSortPreference(userId: string): Promise<ShelfSortPreference | null> {
  assertClient();

  const { data, error } = await supabase!
    .from('shelf_sort_preference')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching sort preference:', error);
    throw error;
  }

  return data;
}

export async function upsertSortPreference(
  userId: string,
  sort_scheme: SortScheme,
): Promise<ShelfSortPreference> {
  assertClient();

  const { data, error } = await supabase!
    .from('shelf_sort_preference')
    .upsert(
      { user_id: userId, sort_scheme, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting sort preference:', error);
    throw error;
  }

  return data;
}

// ── Album Placement Calculation ─────────────────────────────────────

export interface PlacementResult {
  unit: number;
  position: number;
  shelfName: string;
}

/** Pure calculation: where does this album land given a sorted collection? */
export function calculateAlbumPlacement(
  album: Album,
  allAlbums: Album[],
  config: ShelfConfig,
  scheme: SortScheme,
): PlacementResult {
  const sorted = sortCollectionForShelf(allAlbums, scheme);
  const idx = sorted.findIndex(a => a.id === album.id);
  if (idx === -1) {
    // Album not in array — append and recalculate
    const withAlbum = sortCollectionForShelf([...allAlbums, album], scheme);
    const pos = withAlbum.findIndex(a => a.id === album.id);
    const unitIdx = Math.min(
      Math.floor(pos / config.capacity_per_unit),
      config.unit_count - 1,
    );
    return { unit: unitIdx + 1, position: (pos % config.capacity_per_unit) + 1, shelfName: config.name };
  }
  const unitIdx = Math.min(
    Math.floor(idx / config.capacity_per_unit),
    config.unit_count - 1,
  );
  return { unit: unitIdx + 1, position: (idx % config.capacity_per_unit) + 1, shelfName: config.name };
}

/**
 * Async convenience: fetches user's first shelf config + sort pref,
 * then calculates placement. Returns null if no shelf is configured.
 */
export async function getAlbumPlacementInfo(
  album: Album,
  allAlbums: Album[],
  userId: string,
): Promise<PlacementResult | null> {
  try {
    const [configs, pref] = await Promise.all([
      getShelfConfigs(userId),
      getSortPreference(userId),
    ]);
    if (configs.length === 0) return null;
    const scheme: SortScheme = pref?.sort_scheme ?? 'artist_alpha';
    return calculateAlbumPlacement(album, allAlbums, configs[0], scheme);
  } catch {
    return null;
  }
}

// ── Sorting Logic ───────────────────────────────────────────────────

function compareStr(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function sortCollectionForShelf(albums: Album[], scheme: SortScheme): Album[] {
  const sorted = [...albums];

  switch (scheme) {
    case 'artist_alpha':
      sorted.sort((a, b) => compareStr(a.artist, b.artist) || compareStr(a.title, b.title));
      break;

    case 'genre_artist':
      sorted.sort((a, b) => {
        const ga = a.genre || 'Unknown';
        const gb = b.genre || 'Unknown';
        return compareStr(ga, gb) || compareStr(a.artist, b.artist) || compareStr(a.title, b.title);
      });
      break;

    case 'year_asc':
      sorted.sort((a, b) => {
        const ya = a.year ? parseInt(a.year, 10) : Infinity;
        const yb = b.year ? parseInt(b.year, 10) : Infinity;
        return (ya - yb) || compareStr(a.artist, b.artist);
      });
      break;

    case 'year_desc':
      sorted.sort((a, b) => {
        const ya = a.year ? parseInt(a.year, 10) : -Infinity;
        const yb = b.year ? parseInt(b.year, 10) : -Infinity;
        return (yb - ya) || compareStr(a.artist, b.artist);
      });
      break;

    case 'date_added':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;

    case 'custom':
      // Custom keeps current order (no re-sort)
      break;
  }

  return sorted;
}

// ── Unit Assignment Logic ───────────────────────────────────────────

export interface ShelfAssignment {
  assignments: Map<string, number>;
  units: { unitNumber: number; albums: Album[] }[];
  overflow: boolean;
}

export function calculateShelfAssignments(
  sortedAlbums: Album[],
  config: ShelfConfig,
): ShelfAssignment {
  const { unit_count, capacity_per_unit } = config;
  const totalCapacity = unit_count * capacity_per_unit;
  const overflow = sortedAlbums.length > totalCapacity;

  const assignments = new Map<string, number>();
  const units: { unitNumber: number; albums: Album[] }[] = [];

  for (let u = 1; u <= unit_count; u++) {
    units.push({ unitNumber: u, albums: [] });
  }

  for (let i = 0; i < sortedAlbums.length; i++) {
    const album = sortedAlbums[i];
    // Determine which unit this album belongs to
    let unitIdx = Math.floor(i / capacity_per_unit);
    // Overflow: clamp to last unit
    if (unitIdx >= unit_count) unitIdx = unit_count - 1;

    assignments.set(album.id, unitIdx + 1); // 1-based
    units[unitIdx].albums.push(album);
  }

  return { assignments, units, overflow };
}

// ── Batch Save Assignments ──────────────────────────────────────────

export async function batchSaveAssignments(
  assignments: Map<string, number>,
  shelfConfigId: string,
): Promise<void> {
  assertClient();

  // Supabase JS doesn't support batch updates with different values,
  // so we issue them in parallel chunks to stay within reasonable limits.
  const entries = Array.from(assignments.entries());
  const CHUNK_SIZE = 50;

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(([albumId, unit]) =>
        supabase!
          .from('albums')
          .update({ shelf_unit: unit, shelf_config_id: shelfConfigId })
          .eq('id', albumId)
      ),
    );
  }
}

// ── Album Shelf Assignment ──────────────────────────────────────────

export async function assignAlbumToUnit(
  albumId: string,
  unit: number | null,
  manualOverride?: boolean,
  shelfConfigId?: string,
): Promise<void> {
  assertClient();

  const updateData: Record<string, unknown> = { shelf_unit: unit };
  if (manualOverride !== undefined) {
    updateData.shelf_manual_override = manualOverride;
  }
  if (shelfConfigId !== undefined) {
    updateData.shelf_config_id = shelfConfigId;
  }

  const { error } = await supabase!
    .from('albums')
    .update(updateData)
    .eq('id', albumId);

  if (error) {
    console.error('Error assigning album to shelf unit:', error);
    throw error;
  }
}

export async function unpinAlbum(albumId: string): Promise<void> {
  assertClient();

  const { error } = await supabase!
    .from('albums')
    .update({ shelf_manual_override: false })
    .eq('id', albumId);

  if (error) {
    console.error('Error unpinning album:', error);
    throw error;
  }
}

export async function batchClearPins(albumIds: string[]): Promise<void> {
  assertClient();

  const CHUNK_SIZE = 50;
  for (let i = 0; i < albumIds.length; i += CHUNK_SIZE) {
    const chunk = albumIds.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase!
      .from('albums')
      .update({ shelf_manual_override: false })
      .in('id', chunk);

    if (error) {
      console.error('Error clearing pins:', error);
      throw error;
    }
  }
}

// ── Rebalance Detection & Planning ──────────────────────────────────

export interface ShelfBalanceAnalysis {
  isBalanced: boolean;
  overflowUnits: number[];
  hotUnits: number[];
  coldUnits: number[];
  totalAlbums: number;
  totalCapacity: number;
  utilizationPercent: number;
}

export interface RebalanceMove {
  albumId: string;
  albumTitle: string;
  albumArtist: string;
  fromUnit: number;
  toUnit: number;
}

export interface RebalancePlan {
  moves: RebalanceMove[];
  newDistribution: number[];
}

/** Analyze how evenly albums are distributed across shelf units. */
export function analyzeShelfBalance(
  units: { unitNumber: number; albums: Album[] }[],
  config: ShelfConfig,
): ShelfBalanceAnalysis {
  const { capacity_per_unit, unit_count } = config;
  const totalCapacity = unit_count * capacity_per_unit;

  const overflowUnits: number[] = [];
  const hotUnits: number[] = [];
  const coldUnits: number[] = [];
  let totalAlbums = 0;

  for (const unit of units) {
    const count = unit.albums.length;
    totalAlbums += count;
    const pct = count / capacity_per_unit;

    if (pct > 1) {
      overflowUnits.push(unit.unitNumber);
    } else if (pct >= 0.8) {
      hotUnits.push(unit.unitNumber);
    } else if (pct < 0.5) {
      coldUnits.push(unit.unitNumber);
    }
  }

  const isBalanced = units.every(
    u => u.albums.length / capacity_per_unit <= 0.95,
  );

  return {
    isBalanced,
    overflowUnits,
    hotUnits,
    coldUnits,
    totalAlbums,
    totalCapacity,
    utilizationPercent: totalCapacity > 0
      ? Math.round((totalAlbums / totalCapacity) * 100)
      : 0,
  };
}

/**
 * Generate a plan to redistribute albums evenly across units.
 * Only produces moves when at least one unit exceeds 95% capacity.
 * Pinned albums (shelf_manual_override) stay in their current section.
 * Unpinned albums are redistributed in sort order around the pinned ones.
 */
export function generateRebalancePlan(
  units: { unitNumber: number; albums: Album[] }[],
  config: ShelfConfig,
  sortScheme: SortScheme,
): RebalancePlan | null {
  const analysis = analyzeShelfBalance(units, config);
  if (analysis.isBalanced) return null;

  const unitCount = config.unit_count;
  const totalAlbums = units.reduce((sum, u) => sum + u.albums.length, 0);

  // Separate pinned (locked in place) from unpinned (movable)
  const pinnedPerUnit: number[] = new Array(unitCount).fill(0);
  const unpinned: Album[] = [];
  const currentUnit = new Map<string, number>();

  for (const unit of units) {
    for (const album of unit.albums) {
      currentUnit.set(album.id, unit.unitNumber);
      if (album.shelf_manual_override) {
        pinnedPerUnit[unit.unitNumber - 1]++;
      } else {
        unpinned.push(album);
      }
    }
  }

  const sortedUnpinned = sortCollectionForShelf(unpinned, sortScheme);

  // Calculate ideal total per unit (pinned + movable combined)
  const base = Math.floor(totalAlbums / unitCount);
  const remainder = totalAlbums % unitCount;
  const idealPerUnit: number[] = [];
  for (let i = 0; i < unitCount; i++) {
    idealPerUnit.push(i < remainder ? base + 1 : base);
  }

  // Movable slots = ideal minus pinned (at least 0)
  const movableSlots = idealPerUnit.map((ideal, i) =>
    Math.max(0, ideal - pinnedPerUnit[i]),
  );

  // Adjust if total movable slots doesn't match unpinned count
  let slotSum = movableSlots.reduce((a, b) => a + b, 0);
  let diff = sortedUnpinned.length - slotSum;
  if (diff > 0) {
    // Need more slots — add to units with most remaining capacity
    for (let i = 0; i < unitCount && diff > 0; i++) {
      movableSlots[i]++;
      diff--;
    }
  } else if (diff < 0) {
    // Need fewer slots — trim from the end
    for (let i = unitCount - 1; i >= 0 && diff < 0; i--) {
      const reduce = Math.min(-diff, movableSlots[i]);
      movableSlots[i] -= reduce;
      diff += reduce;
    }
  }

  // newDistribution = pinned + movable per unit
  const newDistribution = movableSlots.map((slots, i) =>
    pinnedPerUnit[i] + slots,
  );

  // Fill units with sorted unpinned albums and detect moves
  const moves: RebalanceMove[] = [];
  let offset = 0;
  for (let u = 0; u < unitCount; u++) {
    const slots = movableSlots[u];
    const unitNumber = u + 1;
    for (let i = offset; i < offset + slots; i++) {
      const album = sortedUnpinned[i];
      const oldUnit = currentUnit.get(album.id);
      if (oldUnit !== undefined && oldUnit !== unitNumber) {
        moves.push({
          albumId: album.id,
          albumTitle: album.title,
          albumArtist: album.artist,
          fromUnit: oldUnit,
          toUnit: unitNumber,
        });
      }
    }
    offset += slots;
  }

  return { moves, newDistribution };
}

// ── Global Multi-Shelf Distribution ──────────────────────────────────

export interface GlobalDistribution {
  assignments: Map<string, { shelfConfigId: string; unit: number }>;
  unassigned: Album[];
  overflow: boolean;
}

/**
 * Distribute all albums across multiple shelves sequentially.
 * Fills shelf 1's sections first, then shelf 2's, etc.
 */
export function distributeAcrossAllShelves(
  albums: Album[],
  shelves: ShelfConfig[],
  scheme: SortScheme,
): GlobalDistribution {
  const sorted = sortCollectionForShelf(albums, scheme);
  const assignments = new Map<string, { shelfConfigId: string; unit: number }>();
  let albumIdx = 0;

  for (const shelf of shelves) {
    for (let u = 1; u <= shelf.unit_count; u++) {
      for (let slot = 0; slot < shelf.capacity_per_unit && albumIdx < sorted.length; slot++) {
        const album = sorted[albumIdx];
        assignments.set(album.id, { shelfConfigId: shelf.id, unit: u });
        albumIdx++;
      }
    }
  }

  const unassigned = sorted.slice(albumIdx);
  return {
    assignments,
    unassigned,
    overflow: unassigned.length > 0,
  };
}

/** Persist a global multi-shelf distribution (sets both shelf_config_id and shelf_unit). */
export async function batchSaveGlobalDistribution(
  assignments: Map<string, { shelfConfigId: string; unit: number }>,
): Promise<void> {
  assertClient();
  const entries = Array.from(assignments.entries());
  const CHUNK_SIZE = 50;

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(([albumId, { shelfConfigId, unit }]) =>
        supabase!
          .from('albums')
          .update({ shelf_unit: unit, shelf_config_id: shelfConfigId })
          .eq('id', albumId)
      ),
    );
  }
}

// ── Shelf Catalog CSV Export ─────────────────────────────────────────

export interface ShelfCatalogExportResult {
  success: boolean;
  albumCount: number;
  filename: string;
}

/**
 * Generate and download a CSV of the shelf catalog,
 * grouped by shelf name and section number.
 */
export function generateShelfCatalogCSV(
  albums: Album[],
  shelves: ShelfConfig[],
  scheme: SortScheme,
): ShelfCatalogExportResult {
  const rows: Record<string, string>[] = [];

  for (const shelf of shelves) {
    const shelfAlbums = albums.filter(a => a.shelf_config_id === shelf.id);
    const sorted = sortCollectionForShelf(shelfAlbums, scheme);

    for (const album of sorted) {
      rows.push({
        'Shelf': shelf.name,
        'Section': String(album.shelf_unit ?? ''),
        'Artist': album.artist,
        'Title': album.title,
        'Year': album.year ?? '',
        'Genre': album.genre ?? '',
        'Format': album.format ?? '',
        'Condition': album.condition ?? '',
      });
    }
  }

  // Append unassigned albums at the end
  const unassigned = albums.filter(a => !a.shelf_config_id);
  if (unassigned.length > 0) {
    const sorted = sortCollectionForShelf(unassigned, scheme);
    for (const album of sorted) {
      rows.push({
        'Shelf': '(Unassigned)',
        'Section': '',
        'Artist': album.artist,
        'Title': album.title,
        'Year': album.year ?? '',
        'Genre': album.genre ?? '',
        'Format': album.format ?? '',
        'Condition': album.condition ?? '',
      });
    }
  }

  const csv = Papa.unparse(rows);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `rekkrd-shelf-catalog-${today}.csv`;

  triggerDownload(csv, filename, 'text/csv;charset=utf-8;');

  return { success: true, albumCount: rows.length, filename };
}
