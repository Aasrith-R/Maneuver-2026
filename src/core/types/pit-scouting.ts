/**
 * Pit Scouting Entry Types
 * 
 * SINGLE SOURCE OF TRUTH: This file defines the base pit scouting entry type.
 * 
 * STABLE: These types are year-agnostic and should not need modification.
 * Game-specific data is stored in the `gameData` field.
 */

/**
 * Standard FRC drivetrain types
 * Swerve is becoming dominant, but all types are still in use
 */
export type DrivetrainType = 'swerve' | 'tank' | 'mecanum' | 'other';

/**
 * Standard FRC programming languages
 * Java is the most common, followed by C++ and Python
 */
export type ProgrammingLanguage = 'Java' | 'C++' | 'Python' | 'LabVIEW' | 'other';

/** Auto path planning software */
export type PathPlannerSoftware = 'PathPlanner' | 'Choreo' | 'Beeline' | 'other';

/** FRC programming paradigm */
export type ProgrammingParadigm = 'Command Based' | 'Iterative';

/** PathPlanner tuning status */
export type TuningStatus = 'Well Tuned' | 'Overshoots' | 'Not Tuned' | 'other';

/** Vision camera hardware */
export type CameraHardware = 'Limelight' | 'ArduCAM' | 'ThriftyCAM' | 'other';

/** Vision processing software */
export type VisionSoftware = 'PhotonVision' | 'Limelight' | 'other';

/** Swerve drive library / control system */
export type SwerveLibrary = 'CTRE' | 'YAGSL' | 'other';

/** Swerve module type */
export type SwerveType = 'Thrifty' | 'WCP' | 'REV' | 'Mk4n' | 'Mk4i' | 'Mk5i' | 'Mk5n' | 'custom';

/** Wheel tread type */
export type TreadType = 'Molded' | 'Colson' | 'Stealth' | 'other';

/** Intake mechanism type */
export type IntakeType = 'Pivot' | 'Linear' | 'other';

/**
 * Base interface for pit scouting entries
 * 
 * DESIGN PRINCIPLES:
 * - Framework defines universal fields (photo, weight, drivetrain, language, notes)
 * - Game-specific data stored in `gameData` object (same pattern as ScoutingEntryBase)
 * - ID format: "pit-{teamNumber}-{eventKey}-{timestamp}-{random}" for natural collision detection
 * 
 * EXTENSION EXAMPLE (maneuver-2025):
 * interface PitScoutingEntry2025 extends PitScoutingEntryBase {
 *   gameData: {
 *     groundPickupCapabilities?: {
 *       coralGround: boolean;
 *       algaeGround: boolean;
 *     };
 *     reportedAutoScoring?: {
 *       canScoreL1: boolean;
 *       canScoreL2: boolean;
 *       // etc.
 *     };
 *     reportedTeleopScoring?: object;
 *     reportedEndgame?: object;
 *   };
 * }
 */
export interface PitScoutingEntryBase {
    id: string;                    // "pit-{teamNumber}-{eventKey}-{timestamp}-{random}"
    teamNumber: number;             // Team number (matches ScoutingEntryBase): 3314
    eventKey: string;               // TBA event key: "2025mrcmp"
    scoutName: string;              // Scout who recorded this entry
    timestamp: number;              // Unix milliseconds (not ISO string) for efficient comparison

    // Universal pit scouting fields (not game-specific)
    robotPhoto?: string;                        // Base64 or URL
    weight?: number;                            // Robot weight in pounds
    drivetrain?: DrivetrainType;                // Standard FRC drivetrain types
    programmingLanguage?: ProgrammingLanguage;  // Standard FRC programming languages
    programmingParadigm?: ProgrammingParadigm;  // Command Based vs Iterative
    pathPlannerSoftware?: PathPlannerSoftware;  // Auto path planning tool
    tuningStatus?: TuningStatus;                // PathPlanner tuning quality
    cameraHardware?: CameraHardware;            // Vision camera hardware
    visionSoftware?: VisionSoftware;            // Vision processing software
    bestDrivenMatch?: string;                   // Best autonomous match identifier
    swerveLibrary?: SwerveLibrary;              // Swerve control library (CTRE / YAGSL)
    swerveType?: SwerveType;                    // Swerve module type
    swerveGearRatio?: string;                   // Swerve gear ratio (e.g. "L2", "6.75:1")
    treadType?: TreadType;                      // Wheel tread type
    lastTreadSwap?: string;                     // Date/description of last tread swap
    intakeType?: IntakeType;                    // Intake mechanism type
    notes?: string;                             // General observations

    // Game-specific data (defined by game implementation)
    gameData: Record<string, unknown>; // Game implementations define typed structure here (required, use {} for empty)
}

/**
 * Pit scouting data collection wrapper
 */
export interface PitScoutingData {
    entries: PitScoutingEntryBase[];
    lastUpdated: number;
}

/**
 * Pit scouting statistics
 */
export interface PitScoutingStats {
    totalEntries: number;
    teams: number[];
    events: string[];
    scouts: string[];
}
