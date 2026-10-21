-- Preserve legacy condition values while adding the categories required by Flow 4.
alter table condition_logs
    alter column condition type varchar(20);

alter table condition_logs
    drop constraint condition_logs_condition_check;

alter table condition_logs
    add constraint condition_logs_condition_check
        check (condition in ('SOUND', 'WATCH', 'CONCERN', 'STABLE', 'OFF_FEED', 'STRESSED', 'CLIMATE_CHANGE'));
