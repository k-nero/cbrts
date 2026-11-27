-- A horse's profile photo (Flow 1). One file belongs to one record, hence unique.
alter table horses
    add column photo_file_id uuid unique references files (id);
