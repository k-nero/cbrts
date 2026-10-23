-- A customer note can carry one attached file (an insurer's email, a vet's letter), which staff open from the
-- Customer notes page.
alter table public.notes
    add column attached_file_id uuid
        constraint notes_attached_file_id_fkey
            references public.files;
