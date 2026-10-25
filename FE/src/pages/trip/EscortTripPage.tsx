import { TripWorkspace } from './TripWorkspace';

export function EscortTripPage() {
  return (
    <TripWorkspace
      audience="escort"
      editable
      title="Trip log"
      summary="Record assigned trip checkpoints and each horse's observed condition."
    />
  );
}
