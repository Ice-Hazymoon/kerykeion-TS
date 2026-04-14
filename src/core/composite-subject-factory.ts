import type {
  AstrologicalSubjectModel,
  CompositeSubjectModel,
} from "./schemas/models";
import { KerykeionException } from "./schemas/kerykeion-exception";
import { calculateMoonPhase, circularMean, circularSort, findCommonActivePoints, getKerykeionPointFromDegree, getPlanetHouse } from "./utilities";

export class CompositeSubjectFactory {
  private model: CompositeSubjectModel | null = null;
  private readonly composite_chart_type = "Midpoint" as const;
  private readonly active_points: AstrologicalSubjectModel["active_points"];
  private readonly name: string;
  private readonly zodiac_type: AstrologicalSubjectModel["zodiac_type"];
  private readonly sidereal_mode: AstrologicalSubjectModel["sidereal_mode"];
  private readonly houses_system_identifier: AstrologicalSubjectModel["houses_system_identifier"];
  private readonly houses_system_name: AstrologicalSubjectModel["houses_system_name"];
  private readonly perspective_type: AstrologicalSubjectModel["perspective_type"];
  private readonly houses_names_list: AstrologicalSubjectModel["houses_names_list"];

  constructor(
    private readonly firstSubject: AstrologicalSubjectModel,
    private readonly secondSubject: AstrologicalSubjectModel,
    chartName: string | null = null,
  ) {
    this.active_points = findCommonActivePoints(firstSubject.active_points, secondSubject.active_points);
    this.name = chartName ?? `${firstSubject.name} and ${secondSubject.name} Composite Chart`;

    if (firstSubject.zodiac_type !== secondSubject.zodiac_type) {
      throw new KerykeionException("Both subjects must have the same zodiac type");
    }
    if (firstSubject.sidereal_mode !== secondSubject.sidereal_mode) {
      throw new KerykeionException("Both subjects must have the same sidereal mode");
    }
    if (firstSubject.houses_system_identifier !== secondSubject.houses_system_identifier) {
      throw new KerykeionException("Both subjects must have the same houses system");
    }
    if (firstSubject.houses_system_name !== secondSubject.houses_system_name) {
      throw new KerykeionException("Both subjects must have the same houses system name");
    }
    if (firstSubject.perspective_type !== secondSubject.perspective_type) {
      throw new KerykeionException("Both subjects must have the same perspective type");
    }

    this.zodiac_type = firstSubject.zodiac_type;
    this.sidereal_mode = firstSubject.sidereal_mode ?? null;
    this.houses_system_identifier = firstSubject.houses_system_identifier;
    this.houses_system_name = firstSubject.houses_system_name;
    this.perspective_type = firstSubject.perspective_type;
    this.houses_names_list = firstSubject.houses_names_list;
    this.active_points = firstSubject.active_points.filter(planet =>
      secondSubject.active_points.includes(planet),
    );
  }

  private calculateMidpointCompositePointsAndHouses(target: Record<string, unknown>): void {
    const houseDegreeListUt = circularSort(
      this.firstSubject.houses_names_list.map((houseName) => {
        const houseKey = houseName.toLowerCase() as keyof AstrologicalSubjectModel;
        const firstHouse = this.firstSubject[houseKey] as AstrologicalSubjectModel["first_house"];
        const secondHouse = this.secondSubject[houseKey] as AstrologicalSubjectModel["first_house"];
        return circularMean(firstHouse.abs_pos, secondHouse.abs_pos);
      }),
    );

    this.firstSubject.houses_names_list.forEach((houseName, index) => {
      target[houseName.toLowerCase()] = getKerykeionPointFromDegree(houseDegreeListUt[index]!, houseName, "House");
    });

    for (const planet of this.active_points) {
      const planetKey = planet.toLowerCase() as keyof AstrologicalSubjectModel;
      const firstPoint = this.firstSubject[planetKey] as AstrologicalSubjectModel["sun"] | undefined;
      const secondPoint = this.secondSubject[planetKey] as AstrologicalSubjectModel["sun"] | undefined;
      if (!firstPoint || !secondPoint) {
        continue;
      }

      const midpoint = circularMean(firstPoint.abs_pos, secondPoint.abs_pos);
      const compositePoint = getKerykeionPointFromDegree(midpoint, planet, "AstrologicalPoint");
      compositePoint.house = getPlanetHouse(compositePoint.abs_pos, houseDegreeListUt);
      target[planetKey] = compositePoint;
    }
  }

  getMidpointCompositeSubjectModel(): CompositeSubjectModel {
    const target: Record<string, unknown> = {
      first_subject: this.firstSubject,
      second_subject: this.secondSubject,
      name: this.name,
      composite_chart_type: this.composite_chart_type,
      zodiac_type: this.zodiac_type,
      sidereal_mode: this.sidereal_mode,
      houses_system_identifier: this.houses_system_identifier,
      houses_system_name: this.houses_system_name,
      perspective_type: this.perspective_type,
      houses_names_list: this.houses_names_list,
      active_points: this.active_points,
    };

    this.calculateMidpointCompositePointsAndHouses(target);

    const sun = target.sun as AstrologicalSubjectModel["sun"] | undefined;
    const moon = target.moon as AstrologicalSubjectModel["moon"] | undefined;
    if (sun && moon) {
      target.lunar_phase = calculateMoonPhase(moon.abs_pos, sun.abs_pos);
    }

    this.model = target as unknown as CompositeSubjectModel;
    return this.model;
  }
}

const compositeSubjectFactoryCompat = CompositeSubjectFactory.prototype as CompositeSubjectFactory & {
  get_midpoint_composite_subject_model: typeof CompositeSubjectFactory.prototype.getMidpointCompositeSubjectModel;
};

compositeSubjectFactoryCompat.get_midpoint_composite_subject_model
  = CompositeSubjectFactory.prototype.getMidpointCompositeSubjectModel;

export interface CompositeSubjectFactory {
  get_midpoint_composite_subject_model: typeof CompositeSubjectFactory.prototype.getMidpointCompositeSubjectModel;
}
