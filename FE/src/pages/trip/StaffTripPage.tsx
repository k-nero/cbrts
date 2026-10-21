import { TripWorkspace } from './TripWorkspace';

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
