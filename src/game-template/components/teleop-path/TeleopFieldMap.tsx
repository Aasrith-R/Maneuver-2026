/**
 * Teleop Field Map Component
 * 
 * Field-based scoring interface for Teleop period.
 * Uses zone overlays for manual zone selection with shoot/ferry paths.
 * 
 * Key differences from Auto:
 * - No connected movement path - only shoot/ferry paths are standalone
 * - Zone selection via overlay tap (not traversal actions)
 * - Climb includes level selection (L1/L2/L3) + success/fail
 * - Defense and Ferry actions in-field
 */

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/core/lib/utils';
import { loadPitScoutingByTeamAndEvent } from '@/core/db/database';

import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/core/hooks/use-mobile';
import fieldImage from '@/game-template/assets/2026-field.png';

// Import shared field-map components
import {
    type DefenseEffectiveness,
    type PathWaypoint,
    type ZoneType,

    FIELD_ELEMENTS,
    FieldCanvas,
    FieldButton,
    FieldHeader,
    getVisibleElements,
    ZoneOverlay,
    PendingWaypointPopup,
    DefensePopup,
} from '../field-map';
import { FerryTypePopup } from '../field-map/FerryTypePopup';


// Context hooks
import { TeleopPathProvider, useTeleopScoring } from '@/game-template/contexts';
import { formatDurationSecondsLabel } from '@/game-template/duration';
import { TELEOP_PHASE_DURATION_MS } from '@/game-template/constants';
import {
    GAME_SCOUT_OPTION_KEYS,
    getEffectiveScoutOptions,
} from '@/game-template/scout-options';

// Local sub-components
import { TeleopActionLog } from './components/TeleopActionLog';
import { PostClimbProceed } from '../scoring/PostClimbProceed';


// =============================================================================
// TYPES
// =============================================================================

export interface TeleopFieldMapProps {
    onAddAction: (action: PathWaypoint) => void;
    actions: PathWaypoint[];
    scoutOptions?: Record<string, boolean>;
    onUndo?: () => void;
    canUndo?: boolean;
    matchNumber?: string | number;
    matchType?: 'qm' | 'sf' | 'f';
    teamNumber?: string | number;
    onBack?: () => void;
    onProceed?: (finalActions?: PathWaypoint[]) => void;
}

// =============================================================================
// WRAPPER COMPONENT - Provides Context
// =============================================================================

export function TeleopFieldMap(props: TeleopFieldMapProps) {
    const location = useLocation();
    const alliance = location.state?.inputs?.alliance || 'blue';

    return (
        <TeleopPathProvider
            actions={props.actions}
            onAddAction={props.onAddAction}
            onUndo={props.onUndo}
            canUndo={props.canUndo}
            alliance={alliance}
            matchNumber={props.matchNumber}
            matchType={props.matchType}
            teamNumber={props.teamNumber}
            onBack={props.onBack}
            onProceed={props.onProceed}
        >
            <TeleopFieldMapContent scoutOptions={props.scoutOptions} />
        </TeleopPathProvider>
    );
}

// =============================================================================
// CONTENT COMPONENT - Uses Context
// =============================================================================

