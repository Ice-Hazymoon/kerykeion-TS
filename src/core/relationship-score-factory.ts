import type { RelationshipScoreDescription } from "./schemas/literals";
import type {
  AspectModel,
  AstrologicalSubjectModel,
  RelationshipScoreAspectModel,
  RelationshipScoreModel,
  ScoreBreakdownItemModel,
} from "./schemas/models";
import { AspectsFactory } from "./aspects/aspects-factory";

const DESTINY_SIGN_POINTS = 5;
const HIGH_PRECISION_ORBIT_THRESHOLD = 2;
const MAJOR_ASPECT_POINTS_HIGH_PRECISION = 11;
const MAJOR_ASPECT_POINTS_STANDARD = 8;
const MINOR_ASPECT_POINTS = 4;
const SUN_ASCENDANT_ASPECT_POINTS = 4;
const MOON_ASCENDANT_ASPECT_POINTS = 4;
const VENUS_MARS_ASPECT_POINTS = 4;

export class RelationshipScoreFactory {
  private readonly synastryAspects;
  private scoreValue = 0;
  private relationshipScoreDescription: RelationshipScoreDescription = "Minimal";
  private isDestinySign = false;
  private relationshipScoreAspects: RelationshipScoreAspectModel[] = [];
  private scoreBreakdown: ScoreBreakdownItemModel[] = [];
  private readonly firstSun;
  private readonly secondSun;

  private static readonly SCORE_MAPPING: Array<[RelationshipScoreDescription, number]> = [
    ["Minimal", 5],
    ["Medium", 10],
    ["Important", 15],
    ["Very Important", 20],
    ["Exceptional", 30],
    ["Rare Exceptional", Number.POSITIVE_INFINITY],
  ];

  private static readonly MAJOR_ASPECTS = new Set(["conjunction", "opposition", "square", "trine", "sextile"]);

  constructor(
    private readonly firstSubject: AstrologicalSubjectModel,
    private readonly secondSubject: AstrologicalSubjectModel,
    private readonly useOnlyMajorAspects = true,
    options: { axis_orb_limit?: number | null } = {},
  ) {
    if (!firstSubject.sun || !secondSubject.sun) {
      throw new Error("RelationshipScoreFactory requires both subjects to have Sun positions.");
    }

    this.firstSun = firstSubject.sun;
    this.secondSun = secondSubject.sun;
    this.synastryAspects = AspectsFactory.dualChartAspects(firstSubject, secondSubject, {
      axis_orb_limit: options.axis_orb_limit ?? null,
      first_subject_is_fixed: true,
      second_subject_is_fixed: true,
    }).aspects;
  }

  private evaluateAspect(
    aspect: AspectModel,
    points: number,
    rule: string,
    description: string,
  ): void {
    if (this.useOnlyMajorAspects && !RelationshipScoreFactory.MAJOR_ASPECTS.has(aspect.aspect)) {
      return;
    }

    this.scoreValue += points;
    this.relationshipScoreAspects.push({
      p1_name: aspect.p1_name,
      p2_name: aspect.p2_name,
      aspect: aspect.aspect,
      orbit: aspect.orbit,
    });
    this.scoreBreakdown.push({
      rule,
      description,
      points,
      details: `${aspect.p1_name}-${aspect.p2_name} ${aspect.aspect} (orbit: ${aspect.orbit.toFixed(2)}°)`,
    });
  }

  private evaluateDestinySign(): void {
    if (this.firstSun.quality === this.secondSun.quality) {
      this.isDestinySign = true;
      this.scoreValue += DESTINY_SIGN_POINTS;
      this.scoreBreakdown.push({
        rule: "destiny_sign",
        description: `Both Sun signs share ${this.firstSun.quality} quality`,
        points: DESTINY_SIGN_POINTS,
        details: `${this.firstSun.sign} - ${this.secondSun.sign}`,
      });
    }
  }

  private evaluateSunSunMainAspect(aspect: AspectModel): void {
    if (aspect.p1_name === "Sun" && aspect.p2_name === "Sun" && ["conjunction", "opposition", "square"].includes(aspect.aspect)) {
      const highPrecision = aspect.orbit <= HIGH_PRECISION_ORBIT_THRESHOLD;
      this.evaluateAspect(
        aspect,
        highPrecision ? MAJOR_ASPECT_POINTS_HIGH_PRECISION : MAJOR_ASPECT_POINTS_STANDARD,
        "sun_sun_major",
        `Sun-Sun ${aspect.aspect} (${highPrecision ? "high precision (≤2°)" : "standard"})`,
      );
    }
  }

