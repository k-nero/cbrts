-- US-F1-09: a move from or to a city we don't cross the border from rides a domestic road leg to the hub, the city a
-- cross-border corridor starts or ends in. The request keeps that corridor in corridor_id, and the domestic legs
-- before and after it here. Both are null for a move between two cities a corridor joins, so existing requests are
-- unchanged.

alter table public.transport_requests
    add column first_leg_corridor_id uuid references public.corridors (id),
    add column last_leg_corridor_id  uuid references public.corridors (id);
