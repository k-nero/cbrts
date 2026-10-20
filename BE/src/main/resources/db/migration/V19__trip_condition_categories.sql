alter table condition_logs
    drop constraint condition_logs_condition_check;

alter table condition_logs
    alter column condition type varchar(20);

alter table condition_logs
    add constraint condition_logs_condition_check check (
        condition in (
            'STABLE',
            'OFF_FEED',
            'STRESSED',
            'CLIMATE_CHANGE',
            'SOUND',
            'WATCH',
            'CONCERN'
        )
    );
