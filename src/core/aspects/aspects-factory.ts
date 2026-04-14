import type { AspectMovementType, AstrologicalPoint } from "../schemas/literals";
import type {
  ActiveAspect,
  AspectModel,
  AstrologicalSubjectModel,
  CompositeSubjectModel,
  DualChartAspectsModel,
  PlanetReturnModel,
  SingleChartAspectsModel,
} from "../schemas/models";
import { DEFAULT_CELESTIAL_POINTS_SETTINGS, DEFAULT_CHART_ASPECTS_SETTINGS } from "../settings/chart-defaults";
import { DEFAULT_ACTIVE_ASPECTS } from "../settings/config-constants";
import { findCommonActivePoints } from "../utilities";
import { calculateAspectMovement, getActivePointsList, getAspectFromTwoPoints } from "./aspects-utils";

const AXES_LIST = ["Ascendant", "Medium_Coeli", "Descendant", "Imum_Coeli"] as const;
type SubjectLike = AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;

export class AspectsFactory {
  static singleChartAspects(
    subject: SubjectLike,
    options: {
      active_points?: AstrologicalPoint[] | null;
      active_aspects?: ActiveAspect[] | null;
      axis_orb_limit?: number | null;
    } = {},
  ): SingleChartAspectsModel {
    const activeAspectsResolved = options.active_aspects ?? DEFAULT_ACTIVE_ASPECTS;
    const activePointsResolved
      = options.active_points == null ? subject.active_points : findCommonActivePoints(subject.active_points, options.active_points);

    return this.createSingleChartAspectsModel(
      subject,
      activePointsResolved,
      activeAspectsResolved,
      options.axis_orb_limit ?? null,
    );
  }

  static dualChartAspects(
    firstSubject: SubjectLike,
    secondSubject: SubjectLike,
    options: {
      active_points?: AstrologicalPoint[] | null;
      active_aspects?: ActiveAspect[] | null;
      axis_orb_limit?: number | null;
      first_subject_is_fixed?: boolean;
      second_subject_is_fixed?: boolean;
    } = {},
  ): DualChartAspectsModel {
    const activeAspectsResolved = options.active_aspects ?? DEFAULT_ACTIVE_ASPECTS;
    const activePointsFirst
      = options.active_points == null ? firstSubject.active_points : findCommonActivePoints(firstSubject.active_points, options.active_points);
    const activePointsResolved = findCommonActivePoints(secondSubject.active_points, activePointsFirst);

    return this.createDualChartAspectsModel(
      firstSubject,
      secondSubject,
      activePointsResolved,
      activeAspectsResolved,
      options.axis_orb_limit ?? null,
      options.first_subject_is_fixed ?? false,
      options.second_subject_is_fixed ?? false,
    );
  }

  private static createSingleChartAspectsModel(
    subject: SubjectLike,
    activePointsResolved: AstrologicalPoint[],
    activeAspectsResolved: ActiveAspect[],
    axisOrbLimit: number | null,
  ): SingleChartAspectsModel {
    const allAspects = this.calculateSingleChartAspects(subject, activePointsResolved, activeAspectsResolved);
    const filteredAspects = this.filterRelevantAspects(allAspects, axisOrbLimit, true);

    return {
      subject,
      aspects: filteredAspects,
      active_points: activePointsResolved,
      active_aspects: activeAspectsResolved,
    };
  }

  private static createDualChartAspectsModel(
    firstSubject: SubjectLike,
    secondSubject: SubjectLike,
    activePointsResolved: AstrologicalPoint[],
    activeAspectsResolved: ActiveAspect[],
    axisOrbLimit: number | null,
    firstSubjectIsFixed: boolean,
    secondSubjectIsFixed: boolean,
  ): DualChartAspectsModel {
    const allAspects = this.calculateDualChartAspects(
      firstSubject,
      secondSubject,
      activePointsResolved,
      activeAspectsResolved,
      firstSubjectIsFixed,
      secondSubjectIsFixed,
    );
    const filteredAspects = this.filterRelevantAspects(allAspects, axisOrbLimit, false);

    return {
      first_subject: firstSubject,
      second_subject: secondSubject,
      aspects: filteredAspects,
      active_points: activePointsResolved,
      active_aspects: activeAspectsResolved,
    };
  }

