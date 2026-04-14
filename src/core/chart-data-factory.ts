import type { ElementQualityDistributionMethod } from "./charts/charts-utils";
import type { AstrologicalPoint, ChartType } from "./schemas/literals";
import type {
  ActiveAspect,
  AstrologicalSubjectModel,
  ChartDataModel,
  CompositeSubjectModel,
  DualChartAspectsModel,
  DualChartDataModel,
  ElementDistributionModel,
  PlanetReturnModel,
  QualityDistributionModel,
  SingleChartAspectsModel,
  SingleChartDataModel,
} from "./schemas/models";
import { AspectsFactory } from "./aspects/aspects-factory";
import { calculateElementPoints, calculateQualityPoints, calculateSynastryElementPoints, calculateSynastryQualityPoints } from "./charts/charts-utils";
import { HouseComparisonFactory } from "./house-comparison/house-comparison-factory";
import { RelationshipScoreFactory } from "./relationship-score-factory";
import { KerykeionException } from "./schemas/kerykeion-exception";
import { DEFAULT_CELESTIAL_POINTS_SETTINGS } from "./settings/chart-defaults";
import { DEFAULT_ACTIVE_ASPECTS } from "./settings/config-constants";
import { distributePercentagesTo100, findCommonActivePoints } from "./utilities";

type FirstSubject = AstrologicalSubjectModel | CompositeSubjectModel | PlanetReturnModel;
type SecondSubject = AstrologicalSubjectModel | PlanetReturnModel;

