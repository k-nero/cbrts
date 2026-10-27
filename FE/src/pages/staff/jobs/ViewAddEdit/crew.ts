/**
 * The horses a trailer's grooms look after, counted as the API does (CrewAssignmentService.horsesOn): every horse
 * on the trip while it has one trailer, else only the horses placed on this one. Before any are placed on a lone
 * trailer, the job's own horses stand in.
 */
export const horsesForCrew = (placedOnTrailer: number, convoy: boolean, jobHorses: number) =>
  convoy || placedOnTrailer > 0 ? placedOnTrailer : jobHorses;

/** One groom per three horses, rounded up (US-F3-06). */
export const groomsRequired = (horses: number) => Math.ceil(horses / 3);

/**
 * The horses on a trip's flight: every job's on it, as the API counts them for its flying grooms (US-F3-15). With
 * no other job on the trip, this job's own.
 */
export const horsesOnFlight = (tripJobHorses: readonly number[], jobHorses: number) =>
  tripJobHorses.length > 0 ? tripJobHorses.reduce((sum, n) => sum + n, 0) : jobHorses;