function TeleopFieldMapContent({
    scoutOptions,
}: {
    scoutOptions?: Record<string, boolean>;
}) {
    // Get all state from context
    const {
        // From ScoringContext
        actions,
        onAddAction,
        onUndo,
        canUndo,
        pendingWaypoint,
        setPendingWaypoint,
        accumulatedFuel,
        setAccumulatedFuel,
        fuelHistory,
        setFuelHistory,
        resetFuel,
        stuckStarts,
        setStuckStarts,
        isAnyStuck,
        isFieldRotated,
        toggleFieldOrientation,
        alliance,
        matchNumber,
        matchType,
        teamNumber,
        onBack,
        onProceed,
        generateId,
        // From TeleopPathContext
        activeZone,
        setActiveZone,
        climbLevel,
        setClimbLevel,
        climbLocation,
        setClimbLocation,
        climbResult,
        setClimbResult,
        showPostClimbProceed,
        setShowPostClimbProceed,
        canvasDimensions,
        containerRef,
    } = useTeleopScoring();

    const isMobile = useIsMobile();
    const effectiveScoutOptions = getEffectiveScoutOptions(scoutOptions);
    const disableHubFuelScoringPopup =
        effectiveScoutOptions[GAME_SCOUT_OPTION_KEYS.disableHubFuelScoringPopup] === true;
    const disableDefensePopup =
        effectiveScoutOptions[GAME_SCOUT_OPTION_KEYS.disableDefensePopup] === true;

    // Local state (UI-only)
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [robotCapacity, setRobotCapacity] = useState<number | undefined>();
    const [actionLogOpen, setActionLogOpen] = useState(false);
    type FerryFlowStep = 'start-zone' | 'land-zone' | 'ferry-type' | 'fuel';
    const [ferryFlowStep, setFerryFlowStep] = useState<FerryFlowStep | null>(null);
    const [pendingFerry, setPendingFerry] = useState<PathWaypoint | null>(null);
    const [focusClimbTimeInputOnOpen, setFocusClimbTimeInputOnOpen] = useState(false);
    const [climbStartTime, setClimbStartTime] = useState<number | null>(null);
    const [beachedStart, setBeachedStart] = useState<number | null>(null);
    const [isDefenseTargetDialogOpen, setIsDefenseTargetDialogOpen] = useState(false);
    const [isDefenseEffectivenessDialogOpen, setIsDefenseEffectivenessDialogOpen] = useState(false);
    const [pendingDefenseZone, setPendingDefenseZone] = useState<ZoneType | null>(null);
    const [opponentTeamOptions, setOpponentTeamOptions] = useState<string[]>([]);
    const [selectedDefenseTeam, setSelectedDefenseTeam] = useState<string>('');
    const [customDefenseTeamInput, setCustomDefenseTeamInput] = useState('');
    const [selectedDefenseEffectiveness, setSelectedDefenseEffectiveness] = useState<DefenseEffectiveness | null>(null);

    // Broken down state - persisted with localStorage
    const [brokenDownStart, setBrokenDownStart] = useState<number | null>(() => {
        const saved = localStorage.getItem('teleopBrokenDownStart');
        return saved ? parseInt(saved, 10) : null;
    });
    const [totalBrokenDownTime, setTotalBrokenDownTime] = useState<number>(() => {
        const saved = localStorage.getItem('teleopBrokenDownTime');
        return saved ? parseInt(saved, 10) : 0;
    });
    const isBrokenDown = brokenDownStart !== null;

    // Load pit scouting data for fuel capacity
    useEffect(() => {
        const loadPitData = async () => {
            if (!teamNumber) return;
            try {
                const eventKey = localStorage.getItem('eventKey') || '';
                const pitData = await loadPitScoutingByTeamAndEvent(Number(teamNumber), eventKey);
                if (pitData && pitData.gameData) {
                    setRobotCapacity(pitData.gameData.fuelCapacity as number);
                }
            } catch (error) {
                console.error('Failed to load pit scouting data:', error);
            }
        };
        loadPitData();
    }, [teamNumber]);

    // Reset fuel accumulation when entering Teleop (component mounts)
    useEffect(() => {
        resetFuel();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Reset fuel when any pending waypoint is cleared
    useEffect(() => {
        if (!pendingWaypoint) {
            resetFuel();
        }
    }, [pendingWaypoint, resetFuel]);

    const cancelFerryFlow = useCallback(() => {
        setPendingFerry(null);
        setFerryFlowStep(null);
        setAccumulatedFuel(0);
        setFuelHistory([]);
    }, [setAccumulatedFuel, setFuelHistory]);

    // Auto-fullscreen on mobile
    useEffect(() => {
        if (isMobile) {
            setIsFullscreen(true);
        }
    }, [isMobile]);

    // Calculate totals
    const totalFuelScored = actions
        .filter(a => a.type === 'score')
        .reduce((sum, a) => sum + Math.abs(a.fuelDelta || 0), 0);

    const totalFuelFerried = actions
        .filter(a => a.type === 'ferry')
        .reduce((sum, a) => sum + Math.abs(a.fuelDelta || 0), 0);

    // Defense counted from actions array like everything else
    const totalDefense = actions.filter(a => a.type === 'defense').length;

    const getOpponentTeamsFromSchedule = useCallback((): string[] => {
        try {
            const matchDataStr = localStorage.getItem('matchData');
            const matchData = matchDataStr ? JSON.parse(matchDataStr) : [];

            if (!Array.isArray(matchData) || matchData.length === 0) return [];

            const parsedMatchNumber = Number.parseInt(String(matchNumber), 10);
            if (!Number.isFinite(parsedMatchNumber) || parsedMatchNumber <= 0) return [];

            const currentMatch = matchData[parsedMatchNumber - 1];
            if (!currentMatch || typeof currentMatch !== 'object') return [];

            const opponentAllianceKey = alliance === 'red' ? 'blueAlliance' : 'redAlliance';
            const rawTeams = (currentMatch as Record<string, unknown>)[opponentAllianceKey];
            if (!Array.isArray(rawTeams)) return [];

            return rawTeams
                .map((team) => String(team ?? '').trim())
                .filter((team) => /^\d+$/.test(team))
                .slice(0, 3);
        } catch {
            return [];
        }
    }, [alliance, matchNumber]);

    const resetDefenseDialogState = useCallback(() => {
        setIsDefenseTargetDialogOpen(false);
        setIsDefenseEffectivenessDialogOpen(false);
        setPendingDefenseZone(null);
        setOpponentTeamOptions([]);
        setSelectedDefenseTeam('');
        setCustomDefenseTeamInput('');
        setSelectedDefenseEffectiveness(null);
    }, []);

    const addDefenseAction = useCallback((zone: ZoneType, details?: {
        defendedTeamNumber?: number;
        defenseTargetSource?: 'schedule' | 'custom';
        defenseEffectiveness?: DefenseEffectiveness;
    }) => {
        onAddAction({
            id: generateId(),
            type: 'defense',
            timestamp: Date.now(),
            zone,
            ...details,
        } as any);
    }, [generateId, onAddAction]);

    const startDefenseFlow = useCallback((zone: ZoneType) => {
        if (disableDefensePopup) {
            addDefenseAction(zone);
            return;
        }

        const opponentTeams = getOpponentTeamsFromSchedule();
        setPendingDefenseZone(zone);
        setOpponentTeamOptions(opponentTeams);
        setSelectedDefenseTeam(opponentTeams[0] || '');
        setCustomDefenseTeamInput('');
        setSelectedDefenseEffectiveness(null);
        setIsDefenseEffectivenessDialogOpen(false);
        setIsDefenseTargetDialogOpen(true);
    }, [addDefenseAction, disableDefensePopup, getOpponentTeamsFromSchedule]);

    const getSelectedDefenseTeamNumber = useCallback((): number | null => {
        const rawValue = customDefenseTeamInput.trim() !== '' ? customDefenseTeamInput : selectedDefenseTeam;
        const sanitized = rawValue.trim();
        if (!/^\d+$/.test(sanitized)) return null;

        const parsed = Number.parseInt(sanitized, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [customDefenseTeamInput, selectedDefenseTeam]);

    const handleDefenseTargetNext = useCallback(() => {
        const teamNumber = getSelectedDefenseTeamNumber();
        if (!teamNumber) return;

        setIsDefenseTargetDialogOpen(false);
        setIsDefenseEffectivenessDialogOpen(true);
    }, [getSelectedDefenseTeamNumber]);

    const handleDefenseConfirm = useCallback(() => {
        const teamNumber = getSelectedDefenseTeamNumber();
        if (!teamNumber || !pendingDefenseZone || !selectedDefenseEffectiveness) return;

        addDefenseAction(pendingDefenseZone, {
            defendedTeamNumber: teamNumber,
            defenseTargetSource: customDefenseTeamInput.trim() !== '' ? 'custom' : 'schedule',
            defenseEffectiveness: selectedDefenseEffectiveness,
        });

        resetDefenseDialogState();
    }, [
        addDefenseAction,
        getSelectedDefenseTeamNumber,
        pendingDefenseZone,
        resetDefenseDialogState,
        customDefenseTeamInput,
        selectedDefenseEffectiveness,
    ]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    const handleBrokenDownToggle = () => {
        if (brokenDownStart) {
            // Robot is back up - accumulate the time
            const duration = Date.now() - brokenDownStart;
            const newTotal = totalBrokenDownTime + duration;
            setTotalBrokenDownTime(newTotal);
            localStorage.setItem('teleopBrokenDownTime', String(newTotal));
            setBrokenDownStart(null);
            localStorage.removeItem('teleopBrokenDownStart');
        } else {
            // Robot is breaking down - start tracking time
            const now = Date.now();
            setBrokenDownStart(now);
            localStorage.setItem('teleopBrokenDownStart', String(now));
        }
    };

    const handleZoneClick = (zone: ZoneType) => {
        setActiveZone(zone);
    };

    const handleElementClick = useCallback((elementKey: string) => {
        // Block if popup active or broken down
        if (
            pendingWaypoint ||
            ferryFlowStep !== null ||
            isDefenseTargetDialogOpen ||
            isDefenseEffectivenessDialogOpen ||
            isBrokenDown
        ) {
            return;
        }

        const element = FIELD_ELEMENTS[elementKey];
        if (!element) return;

        // Handle Stuck/Obstacle Toggles
        if (elementKey.includes('trench') || elementKey.includes('bump')) {
            const isCurrentlyStuck = !!stuckStarts[elementKey];
            const obstacleType = elementKey.includes('trench') ? 'trench' : 'bump';
            const obstacleZone: ZoneType = elementKey.includes('opponent') ? 'opponentZone' : 'allianceZone';

            if (isCurrentlyStuck) {
                // Clearing stuck state - record duration
                const startTime = stuckStarts[elementKey]!;
                const duration = Math.min(Date.now() - startTime, TELEOP_PHASE_DURATION_MS);

                onAddAction({
                    id: generateId(),
                    type: 'unstuck',
                    action: `unstuck-${obstacleType}`,
                    position: { x: element.x, y: element.y },
                    timestamp: Date.now(),
                    duration: duration,
                    obstacleType: obstacleType,
                    zone: obstacleZone
                });

                setStuckStarts(prev => {
                    const next = { ...prev };
                    delete next[elementKey];
                    return next;
                });
            } else {
                // Entering stuck state
                onAddAction({
                    id: generateId(),
                    type: 'stuck',
                    action: `stuck-${obstacleType}`,
                    position: { x: element.x, y: element.y },
                    timestamp: Date.now(),
                    obstacleType: obstacleType,
                    zone: obstacleZone
                });

                setStuckStarts(prev => ({
                    ...prev,
                    [elementKey]: Date.now()
                }));
            }
            return;
        }

        switch (elementKey) {
            case 'hub':
                if (disableHubFuelScoringPopup) {
                    onAddAction({
                        id: generateId(),
                        type: 'score',
                        action: 'hub',
                        position: { x: element.x, y: element.y },
                        timestamp: Date.now(),
                        fuelDelta: 0,
                        zone: 'allianceZone',
                    } as any);
                } else {
                    setPendingWaypoint({
                        id: generateId(),
                        type: 'score',
                        action: 'hub',
                        position: { x: element.x, y: element.y },
                        fuelDelta: 0,
                        amountLabel: '...',
                        timestamp: Date.now(),
                        zone: 'allianceZone',
                    });
                    setAccumulatedFuel(0);
                    setFuelHistory([]);
                }
                break;
            case 'ferry':
            case 'ferry_opponent':
                setPendingFerry({
                    id: generateId(),
                    type: 'ferry',
                    action: 'ferry',
                    position: { x: element.x, y: element.y },
                    timestamp: Date.now(),
                } as any);
                setFerryFlowStep('ferry-type');
                break;
            case 'depot':
                setPendingWaypoint({
                    id: generateId(),
                    type: 'collect',
                    action: 'depot',
                    position: { x: element.x, y: element.y },
                    fuelDelta: 0,
                    amountLabel: '...',
                    timestamp: Date.now(),
                    zone: 'allianceZone',
                });
                setAccumulatedFuel(0);
                setFuelHistory([]);
                break;
            case 'collect_alliance':
                setPendingWaypoint({
                    id: generateId(),
                    type: 'collect',
                    action: 'collect_alliance',
                    position: { x: element.x, y: element.y },
                    fuelDelta: 0,
                    amountLabel: '...',
                    timestamp: Date.now(),
                    zone: 'allianceZone',
                });
                setAccumulatedFuel(0);
                setFuelHistory([]);
                break;
            case 'tower':
                // Open climb selector and start timing the climb
                setFocusClimbTimeInputOnOpen(false);
                setClimbStartTime(Date.now());
                setPendingWaypoint({
                    id: generateId(),
                    type: 'climb',
                    action: 'attempt',
                    position: { x: element.x, y: element.y },
                    timestamp: Date.now(),
                    zone: 'allianceZone',
                });
                setClimbLevel(undefined);
                setClimbLocation(undefined);
                setClimbResult('success');
                break;
            case 'defense_alliance':
                startDefenseFlow('allianceZone');
                break;
            case 'defense_neutral':
                startDefenseFlow('neutralZone');
                break;
            case 'defense_opponent':
                startDefenseFlow('opponentZone');
                break;
            case 'beached': {
                const isCurrentlyBeached = beachedStart !== null;
                if (isCurrentlyBeached) {
                    const duration = Math.min(Date.now() - beachedStart, TELEOP_PHASE_DURATION_MS);
                    onAddAction({
                        id: generateId(),
                        type: 'unbeached',
                        action: 'unbeached',
                        position: { x: element.x, y: element.y },
                        timestamp: Date.now(),
                        duration,
                        zone: 'neutralZone',
                    } as any);
                    setBeachedStart(null);
                } else {
                    onAddAction({
                        id: generateId(),
                        type: 'beached',
                        action: 'beached',
                        position: { x: element.x, y: element.y },
                        timestamp: Date.now(),
                        zone: 'neutralZone',
                    } as any);
                    setBeachedStart(Date.now());
                }
                break;
            }
        }
    }, [
        beachedStart,
        disableHubFuelScoringPopup,
        ferryFlowStep,
        generateId,
        isBrokenDown,
        isDefenseEffectivenessDialogOpen,
        isDefenseTargetDialogOpen,
        onAddAction,
        pendingWaypoint,
        startDefenseFlow,
        setAccumulatedFuel,
        setBeachedStart,
        setClimbLevel,
        setClimbLocation,
        setClimbResult,
        setFuelHistory,
        setFocusClimbTimeInputOnOpen,
        setFerryFlowStep,
        setPendingFerry,
        setPendingWaypoint,
        setStuckStarts,
        stuckStarts,
    ]);

    const handleFuelSelect = (amount: number) => {
        setAccumulatedFuel(prev => prev + amount);
        setFuelHistory(prev => [...prev, amount]);
    };

    const handleFuelConfirm = () => {
        if (!pendingWaypoint || accumulatedFuel === 0) return;

        const waypoint: PathWaypoint = {
            ...pendingWaypoint,
            fuelDelta: pendingWaypoint.type === 'score' ? -accumulatedFuel : accumulatedFuel,
            amountLabel: `${accumulatedFuel}`,
        };
        onAddAction(waypoint);
        setPendingWaypoint(null);
        setAccumulatedFuel(0);
        setFuelHistory([]);
    };

    const handleFuelCancel = () => {
        setPendingWaypoint(null);
        setAccumulatedFuel(0);
        setFuelHistory([]);
    };

    const handleFuelUndo = () => {
        if (fuelHistory.length === 0) return;
        const lastAmount = fuelHistory[fuelHistory.length - 1]!;
        setAccumulatedFuel(prev => prev - lastAmount);
        setFuelHistory(prev => prev.slice(0, -1));
    };



    const handleClimbCancel = () => {
        setPendingWaypoint(null);
        setClimbLevel(undefined);
        setClimbLocation(undefined);
        setClimbStartTime(null);
    };

    // Undo wrapper that also clears active broken down state
    const handleUndoWrapper = () => {
        if (brokenDownStart) {
            setBrokenDownStart(null);
        }
        if (onUndo) {
            onUndo();
        }
    };

    // ==========================================================================
    // GET VISIBLE ELEMENTS FOR ACTIVE ZONE
    // ==========================================================================

    // Use shared zone element config
    const visibleElements = getVisibleElements('teleop', activeZone);

    const getTeleopHotkeyLabel = (elementKey: string): string | undefined => {
        if (elementKey === 'hub') return 'S';
        if (elementKey === 'tower') return 'F';
        if (elementKey === 'defense_alliance' || elementKey === 'defense_neutral' || elementKey === 'defense_opponent') return 'D';
        if (elementKey === 'beached') return 'B';

        const allianceTraversalMap: Record<string, string> = isFieldRotated
            ? { trench1: '1', bump1: '2', bump2: '3', trench2: '4' }
            : { trench1: '4', bump1: '3', bump2: '2', trench2: '1' };
        const opponentTraversalMap: Record<string, string> = isFieldRotated
            ? { trench_opponent1: 'Q', bump_opponent1: 'W', bump_opponent2: 'E', trench_opponent2: 'R' }
            : { trench_opponent1: 'R', bump_opponent1: 'E', bump_opponent2: 'W', trench_opponent2: 'Q' };

        return allianceTraversalMap[elementKey] || opponentTraversalMap[elementKey];
    };

    const handleProceedToEndgame = useCallback(() => {
        // Capture any active stuck timers before proceeding
        const stuckEntries = Object.entries(stuckStarts);
        const finalActions = [...actions];
        const now = Date.now();

        for (const [elementKey, startTime] of stuckEntries) {
            if (startTime && typeof startTime === 'number') {
                const obstacleType = elementKey.includes('trench') ? 'trench' : 'bump';
                const element = FIELD_ELEMENTS[elementKey];
                const duration = Math.min(now - startTime, TELEOP_PHASE_DURATION_MS);

                const unstuckWaypoint: PathWaypoint = {
                    id: generateId(),
                    type: 'unstuck',
                    action: `unstuck-${obstacleType}`,
                    position: element ? { x: element.x, y: element.y } : { x: 0, y: 0 },
                    timestamp: now,
                    duration,
                    obstacleType: obstacleType as 'trench' | 'bump',
                    amountLabel: formatDurationSecondsLabel(duration),
                };

                finalActions.push(unstuckWaypoint);
            }
        }

        if (stuckEntries.length > 0) {
            setStuckStarts({});
        }

        // Capture active beached time before proceeding
        if (beachedStart) {
            const beachedElement = FIELD_ELEMENTS['beached'];
            const duration = Math.min(Date.now() - beachedStart, TELEOP_PHASE_DURATION_MS);
            finalActions.push({
                id: generateId(),
                type: 'unbeached',
                action: 'unbeached',
                position: beachedElement ? { x: beachedElement.x, y: beachedElement.y } : { x: 0, y: 0 },
                timestamp: Date.now(),
                duration,
                zone: 'neutralZone',
            } as any);
            setBeachedStart(null);
        }

        // Capture any active broken down time before proceeding
        if (brokenDownStart) {
            const duration = Date.now() - brokenDownStart;
            const finalTotal = totalBrokenDownTime + duration;
            localStorage.setItem('teleopBrokenDownTime', String(finalTotal));
        }

        if (onProceed) onProceed(finalActions);
    }, [
        actions,
        beachedStart,
        brokenDownStart,
        generateId,
        onProceed,
        setBeachedStart,
        setStuckStarts,
        stuckStarts,
        totalBrokenDownTime,
    ]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const target = event.target as HTMLElement | null;
            const isEditableTarget =
                !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

            if (key === 'escape') {
                event.preventDefault();
                if (isDefenseEffectivenessDialogOpen || isDefenseTargetDialogOpen) {
                    resetDefenseDialogState();
                    return;
                }

                if (ferryFlowStep !== null) {
                    cancelFerryFlow();
                    return;
                }

                if (pendingWaypoint) {
                    if (pendingWaypoint.type === 'climb') {
                        setPendingWaypoint(null);
                        setClimbLevel(undefined);
                        setClimbLocation(undefined);
                    } else {
                        setPendingWaypoint(null);
                        setAccumulatedFuel(0);
                        setFuelHistory([]);
                    }
                    return;
                }
                return;
            }

            if (isDefenseTargetDialogOpen) {
                if (!isEditableTarget && (key === 'a' || key === 's' || key === 'd')) {
                    const index = key === 'a' ? 0 : key === 's' ? 1 : 2;
                    const team = opponentTeamOptions[index];
                    if (team) {
                        event.preventDefault();
                        setSelectedDefenseTeam(team);
                        setCustomDefenseTeamInput('');
                    }
                    return;
                }

                if (!isEditableTarget && (key === 'n' || key === 'enter' || key === ' ' || key === 'spacebar')) {
                    if (!getSelectedDefenseTeamNumber()) return;
                    event.preventDefault();
                    handleDefenseTargetNext();
                    return;
                }

                return;
            }

            if (isDefenseEffectivenessDialogOpen) {
                if (key === 'a') {
                    event.preventDefault();
                    setSelectedDefenseEffectiveness('very');
                    return;
                }

                if (key === 's') {
                    event.preventDefault();
                    setSelectedDefenseEffectiveness('somewhat');
                    return;
                }

                if (key === 'd') {
                    event.preventDefault();
                    setSelectedDefenseEffectiveness('not');
                    return;
                }

                if (key === 'enter' || key === ' ' || key === 'spacebar') {
                    if (!selectedDefenseEffectiveness) return;
                    event.preventDefault();
                    handleDefenseConfirm();
                    return;
                }

                return;
            }

            if (isEditableTarget) return;

            if (key === 'c') {
                event.preventDefault();
                if (isFieldRotated) {
                    if (activeZone === 'opponentZone') setActiveZone('neutralZone');
                    else if (activeZone === 'neutralZone') setActiveZone('allianceZone');
                    else setActiveZone('allianceZone');
                } else {
                    if (activeZone === 'allianceZone') setActiveZone('neutralZone');
                    else if (activeZone === 'neutralZone') setActiveZone('opponentZone');
                    else setActiveZone('opponentZone');
                }
                return;
            }

            if (key === 'v') {
                event.preventDefault();
                if (isFieldRotated) {
                    if (activeZone === 'allianceZone') setActiveZone('neutralZone');
                    else if (activeZone === 'neutralZone') setActiveZone('opponentZone');
                    else setActiveZone('opponentZone');
                } else {
                    if (activeZone === 'opponentZone') setActiveZone('neutralZone');
                    else if (activeZone === 'neutralZone') setActiveZone('allianceZone');
                    else setActiveZone('allianceZone');
                }
                return;
            }

            if (pendingWaypoint || ferryFlowStep !== null) return;

            const allianceStuckKeyMap: Record<string, string> = isFieldRotated
                ? {
                    '1': 'trench1',
                    '2': 'bump1',
                    '3': 'bump2',
                    '4': 'trench2',
                }
                : {
                    '1': 'trench2',
                    '2': 'bump2',
                    '3': 'bump1',
                    '4': 'trench1',
                };
            const opponentStuckKeyMap: Record<string, string> = isFieldRotated
                ? {
                    q: 'trench_opponent1',
                    w: 'bump_opponent1',
                    e: 'bump_opponent2',
                    r: 'trench_opponent2',
                }
                : {
                    q: 'trench_opponent2',
                    w: 'bump_opponent2',
                    e: 'bump_opponent1',
                    r: 'trench_opponent1',
                };

            const visibleElementSet = new Set<string>(visibleElements);

            const canUseAllianceTraversalHotkeys =
                visibleElementSet.has('trench1') ||
                visibleElementSet.has('bump1') ||
                visibleElementSet.has('bump2') ||
                visibleElementSet.has('trench2');
            const canUseOpponentTraversalHotkeys =
                visibleElementSet.has('trench_opponent1') ||
                visibleElementSet.has('bump_opponent1') ||
                visibleElementSet.has('bump_opponent2') ||
                visibleElementSet.has('trench_opponent2');

            if (canUseAllianceTraversalHotkeys) {
                const allianceTraversalElementKey = allianceStuckKeyMap[key];
                if (allianceTraversalElementKey) {
                    event.preventDefault();
                    handleElementClick(allianceTraversalElementKey);
                    return;
                }
            }

            if (canUseOpponentTraversalHotkeys) {
                const opponentTraversalElementKey = opponentStuckKeyMap[key];
                if (opponentTraversalElementKey) {
                    event.preventDefault();
                    handleElementClick(opponentTraversalElementKey);
                    return;
                }
            }

            if (key === 'z') {
                event.preventDefault();
                if (brokenDownStart) {
                    setBrokenDownStart(null);
                }
                if (onUndo) {
                    onUndo();
                }
                return;
            }

            if (key === 'x') {
                event.preventDefault();
                if (brokenDownStart) {
                    const duration = Date.now() - brokenDownStart;
                    const newTotal = totalBrokenDownTime + duration;
                    setTotalBrokenDownTime(newTotal);
                    localStorage.setItem('teleopBrokenDownTime', String(newTotal));
                    setBrokenDownStart(null);
                    localStorage.removeItem('teleopBrokenDownStart');
                } else {
                    const now = Date.now();
                    setBrokenDownStart(now);
                    localStorage.setItem('teleopBrokenDownStart', String(now));
                }
                return;
            }

            if (key === 'enter') {
                event.preventDefault();
                handleProceedToEndgame();
                return;
            }

            const isBusyWithSelection = ferryFlowStep !== null || isAnyStuck || isBrokenDown;
            if (isBusyWithSelection) return;

            const canScoreFromZone = visibleElementSet.has('hub');
            const canFerryFromZone = visibleElementSet.has('ferry') || visibleElementSet.has('ferry_opponent');
            const canBeachedFromZone = visibleElementSet.has('beached');
            const canDefenseFromZone =
                visibleElementSet.has('defense_alliance') ||
                visibleElementSet.has('defense_neutral') ||
                visibleElementSet.has('defense_opponent');
            const canClimbFromZone = visibleElements.includes('tower');

            if (key === 's') {
                if (!canScoreFromZone) return;

                event.preventDefault();
                handleElementClick('hub');
                return;
            }

            if (key === 'a') {
                if (!canFerryFromZone) return;
                event.preventDefault();
                handleElementClick('ferry');
                return;
            }

            if (key === 'b') {
                if (!canBeachedFromZone) return;
                event.preventDefault();
                handleElementClick('beached');
                return;
            }

            if (key === 'f') {
                if (!canClimbFromZone) return;
                event.preventDefault();
                const towerElement = FIELD_ELEMENTS.tower;
                if (!towerElement) return;
                setFocusClimbTimeInputOnOpen(true);
                setPendingWaypoint({
                    id: generateId(),
                    type: 'climb',
                    action: 'attempt',
                    position: { x: towerElement!.x, y: towerElement!.y },
                    timestamp: Date.now(),
                    zone: 'allianceZone',
                });
                setClimbLevel(undefined);
                setClimbLocation(undefined);
                setClimbResult('success');
                return;
            }

            if (key === 'd') {
                if (!canDefenseFromZone) return;
                event.preventDefault();
                startDefenseFlow(activeZone || 'neutralZone');
                return;
            }

        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        activeZone,
        brokenDownStart,
        cancelFerryFlow,
        ferryFlowStep,
        generateId,
        handleElementClick,
        handleDefenseConfirm,
        handleDefenseTargetNext,
        handleProceedToEndgame,
        getSelectedDefenseTeamNumber,
        isDefenseEffectivenessDialogOpen,
        isDefenseTargetDialogOpen,
        isFieldRotated,
        isAnyStuck,
        isBrokenDown,
        opponentTeamOptions,
        onUndo,
        pendingWaypoint,
        resetDefenseDialogState,
        setAccumulatedFuel,
        setActiveZone,
        setBrokenDownStart,
        setClimbLevel,
        setClimbLocation,
        setClimbResult,
        setCustomDefenseTeamInput,
        setSelectedDefenseEffectiveness,
        setSelectedDefenseTeam,
        setFuelHistory,
        setFocusClimbTimeInputOnOpen,
        setPendingWaypoint,
        selectedDefenseEffectiveness,
        startDefenseFlow,
        setTotalBrokenDownTime,
        totalBrokenDownTime,
        visibleElements,
    ]);

    useEffect(() => {
        if (!pendingWaypoint || pendingWaypoint.type !== 'climb') {
            setFocusClimbTimeInputOnOpen(false);
        }
    }, [pendingWaypoint]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const content = (
        <div className={cn("flex flex-col gap-2", isFullscreen && "h-full")}>
            {/* Header */}
            <FieldHeader
                phase="teleop"
                stats={[
                    { label: 'Scored', value: totalFuelScored, color: 'green' },
                    { label: 'Ferried', value: totalFuelFerried, color: 'purple' },
                ]}
                currentZone={activeZone}
                isFullscreen={isFullscreen}
                onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
                actionLogSlot={<TeleopActionLog actions={actions} open={actionLogOpen} onOpenChange={setActionLogOpen} />}
                onActionLogOpen={() => setActionLogOpen(true)}
                matchNumber={matchNumber}
                matchType={matchType}
                teamNumber={teamNumber}
                alliance={alliance}
                isFieldRotated={isFieldRotated}
                canUndo={canUndo}
                onUndo={handleUndoWrapper}
                onBack={onBack}
                onProceed={handleProceedToEndgame}
                toggleFieldOrientation={toggleFieldOrientation}
                isBrokenDown={isBrokenDown}
                onBrokenDownToggle={handleBrokenDownToggle}
            />

            {/* Field Map */}
            <div className={cn("flex-1 relative", isFullscreen ? "h-full flex items-center justify-center" : "")}>
                {/* Container with 2:1 aspect ratio */}
                <div
                    ref={containerRef}
                    className={cn(
                        "relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 select-none",
                        "w-full aspect-[2/1]",
                        isFullscreen ? "max-h-[85vh] m-auto" : "h-auto"
                    )}
                    style={{
                        transform: isFieldRotated ? 'rotate(180deg)' : undefined,
                    }}
                >
                    {/* Field Background */}
                    <img
                        src={fieldImage}
                        alt="2026 Field"
                        className="w-full h-full object-fill"
                        style={{ opacity: 0.9 }}
                    />

                    {/* Canvas Layer */}
                    <FieldCanvas
                        actions={actions}
                        pendingWaypoint={pendingWaypoint}
                        alliance={alliance}
                        isFieldRotated={isFieldRotated}
                        width={canvasDimensions.width}
                        height={canvasDimensions.height}
                        drawConnectedPaths={false}
                    />

                    {/* Zone Overlays - show inactive zones for quick switching */}
                    {!pendingWaypoint && ferryFlowStep === null && !isDefenseTargetDialogOpen && !isDefenseEffectivenessDialogOpen && (
                        <>
                            <ZoneOverlay
                                zone="allianceZone"
                                isActive={activeZone === 'allianceZone'}
                                alliance={alliance}
                                isDisabled={isAnyStuck}
                                isFieldRotated={isFieldRotated}
                                onClick={() => handleZoneClick('allianceZone')}
                            />
                            <ZoneOverlay
                                zone="neutralZone"
                                isActive={activeZone === 'neutralZone'}
                                alliance={alliance}
                                isDisabled={isAnyStuck}
                                isFieldRotated={isFieldRotated}
                                onClick={() => handleZoneClick('neutralZone')}
                            />
                            <ZoneOverlay
                                zone="opponentZone"
                                isActive={activeZone === 'opponentZone'}
                                alliance={alliance}
                                isDisabled={isAnyStuck}
                                isFieldRotated={isFieldRotated}
                                onClick={() => handleZoneClick('opponentZone')}
                            />
                        </>
                    )}

                    {/* Field Buttons (only visible ones for this zone) */}
                    {activeZone && !pendingWaypoint && ferryFlowStep === null && !isDefenseTargetDialogOpen && !isDefenseEffectivenessDialogOpen && (
                        <>
                            {visibleElements.map((key) => {
                                let element = FIELD_ELEMENTS[key];
                                if (!element) return null;

                                if (key === 'hub') {
                                    element = {
                                        ...element,
                                        name: 'Score',
                                    };
                                }

                                if (key === 'depot' || key === 'collect_alliance') {
                                    element = {
                                        ...element,
                                        name: 'Collect',
                                    };
                                }

                                // Override obstacle elements to always say "Stuck" in Teleop
                                if (key.includes('trench') || key.includes('bump')) {
                                    element = {
                                        ...element,
                                        name: 'Stuck?'
                                    };
                                }

                                // Add counts for defense buttons
                                let count: number | undefined = undefined;
                                if (key === 'defense_alliance' || key === 'defense_neutral' || key === 'defense_opponent') {
                                    count = totalDefense;
                                }

                                const isBeachedKey = key === 'beached';
                                const isBeachedActive = isBeachedKey && beachedStart !== null;

                                return (
                                    <FieldButton
                                        key={key}
                                        elementKey={key}
                                        element={element}
                                        hotkeyLabel={getTeleopHotkeyLabel(key)}
                                        isVisible={true}
                                        isDisabled={isBeachedKey ? false : (isAnyStuck && !stuckStarts[key])}
                                        isStuck={!!stuckStarts[key] || isBeachedActive}
                                        count={count}
                                        onClick={handleElementClick}
                                        alliance={alliance}
                                        isFieldRotated={isFieldRotated}
                                        containerWidth={canvasDimensions.width}
                                    />
                                );
                            })}
                        </>
                    )}

                    {ferryFlowStep === 'ferry-type' && (
                        <FerryTypePopup
                            isFieldRotated={isFieldRotated}
                            onSelect={(ft) => {
                                setPendingFerry((prev) => (prev ? { ...prev, ferryType: ft } : prev));
                                setAccumulatedFuel(0);
                                setFuelHistory([]);
                                setFerryFlowStep('fuel');
                            }}
                            onCancel={cancelFerryFlow}
                        />
                    )}

                    {ferryFlowStep === 'fuel' && pendingFerry && (
                        <PendingWaypointPopup
                            pendingWaypoint={pendingFerry}
                            accumulatedFuel={accumulatedFuel}
                            fuelHistory={fuelHistory}
                            isFieldRotated={isFieldRotated}
                            alliance={alliance}
                            robotCapacity={robotCapacity}
                            onFuelSelect={handleFuelSelect}
                            onFuelUndo={handleFuelUndo}
                            climbResult={null}
                            onClimbResultSelect={() => {}}
                            onConfirm={() => {
                                onAddAction({
                                    ...pendingFerry,
                                    fuelDelta: accumulatedFuel,
                                    amountLabel: String(accumulatedFuel),
                                } as PathWaypoint);
                                setPendingFerry(null);
                                setFerryFlowStep(null);
                                setAccumulatedFuel(0);
                                setFuelHistory([]);
                            }}
                            onCancel={cancelFerryFlow}
                        />
                    )}

                    {/* Post-Action Popup (Fuel or Climb) */}
                    {pendingWaypoint && (
                        <PendingWaypointPopup
                            pendingWaypoint={pendingWaypoint}
                            accumulatedFuel={accumulatedFuel}
                            fuelHistory={fuelHistory}
                            isFieldRotated={isFieldRotated}
                            alliance={alliance}
                            robotCapacity={robotCapacity}
                            onFuelSelect={handleFuelSelect}
                            onFuelUndo={handleFuelUndo}
                            climbResult={climbResult}
                            onClimbResultSelect={(result) => setClimbResult(result)}
                            climbWithLevels={true}
                            climbLevel={climbLevel}
                            onClimbLevelSelect={(level) => setClimbLevel(level)}
                            climbLocation={climbLocation}
                            onClimbLocationSelect={(location) => setClimbLocation(location)}
                            focusClimbTimeInputOnOpen={focusClimbTimeInputOnOpen}
                            onConfirm={pendingWaypoint.type === 'climb' ? (selectedClimbStartTimeSecRemaining) => {
                                if (climbLevel && climbLocation && climbResult) {
                                    const climbDurationSec = climbStartTime
                                        ? Math.round((Date.now() - climbStartTime) / 1000)
                                        : undefined;
                                    const waypoint: PathWaypoint = {
                                        ...pendingWaypoint,
                                        action: `climbL${climbLevel}`,
                                        amountLabel: `${climbLocation === 'side' ? 'Side' : 'Middle'} L${climbLevel} ${climbResult === 'success' ? '✓' : '✗'}`,
                                        climbLevel,
                                        climbLocation,
                                        climbResult: climbResult,
                                        climbStartTimeSecRemaining: selectedClimbStartTimeSecRemaining ?? null,
                                        climbDurationSec,
                                    };
                                    onAddAction(waypoint);
                                    setPendingWaypoint(null);
                                    setFocusClimbTimeInputOnOpen(false);
                                    setClimbLevel(undefined);
                                    setClimbLocation(undefined);
                                    setClimbResult('success');
                                    setClimbStartTime(null);
                                    // Show proceed dialog
                                    setShowPostClimbProceed(true);
                                }
                            } : handleFuelConfirm}
                            onCancel={pendingWaypoint.type === 'climb' ? handleClimbCancel : handleFuelCancel}
                        />
                    )}<DefensePopup
                        isFieldRotated={isFieldRotated}
                        isTargetOpen={isDefenseTargetDialogOpen}
                        isEffectivenessOpen={isDefenseEffectivenessDialogOpen}
                        opponentTeamOptions={opponentTeamOptions}
                        selectedDefenseTeam={selectedDefenseTeam}
                        customDefenseTeamInput={customDefenseTeamInput}
                        selectedDefenseEffectiveness={selectedDefenseEffectiveness}
                        onSelectTeam={(team) => {
                            setSelectedDefenseTeam(team);
                            setCustomDefenseTeamInput('');
                        }}
                        onCustomDefenseTeamInputChange={setCustomDefenseTeamInput}
                        onSelectEffectiveness={setSelectedDefenseEffectiveness}
                        onCancel={resetDefenseDialogState}
                        onNext={handleDefenseTargetNext}
                        onConfirm={handleDefenseConfirm}
                        canProceed={!!getSelectedDefenseTeamNumber()}
                        canConfirm={!!selectedDefenseEffectiveness}
                    />

                    {/* Post-Climb Transition Overlay */}
                    {showPostClimbProceed && onProceed && (
                        <PostClimbProceed
                            isFieldRotated={isFieldRotated}
                            onProceed={onProceed}
                            onStay={() => setShowPostClimbProceed(false)}
                            nextPhaseName="Endgame"
                        />
                    )}
                </div>
            </div>
        </div>
    );

    // Wrap in fullscreen modal or return content directly
    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-[100] bg-background p-4 flex flex-col">
                {content}
            </div>
        );
    }

    return content;
}
