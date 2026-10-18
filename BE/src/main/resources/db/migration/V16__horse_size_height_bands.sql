-- US-F1-00 (#12): the server derives a horse's size class from its height (spec H-03).
-- Demo bands: a class runs from its own minimum up to the next class's minimum.
alter table horse_size_classes
    add column min_height_hh numeric(3, 1);
update horse_size_classes
set min_height_hh = case code when 'S' then 10.0 when 'M' then 14.3 when 'L' then 16.3 when 'XL' then 17.3 end;
alter table horse_size_classes
    alter column min_height_hh set not null;
alter table horse_size_classes
    add constraint horse_size_classes_min_height_hh_key unique (min_height_hh);
