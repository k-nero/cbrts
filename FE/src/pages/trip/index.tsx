import { TripWorkspace } from './TripWorkspace';

export function CustomerTripPage() {
  return (
    <TripWorkspace
      audience="customer"
      title="Trip tracking"
      summary="Follow recorded checkpoints and horse condition updates for your club's trips."
    />
  );
}
export function StaffTripPage() {
  return (
    <TripWorkspace
      audience="staff"
      editable
      title="Trip progress"
      summary="Track journeys and record progress by confirmed route checkpoint."
    />
  );
}
export function EscortTripPage() {
  return (
    <TripWorkspace
      audience="escort"
      editable
      title="Cab trip log"
      summary="Record assigned trip checkpoints and each horse's observed condition."
    />
  );
}