export class ChartDataFactory {
  static createChartData(
    chartType: ChartType,
    firstSubject: FirstSubject,
    secondSubject: SecondSubject | null = null,
    activePoints: AstrologicalPoint[] | null = null,
    activeAspects: ActiveAspect[] = DEFAULT_ACTIVE_ASPECTS,
    includeHouseComparison = true,
    includeRelationshipScore = false,
    options: {
      axis_orb_limit?: number | null;
      distribution_method?: ElementQualityDistributionMethod;
      custom_distribution_weights?: Readonly<Record<string, number>> | null;
    } = {},
  ): ChartDataModel {
    const distributionMethod = options.distribution_method ?? "weighted";
    const customWeights = options.custom_distribution_weights ?? null;

    if (["Transit", "Synastry", "DualReturnChart"].includes(chartType) && !secondSubject) {
      throw new KerykeionException(`Second subject is required for ${chartType} charts.`);
    }
    if (chartType === "Composite" && !("composite_chart_type" in firstSubject)) {
      throw new KerykeionException("First subject must be a CompositeSubjectModel for Composite charts.");
    }
    if (chartType === "SingleReturnChart" && !("return_type" in firstSubject)) {
      throw new KerykeionException("First subject must be a PlanetReturnModel for SingleReturnChart charts.");
    }

    let effectiveActivePoints
      = activePoints == null ? firstSubject.active_points : findCommonActivePoints(activePoints, firstSubject.active_points);
    if (secondSubject) {
      effectiveActivePoints = findCommonActivePoints(effectiveActivePoints, secondSubject.active_points);
    }
    effectiveActivePoints = [...effectiveActivePoints] as AstrologicalPoint[];

    const aspectsModel
      = chartType === "Natal" || chartType === "Composite" || chartType === "SingleReturnChart"
        ? AspectsFactory.singleChartAspects(firstSubject, {
            active_points: effectiveActivePoints,
            active_aspects: activeAspects,
            axis_orb_limit: options.axis_orb_limit ?? null,
          })
        : AspectsFactory.dualChartAspects(firstSubject, secondSubject!, {
            active_points: effectiveActivePoints,
            active_aspects: activeAspects,
            axis_orb_limit: options.axis_orb_limit ?? null,
            first_subject_is_fixed: chartType === "Synastry" || chartType === "Transit" || chartType === "DualReturnChart",
            second_subject_is_fixed: chartType === "Synastry",
          });

    let houseComparison: DualChartDataModel["house_comparison"] = null;
    if (secondSubject && includeHouseComparison && ["Transit", "Synastry", "DualReturnChart"].includes(chartType)) {
      if ("lat" in firstSubject && "lat" in secondSubject) {
        houseComparison = new HouseComparisonFactory(
          firstSubject as AstrologicalSubjectModel | PlanetReturnModel,
          secondSubject as AstrologicalSubjectModel | PlanetReturnModel,
          effectiveActivePoints,
        ).getHouseComparison();
      }
    }

    let relationshipScore: DualChartDataModel["relationship_score"] = null;
    if (chartType === "Synastry" && includeRelationshipScore && secondSubject && "lat" in firstSubject && "lat" in secondSubject) {
      relationshipScore = new RelationshipScoreFactory(
        firstSubject as AstrologicalSubjectModel,
        secondSubject as AstrologicalSubjectModel,
        true,
        { axis_orb_limit: options.axis_orb_limit ?? null },
      ).getRelationshipScore();
    }

    const availablePlanetsSetting = DEFAULT_CELESTIAL_POINTS_SETTINGS.filter(body =>
      effectiveActivePoints.includes(body.name as AstrologicalPoint),
    ).map(body => ({ ...body, is_active: true }));

    const celestialPointsNames = availablePlanetsSetting.map(body => body.name.toLowerCase());
    const elementTotals
      = chartType === "Synastry" && secondSubject && "lat" in firstSubject && "lat" in secondSubject
        ? calculateSynastryElementPoints(
            availablePlanetsSetting,
            celestialPointsNames,
            firstSubject as AstrologicalSubjectModel,
            secondSubject as AstrologicalSubjectModel,
            distributionMethod,
            customWeights,
          )
        : calculateElementPoints(
            availablePlanetsSetting,
            celestialPointsNames,
            firstSubject,
            distributionMethod,
            customWeights,
          );

    const qualityTotals
      = chartType === "Synastry" && secondSubject && "lat" in firstSubject && "lat" in secondSubject
        ? calculateSynastryQualityPoints(
            availablePlanetsSetting,
            celestialPointsNames,
            firstSubject as AstrologicalSubjectModel,
            secondSubject as AstrologicalSubjectModel,
            distributionMethod,
            customWeights,
          )
        : calculateQualityPoints(
            availablePlanetsSetting,
            celestialPointsNames,
            firstSubject,
            distributionMethod,
            customWeights,
          );

    const elementDistribution = this.buildElementDistribution(elementTotals);
    const qualityDistribution = this.buildQualityDistribution(qualityTotals);

    if (chartType === "Natal" || chartType === "Composite" || chartType === "SingleReturnChart") {
      return {
        chart_type: chartType,
        subject: firstSubject,
        aspects: (aspectsModel as SingleChartAspectsModel).aspects,
        element_distribution: elementDistribution,
        quality_distribution: qualityDistribution,
        active_points: effectiveActivePoints,
        active_aspects: activeAspects,
      } satisfies SingleChartDataModel;
    }

    if (!secondSubject) {
      throw new KerykeionException(`Second subject is required for ${chartType} charts.`);
    }

    return {
      chart_type: chartType,
      first_subject: firstSubject,
      second_subject: secondSubject,
      aspects: (aspectsModel as DualChartAspectsModel).aspects,
      house_comparison: houseComparison,
      relationship_score: relationshipScore,
      element_distribution: elementDistribution,
      quality_distribution: qualityDistribution,
      active_points: effectiveActivePoints,
      active_aspects: activeAspects,
    } satisfies DualChartDataModel;
  }

