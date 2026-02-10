import { convertArrayOfArraysToCSV } from "@/core/lib/utils";
import type { PitScoutingEntryBase } from "@/core/types/pit-scouting";

export type JsonDataType =
  | "scouting"
  | "scoutProfiles"
  | "pitScouting"
  | "pitScoutingImagesOnly";

type FlatRecord = Record<string, unknown>;

const OBJECT_OBJECT_STRINGS = new Set(["[object Object]", "[object object]"]);

export function downloadCsv(csv: string, filename: string): void {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function toCell(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    if (OBJECT_OBJECT_STRINGS.has(value)) return 0;
    return value;
  }
  if (Array.isArray(value)) return 0;
  if (typeof value === "object") return 0;
  return String(value);
}

function flattenJson(value: unknown, prefix: string, out: FlatRecord): void {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      flattenJson(nested, nextKey, out);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (prefix) out[prefix] = 0;
    return;
  }

  if (prefix) out[prefix] = value;
}

function normalizeScoutingEntry(entry: FlatRecord): FlatRecord {
  const normalized: FlatRecord = {};

  for (const [key, value] of Object.entries(entry)) {
    if (key === "gameData") continue;
    normalized[key] = value;
  }

  const eventKey = normalized.eventKey;
  const matchKey = normalized.matchKey;
  if (typeof eventKey === "string" && typeof matchKey === "string") {
    if (!matchKey.includes("_") && !matchKey.startsWith(eventKey)) {
      normalized.matchKey = `${eventKey}_${matchKey}`;
    }
  }

  const gameData = entry.gameData;
  if (gameData && typeof gameData === "object" && !Array.isArray(gameData)) {
    for (const section of ["auto", "teleop", "endgame"] as const) {
      const sectionValue = (gameData as Record<string, unknown>)[section];
      if (sectionValue && typeof sectionValue === "object" && !Array.isArray(sectionValue)) {
        normalized[section] = sectionValue;
      }
    }
  }

  const flattened: FlatRecord = {};
  flattenJson(normalized, "", flattened);
  return flattened;
}

function extractEntries(root: unknown): FlatRecord[] {
  if (Array.isArray(root)) return root.filter((e): e is FlatRecord => !!e && typeof e === "object");

  if (root && typeof root === "object") {
    const entries = (root as Record<string, unknown>).entries;
    if (Array.isArray(entries)) return entries.filter((e): e is FlatRecord => !!e && typeof e === "object");
    return [root as FlatRecord];
  }

  return [];
}

export function scoutingEntriesToCsv(entries: FlatRecord[]): string {
  const rows = entries.map(normalizeScoutingEntry);

  const baseOrder = [
    "id",
    "scoutName",
    "teamNumber",
    "matchNumber",
    "eventKey",
    "matchKey",
    "allianceColor",
    "timestamp",
    "comments",
  ];

  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(key);
  }

  const rest = Array.from(keys).filter((k) => !baseOrder.includes(k)).sort();
  const header = [...baseOrder.filter((k) => keys.has(k)), ...rest];

  const dataArrays = rows.map((row) => header.map((k) => toCell(row[k])));
  return convertArrayOfArraysToCSV([header, ...dataArrays]);
}

type ScoutProfile = {
  name: string;
  stakes: number;
  stakesFromPredictions: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: number;
  lastUpdated: number;
};

export function scoutProfilesJsonToCsv(root: unknown): string {
  if (!root || typeof root !== "object") return "";
  const scouts = (root as Record<string, unknown>).scouts;
  if (!Array.isArray(scouts)) return "";

  const scoutHeaders = [
    "Name",
    "Stakes",
    "Stakes From Predictions",
    "Total Predictions",
    "Correct Predictions",
    "Accuracy %",
    "Current Streak",
    "Longest Streak",
    "Created At",
    "Last Updated",
  ];

  const rows = scouts
    .filter((s): s is ScoutProfile => {
      if (!s || typeof s !== "object") return false;
      return typeof (s as { name?: unknown }).name === "string";
    })
    .map((scout) => [
      scout.name,
      scout.stakes,
      scout.stakesFromPredictions,
      scout.totalPredictions,
      scout.correctPredictions,
      scout.totalPredictions > 0
        ? Math.round((scout.correctPredictions / scout.totalPredictions) * 100)
        : 0,
      scout.currentStreak,
      scout.longestStreak,
      new Date(scout.createdAt).toLocaleDateString(),
      new Date(scout.lastUpdated).toLocaleDateString(),
    ]);

  return convertArrayOfArraysToCSV([scoutHeaders, ...(rows as (string | number)[][])]);
}

export function pitScoutingJsonToCsv(root: unknown): string {
  const entries = extractEntries(root) as unknown as PitScoutingEntryBase[];
  if (!entries.length) return "";

  const gameDataKeys = new Set<string>();
  const flattenObject = (obj: Record<string, unknown>, prefix = ""): void => {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        flattenObject(value as Record<string, unknown>, fullKey);
      } else {
        gameDataKeys.add(fullKey);
      }
    }
  };

  for (const entry of entries) {
    if (entry.gameData && typeof entry.gameData === "object") {
      flattenObject(entry.gameData as Record<string, unknown>);
    }
  }

  const sortedGameDataKeys = Array.from(gameDataKeys).sort();
  const headers = [
    "ID",
    "Team Number",
    "Event Key",
    "Scout",
    "Timestamp",
    "Weight (lbs)",
    "Drivetrain",
    "Programming Language",
    "Robot Photo",
    "Notes",
    ...sortedGameDataKeys,
  ];

  const getNestedValue = (obj: Record<string, unknown>, path: string): unknown =>
    path.split(".").reduce((current, key) => {
      if (current && typeof current === "object") return (current as Record<string, unknown>)[key];
      return undefined;
    }, obj as unknown);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const rows = entries.map((entry) => {
    const universalFields = [
      entry.id,
      String(entry.teamNumber),
      entry.eventKey,
      entry.scoutName,
      new Date(entry.timestamp).toISOString(),
      entry.weight ? String(entry.weight) : "",
      entry.drivetrain || "",
      entry.programmingLanguage || "",
      entry.robotPhoto ? "Has Image" : "No Image",
      entry.notes || "",
    ];

    const gameDataValues = sortedGameDataKeys.map((key) => {
      if (!entry.gameData) return "";
      const value = getNestedValue(entry.gameData as Record<string, unknown>, key);
      return formatValue(value);
    });

    return [...universalFields, ...gameDataValues];
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function jsonToCsv(dataType: JsonDataType, root: unknown): string {
  switch (dataType) {
    case "scouting":
      return scoutingEntriesToCsv(extractEntries(root));
    case "scoutProfiles":
      return scoutProfilesJsonToCsv(root);
    case "pitScouting":
      return pitScoutingJsonToCsv(root);
    case "pitScoutingImagesOnly":
      return "";
  }
}
