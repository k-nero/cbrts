/**
 * The horses a trailer's grooms look after, counted as the API does (CrewAssignmentService.horsesOn): every horse
 * on the trip while it has one trailer, else only the horses placed on this one. Before any are placed on a lone
 * trailer, the job's own horses stand in.
 */
export const horsesForCrew = (placedOnTrailer: number, convoy: boolean, jobHorses: number) =>
  convoy || placedOnTrailer > 0 ? placedOnTrailer : jobHorses;

/** One groom per three horses, rounded up (US-F3-06). */
export const groomsRequired = (horses: number) => Math.ceil(horses / 3);
