import { Label } from "@/core/components/ui/label";
import { Input } from "@/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Settings, Weight, Car, Code, Camera, Eye, Cog, Layers } from "lucide-react";
import type {
  DrivetrainType,
  ProgrammingLanguage,
  PathPlannerSoftware,
  ProgrammingParadigm,
  TuningStatus,
  CameraHardware,
  VisionSoftware,
  SwerveLibrary,
  SwerveType,
  TreadType,
  IntakeType,
} from "@/types/database";

interface TechnicalSpecificationsProps {
  weight?: number;
  drivetrain?: DrivetrainType;
  programmingLanguage?: ProgrammingLanguage;
  programmingParadigm?: ProgrammingParadigm;
  pathPlannerSoftware?: PathPlannerSoftware;
  tuningStatus?: TuningStatus;
  cameraHardware?: CameraHardware;
  visionSoftware?: VisionSoftware;
  bestDrivenMatch?: string;
  swerveLibrary?: SwerveLibrary;
  swerveType?: SwerveType;
  swerveGearRatio?: string;
  treadType?: TreadType;
  lastTreadSwap?: string;
  intakeType?: IntakeType;
  onWeightChange: (value: number | undefined) => void;
  onDrivetrainChange: (value: DrivetrainType | undefined) => void;
  onProgrammingLanguageChange: (value: ProgrammingLanguage | undefined) => void;
  onProgrammingParadigmChange: (value: ProgrammingParadigm | undefined) => void;
  onPathPlannerSoftwareChange: (value: PathPlannerSoftware | undefined) => void;
  onTuningStatusChange: (value: TuningStatus | undefined) => void;
  onCameraHardwareChange: (value: CameraHardware | undefined) => void;
  onVisionSoftwareChange: (value: VisionSoftware | undefined) => void;
  onBestDrivenMatchChange: (value: string | undefined) => void;
  onSwerveLibraryChange: (value: SwerveLibrary | undefined) => void;
  onSwerveTypeChange: (value: SwerveType | undefined) => void;
  onSwerveGearRatioChange: (value: string | undefined) => void;
  onTreadTypeChange: (value: TreadType | undefined) => void;
  onLastTreadSwapChange: (value: string | undefined) => void;
  onIntakeTypeChange: (value: IntakeType | undefined) => void;
}