  private static buildElementDistribution(totals: Record<"fire" | "earth" | "air" | "water", number>): ElementDistributionModel {
    const total = totals.fire + totals.earth + totals.air + totals.water;
    const percentages = total > 0 ? distributePercentagesTo100(totals) : { fire: 0, earth: 0, air: 0, water: 0 };
    return {
      fire: totals.fire,
      earth: totals.earth,
      air: totals.air,
      water: totals.water,
      fire_percentage: percentages.fire!,
      earth_percentage: percentages.earth!,
      air_percentage: percentages.air!,
      water_percentage: percentages.water!,
    };
  }

  private static buildQualityDistribution(totals: Record<"cardinal" | "fixed" | "mutable", number>): QualityDistributionModel {
    const total = totals.cardinal + totals.fixed + totals.mutable;
    const percentages = total > 0 ? distributePercentagesTo100(totals) : { cardinal: 0, fixed: 0, mutable: 0 };
    return {
      cardinal: totals.cardinal,
      fixed: totals.fixed,
      mutable: totals.mutable,
      cardinal_percentage: percentages.cardinal!,
      fixed_percentage: percentages.fixed!,
      mutable_percentage: percentages.mutable!,
    };
  }

  static createNatalChartData(
    subject: FirstSubject,
    activePoints: AstrologicalPoint[] | null = null,
    activeAspects: ActiveAspect[] = DEFAULT_ACTIVE_ASPECTS,
    options: {
      distribution_method?: ElementQualityDistributionMethod;
      custom_distribution_weights?: Readonly<Record<string, number>> | null;
    } = {},
  ): ChartDataModel {
    return this.createChartData("Natal", subject, null, activePoints, activeAspects, true, false, options);
  }

  static createSynastryChartData(
    firstSubject: AstrologicalSubjectModel,
    secondSubject: AstrologicalSubjectModel,
    activePoints: AstrologicalPoint[] | null = null,
    activeAspects: ActiveAspect[] = DEFAULT_ACTIVE_ASPECTS,
    includeHouseComparison = true,
    includeRelationshipScore = true,
    options: {
      distribution_method?: ElementQualityDistributionMethod;
      custom_distribution_weights?: Readonly<Record<string, number>> | null;
    } = {},
  ): ChartDataModel {
    return this.createChartData(
      "Synastry",
      firstSubject,
      secondSubject,
      activePoints,
      activeAspects,
      includeHouseComparison,
      includeRelationshipScore,
      options,
    );
  }

  static createTransitChartData(
    natalSubject: AstrologicalSubjectModel,
    transitSubject: AstrologicalSubjectModel,
    activePoints: AstrologicalPoint[] | null = null,
    activeAspects: ActiveAspect[] = DEFAULT_ACTIVE_ASPECTS,
    includeHouseComparison = true,
    options: {
      distribution_method?: ElementQualityDistributionMethod;
      custom_distribution_weights?: Readonly<Record<string, number>> | null;
    } = {},
  ): ChartDataModel {
    return this.createChartData(
      "Transit",
      natalSubject,
      transitSubject,
      activePoints,
      activeAspects,
      includeHouseComparison,
      false,
      options,
    );
  }

  static createCompositeChartData(
    compositeSubject: CompositeSubjectModel,
    activePoints: AstrologicalPoint[] | null = null,
    activeAspects: ActiveAspect[] = DEFAULT_ACTIVE_ASPECTS,
    options: {
      distribution_method?: ElementQualityDistributionMethod;
      custom_distribution_weights?: Readonly<Record<string, number>> | null;
    } = {},
  ): ChartDataModel {
    return this.createChartData(
      "Composite",
      compositeSubject,
      null,
      activePoints,
      activeAspects,
      true,
      false,
      options,
    );
  }

  static createReturnChartData(
    natalSubject: AstrologicalSubjectModel,
    returnSubject: PlanetReturnModel,
    activePoints: AstrologicalPoint[] | null = null,
    activeAspects: ActiveAspect[] = DEFAULT_ACTIVE_ASPECTS,
    includeHouseComparison = true,
    options: {
      distribution_method?: ElementQualityDistributionMethod;
      custom_distribution_weights?: Readonly<Record<string, number>> | null;
    } = {},
  ): ChartDataModel {
    return this.createChartData(
      "DualReturnChart",
      natalSubject,
      returnSubject,
      activePoints,
      activeAspects,
      includeHouseComparison,
      false,
      options,
    );
  }

