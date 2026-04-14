import type { AstrologicalPoint } from "./schemas/literals";
import type {
  ActiveAspect,
  AstrologicalSubjectModel,
  TransitMomentModel,
  TransitsTimeRangeModel,
} from "./schemas/models";
import { AspectsFactory } from "./aspects/aspects-factory";
import { DEFAULT_ACTIVE_ASPECTS, DEFAULT_ACTIVE_POINTS } from "./settings/config-constants";

export interface TransitsTimeRangeFactoryOptions {
  natal_chart: AstrologicalSubjectModel;
  ephemeris_data_points: AstrologicalSubjectModel[];
  active_points?: AstrologicalPoint[];
  active_aspects?: ActiveAspect[];
  axis_orb_limit?: number | null;
}

export class TransitsTimeRangeFactory {
  readonly natal_chart: AstrologicalSubjectModel;
  readonly ephemeris_data_points: AstrologicalSubjectModel[];
  readonly active_points: AstrologicalPoint[];
  readonly active_aspects: ActiveAspect[];
  readonly axis_orb_limit: number | null;

  constructor(options: TransitsTimeRangeFactoryOptions) {
    this.natal_chart = options.natal_chart;
    this.ephemeris_data_points = options.ephemeris_data_points;
    this.active_points = options.active_points ?? DEFAULT_ACTIVE_POINTS;
    this.active_aspects = options.active_aspects ?? DEFAULT_ACTIVE_ASPECTS;
    this.axis_orb_limit = options.axis_orb_limit ?? null;
  }

  getTransitMoments(): TransitsTimeRangeModel {
    const transitMoments: TransitMomentModel[] = this.ephemeris_data_points.map(ephemerisPoint => ({
      date: ephemerisPoint.iso_formatted_utc_datetime,
      aspects: AspectsFactory.dualChartAspects(ephemerisPoint, this.natal_chart, {
        active_points: this.active_points,
        active_aspects: this.active_aspects,
        axis_orb_limit: this.axis_orb_limit,
        first_subject_is_fixed: false,
        second_subject_is_fixed: true,
      }).aspects,
    }));

    return {
      dates: this.ephemeris_data_points.map(point => point.iso_formatted_utc_datetime),
      subject: this.natal_chart,
      transits: transitMoments,
    };
  }
}

const transitsTimeRangeFactoryCompat = TransitsTimeRangeFactory.prototype as TransitsTimeRangeFactory & {
  get_transit_moments: typeof TransitsTimeRangeFactory.prototype.getTransitMoments;
};

transitsTimeRangeFactoryCompat.get_transit_moments = TransitsTimeRangeFactory.prototype.getTransitMoments;

export interface TransitsTimeRangeFactory {
  get_transit_moments: typeof TransitsTimeRangeFactory.prototype.getTransitMoments;
}
