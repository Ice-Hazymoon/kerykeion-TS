import type { AstrologicalPoint, House } from "../schemas/literals";
import type { AstrologicalSubjectModel, PlanetReturnModel, PointInHouseModel } from "../schemas/models";
import { DEFAULT_ACTIVE_POINTS } from "../settings/config-constants";
import { getHouseNumber, getHousesList, getPlanetHouse } from "../utilities";

type SubjectLike = AstrologicalSubjectModel | PlanetReturnModel;

export function calculatePointsInReciprocalHouses(
  pointSubject: SubjectLike,
  houseSubject: SubjectLike,
  activePoints: AstrologicalPoint[] = DEFAULT_ACTIVE_POINTS,
): PointInHouseModel[] {
  const pointsInHouses: PointInHouseModel[] = [];
  const celestialPoints = [];

  for (const point of pointSubject.active_points) {
    if (!activePoints.includes(point)) {
      continue;
    }

    const pointObject = pointSubject[point.toLowerCase() as keyof SubjectLike];
    if (pointObject != null) {
      celestialPoints.push(pointObject as AstrologicalSubjectModel["sun"]);
    }
  }

  const houseCusps = [
    houseSubject.first_house.abs_pos,
    houseSubject.second_house.abs_pos,
    houseSubject.third_house.abs_pos,
    houseSubject.fourth_house.abs_pos,
    houseSubject.fifth_house.abs_pos,
    houseSubject.sixth_house.abs_pos,
    houseSubject.seventh_house.abs_pos,
    houseSubject.eighth_house.abs_pos,
    houseSubject.ninth_house.abs_pos,
    houseSubject.tenth_house.abs_pos,
    houseSubject.eleventh_house.abs_pos,
    houseSubject.twelfth_house.abs_pos,
  ];

  const pointSubjectHouseCusps = [
    pointSubject.first_house.abs_pos,
    pointSubject.second_house.abs_pos,
    pointSubject.third_house.abs_pos,
    pointSubject.fourth_house.abs_pos,
    pointSubject.fifth_house.abs_pos,
    pointSubject.sixth_house.abs_pos,
    pointSubject.seventh_house.abs_pos,
    pointSubject.eighth_house.abs_pos,
    pointSubject.ninth_house.abs_pos,
    pointSubject.tenth_house.abs_pos,
    pointSubject.eleventh_house.abs_pos,
    pointSubject.twelfth_house.abs_pos,
  ];

  for (const point of celestialPoints) {
    if (point == null) {
      continue;
    }
    const houseName = getPlanetHouse(point.abs_pos, houseCusps);
    const pointOwnerHouseName = getPlanetHouse(point.abs_pos, pointSubjectHouseCusps);

    pointsInHouses.push({
      point_name: point.name,
      point_degree: point.position,
      point_sign: point.sign,
      point_owner_name: pointSubject.name,
      point_owner_house_name: pointOwnerHouseName,
      point_owner_house_number: getHouseNumber(pointOwnerHouseName),
      projected_house_number: getHouseNumber(houseName),
      projected_house_name: houseName,
      projected_house_owner_name: houseSubject.name,
    });
  }

  return pointsInHouses;
}

export function calculateCuspsInReciprocalHouses(
  cuspSubject: SubjectLike,
  houseSubject: SubjectLike,
): PointInHouseModel[] {
  const cuspsInHouses: PointInHouseModel[] = [];
  const cuspSubjectHouses = getHousesList(cuspSubject);
  const houseSubjectCusps = getHousesList(houseSubject).map(house => house.abs_pos);

  for (const cusp of cuspSubjectHouses) {
    let projectedHouseName: string;
    try {
      projectedHouseName = getPlanetHouse(cusp.abs_pos, houseSubjectCusps);
    }
    catch {
      continue;
    }

    const projectedHouseNumber = getHouseNumber(projectedHouseName as House);
    const match = cusp.name.match(/\d+/);
    const cuspHouseNumber = match ? Number(match[0]) : 1;

    cuspsInHouses.push({
      point_name: cusp.name,
      point_degree: cusp.position,
      point_sign: cusp.sign,
      point_owner_name: cuspSubject.name,
      point_owner_house_number: cuspHouseNumber,
      point_owner_house_name: cusp.name,
      projected_house_number: projectedHouseNumber,
      projected_house_name: projectedHouseName,
      projected_house_owner_name: houseSubject.name,
    });
  }

  return cuspsInHouses;
}
