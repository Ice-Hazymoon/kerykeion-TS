import type { AstrologicalPoint } from "../schemas/literals";
import type { AstrologicalSubjectModel, HouseComparisonModel, PlanetReturnModel } from "../schemas/models";
import { DEFAULT_ACTIVE_POINTS } from "../settings/config-constants";
import { calculateCuspsInReciprocalHouses, calculatePointsInReciprocalHouses } from "./house-comparison-utils";

type SubjectLike = AstrologicalSubjectModel | PlanetReturnModel;

export class HouseComparisonFactory {
  constructor(
    private readonly firstSubject: SubjectLike,
    private readonly secondSubject: SubjectLike,
    private readonly activePoints: AstrologicalPoint[] = DEFAULT_ACTIVE_POINTS,
  ) {}

  getHouseComparison(): HouseComparisonModel {
    return {
      first_subject_name: this.firstSubject.name,
      second_subject_name: this.secondSubject.name,
      first_points_in_second_houses: calculatePointsInReciprocalHouses(
        this.firstSubject,
        this.secondSubject,
        this.activePoints,
      ),
      second_points_in_first_houses: calculatePointsInReciprocalHouses(
        this.secondSubject,
        this.firstSubject,
        this.activePoints,
      ),
      first_cusps_in_second_houses: calculateCuspsInReciprocalHouses(this.firstSubject, this.secondSubject),
      second_cusps_in_first_houses: calculateCuspsInReciprocalHouses(this.secondSubject, this.firstSubject),
    };
  }
}

const houseComparisonFactoryCompat = HouseComparisonFactory.prototype as HouseComparisonFactory & {
  get_house_comparison: typeof HouseComparisonFactory.prototype.getHouseComparison;
};

houseComparisonFactoryCompat.get_house_comparison = HouseComparisonFactory.prototype.getHouseComparison;

export interface HouseComparisonFactory {
  get_house_comparison: typeof HouseComparisonFactory.prototype.getHouseComparison;
}