  private static calculateSingleChartAspects(
    subject: SubjectLike,
    activePoints: AstrologicalPoint[],
    activeAspects: ActiveAspect[],
  ): AspectModel[] {
    const activePointsList = getActivePointsList(subject, activePoints, DEFAULT_CELESTIAL_POINTS_SETTINGS);
    const filteredSettings = this.updateAspectSettings(activeAspects);
    const planetIdLookup = Object.fromEntries(DEFAULT_CELESTIAL_POINTS_SETTINGS.map(planet => [planet.name, planet.id]));
    const oppositePairs = new Set([
      "Ascendant|Descendant",
      "Descendant|Ascendant",
      "Medium_Coeli|Imum_Coeli",
      "Imum_Coeli|Medium_Coeli",
      "True_North_Lunar_Node|True_South_Lunar_Node",
      "Mean_North_Lunar_Node|Mean_South_Lunar_Node",
      "True_South_Lunar_Node|True_North_Lunar_Node",
      "Mean_South_Lunar_Node|Mean_North_Lunar_Node",
    ]);

    const allAspects: AspectModel[] = [];
    for (let first = 0; first < activePointsList.length; first += 1) {
      for (let second = first + 1; second < activePointsList.length; second += 1) {
        const firstPoint = activePointsList[first]!;
        const secondPoint = activePointsList[second]!;
        if (oppositePairs.has(`${firstPoint.name}|${secondPoint.name}`)) {
          continue;
        }

        const aspect = getAspectFromTwoPoints(filteredSettings, firstPoint.abs_pos, secondPoint.abs_pos);
        if (!aspect.verdict || !aspect.name) {
          continue;
        }

        const firstSpeed = firstPoint.speed ?? 0;
        const secondSpeed = secondPoint.speed ?? 0;
        const aspectMovement: AspectMovementType
          = AXES_LIST.includes(firstPoint.name as (typeof AXES_LIST)[number])
            && AXES_LIST.includes(secondPoint.name as (typeof AXES_LIST)[number])
            ? "Static"
            : calculateAspectMovement(firstPoint.abs_pos, secondPoint.abs_pos, aspect.aspect_degrees, firstSpeed, secondSpeed);

        allAspects.push({
          p1_name: firstPoint.name,
          p1_owner: subject.name,
          p1_abs_pos: firstPoint.abs_pos,
          p2_name: secondPoint.name,
          p2_owner: subject.name,
          p2_abs_pos: secondPoint.abs_pos,
          aspect: aspect.name,
          orbit: aspect.orbit,
          aspect_degrees: aspect.aspect_degrees,
          diff: aspect.diff,
          p1: planetIdLookup[firstPoint.name] ?? 0,
          p2: planetIdLookup[secondPoint.name] ?? 0,
          aspect_movement: aspectMovement,
          p1_speed: firstSpeed,
          p2_speed: secondSpeed,
        });
      }
    }

    return allAspects;
  }

