-- US-F6-01: the escort records the handover at the destination, once: the receiver's name and confirmation, the
-- time, what was handed over, and each horse's condition and photos. The record and its conditions are trip_records
-- and condition_logs, append-only already; the handover row points at that record, and what it took from it is fixed.
alter table public.handovers
    add column handed_over_at     timestamp(6) with time zone,
    add column handover_record_id uuid
        constraint handovers_handover_record_id_fkey references public.trip_records,
    add column receiver_confirmed boolean default false not null,
    add constraint handovers_handed_over_check check (
        handed_over_at is null
            or (handover_record_id is not null and receiving_name is not null and receiver_confirmed));

-- Once handed over, who received the horses, when, and the record it rests on never change.
create function public.handovers_handover_fixed() returns trigger
    language plpgsql as
$$
begin
    if old.handed_over_at is not null and (
        new.handed_over_at is distinct from old.handed_over_at
            or new.handover_record_id is distinct from old.handover_record_id
            or new.receiving_name is distinct from old.receiving_name
            or new.receiver_confirmed is distinct from old.receiver_confirmed) then
        raise exception 'A recorded handover is append-only: % was handed over at %', old.job_id, old.handed_over_at;
    end if;
    return new;
end;
$$;

create trigger handovers_handover_fixed
    before update
    on public.handovers
    for each row
execute function public.handovers_handover_fixed();
