-- Keep the receiver and on-tablet signature as part of the append-only handover record.
alter table trip_records
    add column receiver_name varchar(120),
    add column receiver_signature text;

alter table trip_records
    add constraint trip_records_handover_receiver_check
        check (
            (
                kind = 'HANDED_OVER'
                and receiver_name is not null
                and btrim(receiver_name) <> ''
                and receiver_signature is not null
                and receiver_signature like 'data:image/png;base64,%'
            )
            or (
                kind <> 'HANDED_OVER'
                and receiver_name is null
                and receiver_signature is null
            )
        );