  private static calculateDualChartAspects(
    firstSubject: SubjectLike,
    secondSubject: SubjectLike,
    activePoints: AstrologicalPoint[],
    activeAspects: ActiveAspect[],
    firstSubjectIsFixed: boolean,
    secondSubjectIsFixed: boolean,
  ): AspectModel[] {
    const firstActivePointsList = getActivePointsList(firstSubject, activePoints, DEFAULT_CELESTIAL_POINTS_SETTINGS);
    const secondActivePointsList = getActivePointsList(secondSubject, activePoints, DEFAULT_CELESTIAL_POINTS_SETTINGS);
    const planetIdLookup = Object.fromEntries(DEFAULT_CELESTIAL_POINTS_SETTINGS.map(planet => [planet.name, planet.id]));
    const filteredSettings = this.updateAspectSettings(activeAspects);

    const allAspects: AspectModel[] = [];
    for (const firstPoint of firstActivePointsList) {
      for (const secondPoint of secondActivePointsList) {
        const aspect = getAspectFromTwoPoints(filteredSettings, firstPoint.abs_pos, secondPoint.abs_pos);
        if (!aspect.verdict || !aspect.name) {
          continue;
        }

        let firstSpeed = firstPoint.speed ?? 0;
        let secondSpeed = secondPoint.speed ?? 0;
        const aspectMovement: AspectMovementType
          = AXES_LIST.includes(firstPoint.name as (typeof AXES_LIST)[number])
            && AXES_LIST.includes(secondPoint.name as (typeof AXES_LIST)[number])
            ? "Static"
            : (() => {
                if (firstSubjectIsFixed) {
                  firstSpeed = 0;
                }
                if (secondSubjectIsFixed) {
                  secondSpeed = 0;
                }
                return calculateAspectMovement(
                  firstPoint.abs_pos,
                  secondPoint.abs_pos,
                  aspect.aspect_degrees,
                  firstSpeed,
                  secondSpeed,
                );
              })();

        allAspects.push({
          p1_name: firstPoint.name,
          p1_owner: firstSubject.name,
          p1_abs_pos: firstPoint.abs_pos,
          p2_name: secondPoint.name,
          p2_owner: secondSubject.name,
          p2_abs_pos: secondPoint.abs_pos,
          aspect: aspect.name,
          orbit: aspect.orbit,
          aspect_degrees: aspect.aspect_degrees,
          diff: aspect.diff,
          p1: planetIdLookup[firstPoint.name] ?? 0,
          p2: planetIdLookup[secondPoint.name] ?? 0,
          aspect_movement: aspectMovement,
          p1_speed: firstSpeed,
          p2_speed: secondSpeed,
        });
      }
    }

    return allAspects;
  }

  private static updateAspectSettings(activeAspects: ActiveAspect[]): ActiveAspect[] {
    const filteredSettings: ActiveAspect[] = [];
    for (const aspectSetting of DEFAULT_CHART_ASPECTS_SETTINGS) {
      for (const activeAspect of activeAspects) {
        if (aspectSetting.name === activeAspect.name) {
          filteredSettings.push({ name: activeAspect.name, orb: activeAspect.orb });
          break;
        }
      }
    }
    return filteredSettings;
  }

  private static filterRelevantAspects(
    allAspects: AspectModel[],
    axisOrbLimit: number | null,
    applyAxisOrbFilter: boolean,
  ): AspectModel[] {
    if (!applyAxisOrbFilter || axisOrbLimit == null) {
      return [...allAspects];
    }

    return allAspects.filter((aspect) => {
      const aspectInvolvesAxes = AXES_LIST.includes(aspect.p1_name as (typeof AXES_LIST)[number]) || AXES_LIST.includes(aspect.p2_name as (typeof AXES_LIST)[number]);
      return !(aspectInvolvesAxes && Math.abs(aspect.orbit) >= axisOrbLimit);
    });
  }

  static natalAspects = AspectsFactory.singleChartAspects;
  static synastryAspects = AspectsFactory.dualChartAspects;
}

const aspectsFactoryCompat = AspectsFactory as typeof AspectsFactory & {
  single_chart_aspects: typeof AspectsFactory.singleChartAspects;
  dual_chart_aspects: typeof AspectsFactory.dualChartAspects;
};

aspectsFactoryCompat.single_chart_aspects = AspectsFactory.singleChartAspects;
aspectsFactoryCompat.dual_chart_aspects = AspectsFactory.dualChartAspects;

type SingleChartAspectsAlias = typeof AspectsFactory.singleChartAspects;
type DualChartAspectsAlias = typeof AspectsFactory.dualChartAspects;

export namespace AspectsFactory {
  export const single_chart_aspects: SingleChartAspectsAlias = aspectsFactoryCompat.single_chart_aspects;
  export const dual_chart_aspects: DualChartAspectsAlias = aspectsFactoryCompat.dual_chart_aspects;
}