export function TechnicalSpecifications({
  weight,
  drivetrain,
  programmingLanguage,
  programmingParadigm,
  pathPlannerSoftware,
  tuningStatus,
  cameraHardware,
  visionSoftware,
  bestDrivenMatch,
  swerveLibrary,
  swerveType,
  swerveGearRatio,
  treadType,
  lastTreadSwap,
  intakeType,
  onWeightChange,
  onDrivetrainChange,
  onProgrammingLanguageChange,
  onProgrammingParadigmChange,
  onPathPlannerSoftwareChange,
  onTuningStatusChange,
  onCameraHardwareChange,
  onVisionSoftwareChange,
  onBestDrivenMatchChange,
  onSwerveLibraryChange,
  onSwerveTypeChange,
  onSwerveGearRatioChange,
  onTreadTypeChange,
  onLastTreadSwapChange,
  onIntakeTypeChange,
}: TechnicalSpecificationsProps) {
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      onWeightChange(undefined);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        onWeightChange(numValue);
      }
    }
  };

  const handleTextChange =
    (setter: (v: string | undefined) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setter(v === "" ? undefined : v);
    };

  return (
    <div className="space-y-4">
      {/* Robot Specs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Robot Specs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weight */}
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Robot Weight (lbs)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="e.g., 125"
              value={weight ?? ""}
              onChange={handleWeightChange}
              min="0"
              step="0.1"
              className="text-lg"
            />
          </div>

          {/* Drivetrain */}
          <div className="space-y-2">
            <Label htmlFor="drivetrain" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Drivetrain Type
            </Label>
            <Select
              value={drivetrain ?? "unspecified"}
              onValueChange={(v) =>
                onDrivetrainChange(v === "unspecified" ? undefined : (v as DrivetrainType))
              }
            >
              <SelectTrigger id="drivetrain" className="text-lg">
                <SelectValue placeholder="Select drivetrain type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="swerve">Swerve Drive</SelectItem>
                <SelectItem value="tank">Tank Drive</SelectItem>
                <SelectItem value="mecanum">Mecanum Drive</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Swerve Library (shown for any drivetrain but most relevant for swerve) */}
          <div className="space-y-2">
            <Label htmlFor="swerveLibrary" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Swerve Library / Control System
            </Label>
            <Select
              value={swerveLibrary ?? "unspecified"}
              onValueChange={(v) =>
                onSwerveLibraryChange(v === "unspecified" ? undefined : (v as SwerveLibrary))
              }
            >
              <SelectTrigger id="swerveLibrary" className="text-lg">
                <SelectValue placeholder="Select swerve library" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="CTRE">CTRE</SelectItem>
                <SelectItem value="YAGSL">YAGSL</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Swerve Module Type */}
          <div className="space-y-2">
            <Label htmlFor="swerveType">Swerve Module Type</Label>
            <Select
              value={swerveType ?? "unspecified"}
              onValueChange={(v) =>
                onSwerveTypeChange(v === "unspecified" ? undefined : (v as SwerveType))
              }
            >
              <SelectTrigger id="swerveType" className="text-lg">
                <SelectValue placeholder="Select swerve type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="Thrifty">Thrifty</SelectItem>
                <SelectItem value="WCP">WCP</SelectItem>
                <SelectItem value="REV">REV</SelectItem>
                <SelectItem value="Mk4n">SDS Mk4n</SelectItem>
                <SelectItem value="Mk4i">SDS Mk4i</SelectItem>
                <SelectItem value="Mk5i">SDS Mk5i</SelectItem>
                <SelectItem value="Mk5n">SDS Mk5n</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Swerve Gear Ratio */}
          <div className="space-y-2">
            <Label htmlFor="swerveGearRatio">Swerve Gear Ratio</Label>
            <Input
              id="swerveGearRatio"
              type="text"
              placeholder="e.g., L2, 6.75:1"
              value={swerveGearRatio ?? ""}
              onChange={handleTextChange(onSwerveGearRatioChange)}
              className="text-lg"
            />
          </div>

          {/* Tread Type */}
          <div className="space-y-2">
            <Label htmlFor="treadType">Tread Type</Label>
            <Select
              value={treadType ?? "unspecified"}
              onValueChange={(v) =>
                onTreadTypeChange(v === "unspecified" ? undefined : (v as TreadType))
              }
            >
              <SelectTrigger id="treadType" className="text-lg">
                <SelectValue placeholder="Select tread type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="Molded">Molded</SelectItem>
                <SelectItem value="Colson">Colson</SelectItem>
                <SelectItem value="Stealth">Stealth</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Last Tread Swap */}
          <div className="space-y-2">
            <Label htmlFor="lastTreadSwap">Last Tread Swap</Label>
            <Input
              id="lastTreadSwap"
              type="text"
              placeholder="e.g., Before Week 3"
              value={lastTreadSwap ?? ""}
              onChange={handleTextChange(onLastTreadSwapChange)}
              className="text-lg"
            />
          </div>

          {/* Intake Type */}
          <div className="space-y-2">
            <Label htmlFor="intakeType" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Intake Type
            </Label>
            <Select
              value={intakeType ?? "unspecified"}
              onValueChange={(v) =>
                onIntakeTypeChange(v === "unspecified" ? undefined : (v as IntakeType))
              }
            >
              <SelectTrigger id="intakeType" className="text-lg">
                <SelectValue placeholder="Select intake type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="Pivot">Pivot</SelectItem>
                <SelectItem value="Linear">Linear</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Software & Automation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Software &amp; Automation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Programming Language */}
          <div className="space-y-2">
            <Label htmlFor="programmingLanguage">Programming Language</Label>
            <Select
              value={programmingLanguage ?? "unspecified"}
              onValueChange={(v) =>
                onProgrammingLanguageChange(
                  v === "unspecified" ? undefined : (v as ProgrammingLanguage)
                )
              }
            >
              <SelectTrigger id="programmingLanguage" className="text-lg">
                <SelectValue placeholder="Select programming language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="Java">Java</SelectItem>
                <SelectItem value="C++">C++</SelectItem>
                <SelectItem value="Python">Python</SelectItem>
                <SelectItem value="LabVIEW">LabVIEW</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Programming Paradigm */}
          <div className="space-y-2">
            <Label htmlFor="programmingParadigm">Programming Paradigm</Label>
            <Select
              value={programmingParadigm ?? "unspecified"}
              onValueChange={(v) =>
                onProgrammingParadigmChange(
                  v === "unspecified" ? undefined : (v as ProgrammingParadigm)
                )
              }
            >
              <SelectTrigger id="programmingParadigm" className="text-lg">
                <SelectValue placeholder="Command Based or Iterative?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="Command Based">Command Based</SelectItem>
                <SelectItem value="Iterative">Iterative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Path Planner Software */}
          <div className="space-y-2">
            <Label htmlFor="pathPlannerSoftware">Auto Path Planning Software</Label>
            <Select
              value={pathPlannerSoftware ?? "unspecified"}
              onValueChange={(v) =>
                onPathPlannerSoftwareChange(
                  v === "unspecified" ? undefined : (v as PathPlannerSoftware)
                )
              }
            >
              <SelectTrigger id="pathPlannerSoftware" className="text-lg">
                <SelectValue placeholder="PathPlanner, Choreo, Beeline?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="PathPlanner">PathPlanner</SelectItem>
                <SelectItem value="Choreo">Choreo</SelectItem>
                <SelectItem value="Beeline">Beeline</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tuning Status */}
          <div className="space-y-2">
            <Label htmlFor="tuningStatus">Is Robot Tuned in PathPlanner?</Label>
            <Select
              value={tuningStatus ?? "unspecified"}
              onValueChange={(v) =>
                onTuningStatusChange(v === "unspecified" ? undefined : (v as TuningStatus))
              }
            >
              <SelectTrigger id="tuningStatus" className="text-lg">
                <SelectValue placeholder="Tuning status?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="Well Tuned">Well Tuned</SelectItem>
                <SelectItem value="Overshoots">Overshoots</SelectItem>
                <SelectItem value="Not Tuned">Not Tuned</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Best Driven Match */}
          <div className="space-y-2">
            <Label htmlFor="bestDrivenMatch">Best Driven Match</Label>
            <Input
              id="bestDrivenMatch"
              type="text"
              placeholder="e.g., Quals 14"
              value={bestDrivenMatch ?? ""}
              onChange={handleTextChange(onBestDrivenMatchChange)}
              className="text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vision */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vision System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Hardware */}
          <div className="space-y-2">
            <Label htmlFor="cameraHardware" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera Hardware
            </Label>
            <Select
              value={cameraHardware ?? "unspecified"}
              onValueChange={(v) =>
                onCameraHardwareChange(v === "unspecified" ? undefined : (v as CameraHardware))
              }
            >
              <SelectTrigger id="cameraHardware" className="text-lg">
                <SelectValue placeholder="Select camera hardware" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="Limelight">Limelight</SelectItem>
                <SelectItem value="ArduCAM">ArduCAM</SelectItem>
                <SelectItem value="ThriftyCAM">ThriftyCAM</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vision Software */}
          <div className="space-y-2">
            <Label htmlFor="visionSoftware">Vision Software</Label>
            <Select
              value={visionSoftware ?? "unspecified"}
              onValueChange={(v) =>
                onVisionSoftwareChange(v === "unspecified" ? undefined : (v as VisionSoftware))
              }
            >
              <SelectTrigger id="visionSoftware" className="text-lg">
                <SelectValue placeholder="Select vision software" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not specified</SelectItem>
                <SelectItem value="PhotonVision">PhotonVision</SelectItem>
                <SelectItem value="Limelight">Limelight</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