  static createSingleWheelReturnChartData(
    returnSubject: PlanetReturnModel,
    activePoints: AstrologicalPoint[] | null = null,
    activeAspects: ActiveAspect[] = DEFAULT_ACTIVE_ASPECTS,
    options: {
      distribution_method?: ElementQualityDistributionMethod;
      custom_distribution_weights?: Readonly<Record<string, number>> | null;
    } = {},
  ): ChartDataModel {
    return this.createChartData(
      "SingleReturnChart",
      returnSubject,
      null,
      activePoints,
      activeAspects,
      true,
      false,
      options,
    );
  }
}

const chartDataFactoryCompat = ChartDataFactory as typeof ChartDataFactory & {
  create_chart_data: typeof ChartDataFactory.createChartData;
  create_natal_chart_data: typeof ChartDataFactory.createNatalChartData;
  create_synastry_chart_data: typeof ChartDataFactory.createSynastryChartData;
  create_transit_chart_data: typeof ChartDataFactory.createTransitChartData;
  create_composite_chart_data: typeof ChartDataFactory.createCompositeChartData;
  create_return_chart_data: typeof ChartDataFactory.createReturnChartData;
  create_single_wheel_return_chart_data: typeof ChartDataFactory.createSingleWheelReturnChartData;
};

chartDataFactoryCompat.create_chart_data = ChartDataFactory.createChartData;
chartDataFactoryCompat.create_natal_chart_data = ChartDataFactory.createNatalChartData;
chartDataFactoryCompat.create_synastry_chart_data = ChartDataFactory.createSynastryChartData;
chartDataFactoryCompat.create_transit_chart_data = ChartDataFactory.createTransitChartData;
chartDataFactoryCompat.create_composite_chart_data = ChartDataFactory.createCompositeChartData;
chartDataFactoryCompat.create_return_chart_data = ChartDataFactory.createReturnChartData;
chartDataFactoryCompat.create_single_wheel_return_chart_data = ChartDataFactory.createSingleWheelReturnChartData;

type CreateChartDataAlias = typeof ChartDataFactory.createChartData;
type CreateNatalChartDataAlias = typeof ChartDataFactory.createNatalChartData;
type CreateSynastryChartDataAlias = typeof ChartDataFactory.createSynastryChartData;
type CreateTransitChartDataAlias = typeof ChartDataFactory.createTransitChartData;
type CreateCompositeChartDataAlias = typeof ChartDataFactory.createCompositeChartData;
type CreateReturnChartDataAlias = typeof ChartDataFactory.createReturnChartData;
type CreateSingleWheelReturnChartDataAlias = typeof ChartDataFactory.createSingleWheelReturnChartData;

export namespace ChartDataFactory {
  export const create_chart_data: CreateChartDataAlias = chartDataFactoryCompat.create_chart_data;
  export const create_natal_chart_data: CreateNatalChartDataAlias = chartDataFactoryCompat.create_natal_chart_data;
  export const create_synastry_chart_data: CreateSynastryChartDataAlias = chartDataFactoryCompat.create_synastry_chart_data;
  export const create_transit_chart_data: CreateTransitChartDataAlias = chartDataFactoryCompat.create_transit_chart_data;
  export const create_composite_chart_data: CreateCompositeChartDataAlias = chartDataFactoryCompat.create_composite_chart_data;
  export const create_return_chart_data: CreateReturnChartDataAlias = chartDataFactoryCompat.create_return_chart_data;
  export const create_single_wheel_return_chart_data: CreateSingleWheelReturnChartDataAlias
    = chartDataFactoryCompat.create_single_wheel_return_chart_data;
}
