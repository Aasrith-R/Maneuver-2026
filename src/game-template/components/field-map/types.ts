/**
 * Shared types for field-map components
 * Used by both Auto and Teleop phases
 */

// =============================================================================
// ACTION TYPES
// =============================================================================

export type PathActionType =
    | 'start'      // Initial position from Auto Start
    | 'traversal'  // Moving between zones (trench/bump)
    | 'score'      // Scoring at hub (free-form position)
    | 'collect'    // Collecting from depot/outpost
    | 'ferry'      // Ferrying to Alliance zone
    | 'climb'      // Climb attempt
    | 'foul'       // Mid-line foul or other penalty
    | 'defense'    // Defense action (Teleop)
    | 'stuck'      // Robot stuck on obstacle (Teleop)
    | 'unstuck'    // Robot freed from obstacle (Teleop)
    | 'steal'      // Stealing fuel (Teleop)
    | 'beached'    // Robot beached/stuck in neutral zone
    | 'unbeached'  // Robot freed from beached state
    | 'broken-down'; // Robot broken down

export type ZoneType = 'allianceZone' | 'neutralZone' | 'opponentZone';

export type ClimbLevel = 1 | 2 | 3;
export type ClimbResult = 'success' | 'fail';
export type ClimbLocation = 'side' | 'middle';
export type ShotType = 'onTheMove' | 'stationary';
export type FerryType = 'onTheMove' | 'stationary';
export type DefenseEffectiveness = 'very' | 'somewhat' | 'not';

// =============================================================================
// WAYPOINT DATA
// =============================================================================

export interface PathWaypoint {
    id: string;
    type: PathActionType;
    action: string;
    position: { x: number; y: number }; // Normalized 0-1
    fuelDelta?: number;
    amountLabel?: string; // e.g., "1/2 hopper", "Full", "+3"
    timestamp: number;
    pathPoints?: { x: number; y: number }[]; // For free-form paths
    // Teleop-specific
    zone?: ZoneType;
    climbLevel?: ClimbLevel;
    climbResult?: ClimbResult;
    climbLocation?: ClimbLocation;
    shotType?: ShotType;
    ferryType?: FerryType;
    ferryStartZone?: ZoneType;
    ferryLandZone?: ZoneType;
    climbStartTimeSecRemaining?: number | null;
    climbDurationSec?: number; // How long the climb took in seconds
    duration?: number; // For stuck events (ms)
    obstacleType?: 'bump' | 'trench'; // For stuck events
    defendedTeamNumber?: number;
    defenseTargetSource?: 'schedule' | 'custom';
    defenseEffectiveness?: DefenseEffectiveness;
}

// =============================================================================
// FIELD ELEMENTS
// =============================================================================

export interface FieldElement {
    x: number;
    y: number;
    label: string;
    name: string;
    scaleWidth?: number;  // Multiplier for base size
    scaleHeight?: number; // Multiplier for base size
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface FieldMapContainerProps {
    children: React.ReactNode;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    isFieldRotated?: boolean;
    onToggleRotation?: () => void;
    className?: string;
}

export interface FieldCanvasProps {
    actions: PathWaypoint[];
    pendingWaypoint?: PathWaypoint | null;
    alliance: 'red' | 'blue';
    isFieldRotated?: boolean;
    width: number;
    height: number;
    /** If true, draw connecting lines between waypoints (for Auto). If false, only standalone paths (for Teleop). Default: true */
    drawConnectedPaths?: boolean;
    /** Optional replay progress (0-1) for progressive path drawing. If omitted, paths render fully. */
    replayDrawProgress?: number;
}

export interface FieldButtonProps {
    elementKey: string;
    element: FieldElement;
    hotkeyLabel?: string;
    isVisible: boolean;
    isDisabled?: boolean;
    isStuck?: boolean;
    isPotentialStuck?: boolean; // "Stuck?" state - amber, used in Auto before confirming stuck
    isSelected?: boolean;
    count?: number; // Optional counter badge (for defense, steal, etc.)
    onClick: (key: string) => void;
    alliance: 'red' | 'blue';
    isFieldRotated?: boolean;
    containerWidth: number;
    overrideX?: number;
}

export interface ZoneOverlayProps {
    zone: ZoneType;
    isActive: boolean;
    alliance: 'red' | 'blue';
    isDisabled?: boolean;
    isFieldRotated?: boolean;
    onClick: () => void;
}

export interface FuelSelectorProps {
    onSelect: (amount: number, label: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    accumulatedFuel: number;
    isLarge?: boolean;
    type?: 'score' | 'ferry' | 'collect';
}

export interface ClimbSelectorProps {
    onSelect: (level: ClimbLevel, result: ClimbResult) => void;
    onCancel: () => void;
    selectedLevel?: ClimbLevel;
    selectedResult?: ClimbResult;
}