  private evaluateSunMoonConjunction(aspect: AspectModel): void {
    if (new Set([aspect.p1_name, aspect.p2_name]).size === 2 && [aspect.p1_name, aspect.p2_name].includes("Sun") && [aspect.p1_name, aspect.p2_name].includes("Moon") && aspect.aspect === "conjunction") {
      const highPrecision = aspect.orbit <= HIGH_PRECISION_ORBIT_THRESHOLD;
      this.evaluateAspect(
        aspect,
        highPrecision ? MAJOR_ASPECT_POINTS_HIGH_PRECISION : MAJOR_ASPECT_POINTS_STANDARD,
        "sun_moon_conjunction",
        `Sun-Moon conjunction (${highPrecision ? "high precision (≤2°)" : "standard"})`,
      );
    }
  }

  private evaluateSunSunOtherAspects(aspect: AspectModel): void {
    if (aspect.p1_name === "Sun" && aspect.p2_name === "Sun" && !["conjunction", "opposition", "square"].includes(aspect.aspect)) {
      this.evaluateAspect(aspect, MINOR_ASPECT_POINTS, "sun_sun_minor", `Sun-Sun ${aspect.aspect}`);
    }
  }

  private evaluateSunMoonOtherAspects(aspect: AspectModel): void {
    if ([aspect.p1_name, aspect.p2_name].includes("Sun") && [aspect.p1_name, aspect.p2_name].includes("Moon") && aspect.aspect !== "conjunction") {
      this.evaluateAspect(aspect, MINOR_ASPECT_POINTS, "sun_moon_other", `Sun-Moon ${aspect.aspect}`);
    }
  }

  private evaluateSunAscendantAspect(aspect: AspectModel): void {
    if ([aspect.p1_name, aspect.p2_name].includes("Sun") && [aspect.p1_name, aspect.p2_name].includes("Ascendant")) {
      this.evaluateAspect(aspect, SUN_ASCENDANT_ASPECT_POINTS, "sun_ascendant", `Sun-Ascendant ${aspect.aspect}`);
    }
  }

  private evaluateMoonAscendantAspect(aspect: AspectModel): void {
    if ([aspect.p1_name, aspect.p2_name].includes("Moon") && [aspect.p1_name, aspect.p2_name].includes("Ascendant")) {
      this.evaluateAspect(aspect, MOON_ASCENDANT_ASPECT_POINTS, "moon_ascendant", `Moon-Ascendant ${aspect.aspect}`);
    }
  }

  private evaluateVenusMarsAspect(aspect: AspectModel): void {
    if ([aspect.p1_name, aspect.p2_name].includes("Venus") && [aspect.p1_name, aspect.p2_name].includes("Mars")) {
      this.evaluateAspect(aspect, VENUS_MARS_ASPECT_POINTS, "venus_mars", `Venus-Mars ${aspect.aspect}`);
    }
  }

  private determineScoreDescription(): void {
    for (const [description, threshold] of RelationshipScoreFactory.SCORE_MAPPING) {
      if (this.scoreValue < threshold) {
        this.relationshipScoreDescription = description;
        return;
      }
    }
  }

  getRelationshipScore(): RelationshipScoreModel {
    this.evaluateDestinySign();

    for (const aspect of this.synastryAspects) {
      this.evaluateSunSunMainAspect(aspect);
      this.evaluateSunMoonConjunction(aspect);
      this.evaluateSunMoonOtherAspects(aspect);
      this.evaluateSunSunOtherAspects(aspect);
      this.evaluateSunAscendantAspect(aspect);
      this.evaluateMoonAscendantAspect(aspect);
      this.evaluateVenusMarsAspect(aspect);
    }

    this.determineScoreDescription();

    return {
      score_value: this.scoreValue,
      score_description: this.relationshipScoreDescription,
      is_destiny_sign: this.isDestinySign,
      aspects: this.relationshipScoreAspects,
      score_breakdown: this.scoreBreakdown,
      subjects: [this.firstSubject, this.secondSubject],
    };
  }
}

const relationshipScoreFactoryCompat = RelationshipScoreFactory.prototype as RelationshipScoreFactory & {
  get_relationship_score: typeof RelationshipScoreFactory.prototype.getRelationshipScore;
};

relationshipScoreFactoryCompat.get_relationship_score = RelationshipScoreFactory.prototype.getRelationshipScore;

export interface RelationshipScoreFactory {
  get_relationship_score: typeof RelationshipScoreFactory.prototype.getRelationshipScore;
}
