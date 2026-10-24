# Notification centre: solution draft

Draft for [US-00-07] (k-nero/cbrts#9), 20 Oct 2026. Open questions settled the same day (§9).

> As any user I want my notifications in one place so that I never miss an action expected of me.
>
> - In-app notification centre with unread count and mark-as-read
> - The same events are also sent by e-mail
> - Each notification links to the record it is about

## 0. What shipped in PR 1 (23 Oct 2026)

PR 1 (backend core) follows §3 and §5, adjusted to the conventions that changed after this draft (the V1 squash, native enums, static mappers):

- **Migration `V4__notification_centre.sql`**, not V19. `kind` and `entity_type` are native enum types (`NotificationKind`, `NotificationSubject`), as AGENTS.md now requires for every Java enum, so a new kind needs `alter type NotificationKind add value`. Legacy rows are typed and backfilled (`entity_code`, `link_path`); rows whose kind or record can't be resolved are dropped.
- **No `tone` column.** The tone comes from the kind (`NotificationKind.tone()`), using the design system's tones (`OK`, `WARN`, `BAD`, `INFO`, `NEUTRAL`).
- **No e-mail columns yet.** `email_state` and `email_attempts` arrive with the outbox in PR 3, so PR 1 doesn't leave rows `PENDING` with nothing to send them.
- **Audiences:** `ClubAccounts` (skips `DISABLED`), `RoleHolders` (active holders), `StaffMembers` and `Escorts` (named people, such as a job's specialist or crew). Since US-F1-07 jobs have a named specialist and coordinator, so approval notifies them directly rather than by role.
- **Every existing caller moved to `notify(...)`**: 11 call sites, not 2. The authority's request for more information is `AUTHORITY_INFO_REQUIRED` and goes to the club's accounts. `DOSSIER_LATE` uses the dedupe key `DOSSIER_LATE:{submissionId}`, so the daily repeat stays one unread row.
- **API:** `GET /api/v1/me/notifications?unread=true|false`, `GET /unread-count`, `POST /{id}/read` (404 for anyone else's id), `POST /read-all`. The mapper is a static `NotificationMapper`, as AGENTS.md asks, not MapStruct.
- **§7 note:** AGENTS.md now forbids a native `<button>` in a page; the bell belongs in `components/ui` (where a native button is allowed) or uses the `ui` Button.
- **Customer links** open `/requests/{id}/submitted` (or `/quotation`): the portal has no `/requests/{id}` route.

### Live updates and the frontend (23 Oct 2026)

E-mail (PR 3) is on hold; the centre is in-app only for now.

- **Live count over server-sent events, not polling or WebSockets.** `GET /api/v1/me/notifications/stream` (`text/event-stream`) holds one `SseEmitter` per tab in `NotificationStream`. After the transaction that wrote or read a notification commits, it sends a bare `changed` event to that person's tabs (a rollback sends nothing); the tab refetches what it shows. A 25 s comment heartbeat (`NotificationStreamHeartbeatJob`) keeps proxies from closing idle streams, and `X-Accel-Buffering: no` stops nginx buffering. The stream is one-way and reuses the JWT filter, so it needs no STOMP broker. Async dispatches are permitted in security (`DispatcherType.ASYNC`), since the request was authorised when the stream opened.
- **One instance only.** The emitters live in that JVM's memory. A second backend instance would need Postgres `LISTEN/NOTIFY` (or a broker) to fan `changed` out to the instance holding the tab.
- **Frontend.** `EventSource` can't send the bearer header, so `useNotificationStream` reads the stream with `@microsoft/fetch-event-source`. On 401 it lets the axios refresh renew the token and reopens; on a drop it retries after 10 s. The bell (`NotificationBell`, built on `ui/IconButton`) sits in the owner header and the staff top bar, opens `NotificationPanel` (Unread / All, 8 newest) and links to the page at `/notifications` and `/staff/notifications`. DESIGN.md's "Notification centre" entry is the visual reference until a Figma frame is drawn.

## 1. Where we are (20 Oct 2026, before PR 1)

| Piece | State |
|---|---|
| `notifications` table (V11) | Exists: `user_id`, `kind`, `title`, `body`, `entity_type`, `entity_id`, `read_at`, `emailed_at`, index `(user_id, read_at)` |
| `Notification` entity, `NotificationRepository` | Exist: paged list by user and an unread count |
| `NotificationService.sendNotification(...)` | Exists. It inserts one row. Kind, entity type and text are free strings |
| Callers | Two: `RequestReviewService.returnForInformation` (to every club account) and `AuthoritySubmissionService` on `ADDITIONAL_INFO` (to the request's creator only) |
| API, FE bell, e-mail | None. There is no `spring-boot-starter-mail` and no mail sender |

## 2. Two things the design must keep apart

1. **The bell is not the sidebar badge.** DESIGN.md, Staff sidebar, says a badge "only counts items where this person owns the next step, uses the page's own number" (4 awaiting review, 2 missing). Those counts come from the queues themselves and drop when the work is done. The bell is a **feed of things that happened**, and its count drops when you *read* the items. If the badge is driven from notifications, it will show "3" after the work is finished. So: badges keep querying their queues, and the bell reads `notifications`.
2. **A notification is not evidence.** The audit log is the legal record. A notification is a pointer to a record. That means notifications can be deleted after a while, de-duplicated and re-worded. They never stand in for an audit row.

## 3. Recommended architecture

```
 service method (same @Transactional)
   ├─ change domain state
   ├─ audit.recordDecision(...)
   └─ notifications.notify(kind, audience, subject, title, body)
          │  resolves audience → users, renders link, inserts N rows
          ▼
   notifications table ──(read by)──► GET /api/v1/me/notifications  ◄── FE bell (polls 30 s)
          │
          │ email_state = PENDING
          ▼
   NotificationEmailJob (@Scheduled, every 15 s)
          └─ JavaMailSender → SMTP (Mailpit locally) → SENT / FAILED
```

**Call the service directly in the caller's transaction. Don't publish Spring events.** If the transaction rolls back, there's no notification, and that's what we want. Today's two callers already work this way. An `ApplicationEventPublisher` + `@TransactionalEventListener` would decouple the code, but we have no second consumer that needs it. It also turns "did the row get written?" into a question about listener phases.

**The table is the e-mail outbox.** We never send mail inside the request transaction: it's slow, and if the tx rolls back after an SMTP send, the e-mail has gone out about something that didn't happen. The row is committed with `email_state = PENDING`, and a scheduled job sends it afterwards. This is the transactional-outbox pattern; the closest analog is a Go worker draining a jobs table with `SELECT … FOR UPDATE SKIP LOCKED`. It sits next to the existing `job/OrphanFileCleanupJob` and `job/RefreshTokenCleanupJob`.

**Use polling, not SSE or WebSocket, for v1.** The API authenticates with a bearer JWT in the `Authorization` header, and the browser `EventSource` can't send headers. SSE would need a token in the query string or a cookie, and WebSocket would need STOMP plus a second security config. At demo scale, a 30 s `refetchInterval` on the unread count costs nothing. Anything urgent also goes out by e-mail. Since the table is the source either way, we can add `SseEmitter` later without changing the schema.

## 4. Data model change (V19)

```sql
-- Domain K (§13): notification centre — typed links, e-mail outbox, de-duplication.
alter table notifications
    add column link_path      varchar(200),
    add column entity_code    varchar(20),
    add column tone           varchar(8)  not null default 'INFO',
    add column email_state    varchar(8)  not null default 'SKIPPED'
        constraint notifications_email_state_check
            check (email_state in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
    add column email_attempts smallint    not null default 0,
    add column dedupe_key     varchar(120);

create index notifications_email_pending_idx
    on notifications (created_at) where email_state = 'PENDING';

-- One unread row per (user, thing). A repeat bumps it instead of stacking.
create unique index notifications_user_dedupe_uidx
    on notifications (user_id, dedupe_key) where read_at is null and dedupe_key is not null;
```

- **`link_path` is resolved on the server.** The e-mail needs an absolute URL, so the backend has to know the route anyway. Resolving it once per row means the FE and the e-mail agree, and the FE needs no route map keyed by entity type. The path depends on the recipient. The same quotation is `/requests/{id}/quotation` for the club and `/staff/requests/{id}` for the manager. That's why it's resolved per recipient, not per event.
- **`entity_code`** (`CBRT-2026-014`, `REQ-2026-0031`) is shown in the row in DM Mono. Without it we'd need a join per row.
- **`kind` gets no CHECK constraint, on purpose.** The `PaymentMethod` pattern needs a migration to drop and recreate the constraint for every new enum value. Notifications will gain kinds in every flow PR, and they aren't legal data. The Java enum (`@Enumerated(STRING)`) is the guard.
- **De-dupe.** The gate re-runs every time dates, the catalog or horses change. Without `dedupe_key` (for example `DOC_RED:{checklistItemId}`), one date edit would post a stack of identical rows. On conflict we update `title`, `body` and `created_at` and move the row to the top.

## 5. Backend shape

```java
// entity/enums/NotificationKind.java
public enum NotificationKind {
    // kind                       tone              e-mail
    REQUEST_INFO_REQUIRED       (Tone.ACTION, true),
    QUOTATION_ISSUED            (Tone.ACTION, true),
    DOCUMENT_REJECTED           (Tone.BAD,    true),
    TRIP_HELD                   (Tone.BAD,    true),
    DOCUMENT_UPLOADED           (Tone.INFO,   false), // the specialist's queue badge already covers it
    ...;
    final Tone tone; final boolean emails;
}

// service/notification/Audience.java
public sealed interface Audience {
    record ClubAccounts(UUID clubId) implements Audience {}   // every active account of the club
    record StaffRole(RoleName role) implements Audience {}    // everyone holding the role
    record OneUser(User user) implements Audience {}           // e.g. the escort assigned to a crew
}

// service/notification/Subject.java — what the notification is about
public record Subject(EntityType type, UUID id, String code) {}
```

```java
// NotificationService: replaces sendNotification(...)
@Transactional(propagation = MANDATORY) // must run inside the caller's tx
public void notify(NotificationKind kind, Audience audience, Subject subject,
                   String title, String body, @Nullable String dedupeKey) {
    for (User recipient : audiences.resolve(audience)) {          // skips removed/disabled accounts
        upsert(recipient, kind, subject, links.pathFor(subject, recipient), title, body, dedupeKey,
               kind.emails ? EmailState.PENDING : EmailState.SKIPPED);
    }
}
```

The caller writes the text, not a template, because product voice is specific to each situation ("REQ-2026-0031 needs your answer", followed by the manager's note). The kind only decides tone, e-mail, and which icon the bell shows.

**API** (`controller/MeNotificationController`, `/api/v1/me/notifications`, any signed-in user, always scoped to `me`):

| Method | Path | Returns |
|---|---|---|
| GET | `?state=unread\|all&page=&size=20` | `Page<NotificationResponse>`, newest first (`Pageable`, as AGENTS.md asks) |
| GET | `/unread-count` | `{ "count": 3 }` |
| POST | `/{id}/read` | 204. Another user's id returns **404**, not 403, so the endpoint can't be used to probe for ids |
| POST | `/read-all` | `{ "updated": 7 }` |

`NotificationResponse(id, kind, tone, title, body, entityCode, linkPath, createdAt, readAt)` is a record with a MapStruct mapper, in the same style as the recent `refactor/model-mappers` work.

**E-mail** (`job/NotificationEmailJob`):
- Every 15 s it picks up to 50 `PENDING` rows with `FOR UPDATE SKIP LOCKED` (native query), sends each one and sets `SENT` + `emailed_at`. On failure it increments `email_attempts` and gives up as `FAILED` after 5 tries.
- Subject: `{entity_code}: {title}`. Body: plain text plus a minimal HTML part with the body and one "Open in EquiFreight" link to `${app.web-base-url}${link_path}`. There's no attachment and no price, because the link leads to the record.
- Add `spring-boot-starter-mail`, plus **Mailpit** in `docker-compose.yml` (SMTP :1025, web UI :8025) so local runs catch every mail. If `spring.mail.host` isn't set (unit tests, CI), a `LoggingMailSender` bean logs the e-mail instead of failing.
- The same sender can later carry the account-token e-mails (`VERIFY_EMAIL`, `STAFF_INVITE`, `RESET_PASSWORD`).

**Scheduled kinds** (`job/NotificationSweepJob`, hourly). These are things that become true just because time passes: a quotation expiring in 24 h, an authority response overdue, an invoice overdue. The `dedupe_key` (for example `Q_EXPIRING:{quotationId}`) makes the hourly re-run idempotent.

**Retention.** `RefreshTokenCleanupJob`'s sibling deletes read rows older than 180 days. Unread rows are kept.

## 6. Event catalog (first cut)

There's no per-job staff owner column yet, so staff audiences fan out by role.

| Kind | Raised by | To | E-mail | Opens |
|---|---|---|---|---|
| `REQUEST_SUBMITTED` | `RequestService.submit` | Logistics managers | no (queue badge) | Request review |
| `REQUEST_INFO_REQUIRED` | `RequestReviewService.returnForInformation` *(exists)* | Club accounts | yes | Request |
| `REQUEST_REJECTED` | review decision | Club accounts | yes | Request |
| `QUOTATION_ISSUED` | quotation issue | Club accounts | yes | Quotation |
| `QUOTATION_EXPIRING` | sweep, 24 h before validity ends | Club accounts | yes | Quotation |
| `QUOTATION_ACCEPTED` / `_DECLINED` | customer decision | Logistics managers | no | Request review |
| `REQUEST_APPROVED` | final approval (job created) | Club accounts; fleet coordinators | club yes | Job / tracking |
| `DOCUMENT_UPLOADED` | customer upload / replace | Transport specialists | no | Document review |
| `DOCUMENT_REJECTED` | document review | Club accounts | yes | Document (reason verbatim) |
| `DOCUMENT_VALIDITY_RED` | gate re-run turns an item RED | Club accounts; specialists | club yes | Checklist item |
| `DOCUMENTS_DUE` *(built, US-F2-02)* | `DocumentReminderJob`, 08:00 Vietnam time, 7, 3 and 1 days before an item the club holds is due; one notice per job and due day, dedupe `DOCUMENTS_DUE:{jobId}:{dueDate}` | Club accounts | yes | All documents (`/requests/{id}/documents`) |
| `AUTHORITY_INFO_REQUIRED` | `AuthoritySubmissionService` *(exists as `ADDITIONAL_INFO_REQUIRED`)* | Club accounts | yes | Clearance |
| `AUTHORITY_OVERDUE` | sweep | Specialists; logistics managers | yes | Authorities tab |
| `CLEARANCE_READY` | dossier reaches `CLEARANCE_READY` | Club accounts; fleet coordinators | club yes | Clearance |
| `CREW_ASSIGNED` | `CrewAssignmentService.assignCrew` | The assigned escort | yes (no header on the cab surface) | Cab trip |
| `TRIP_DEPARTED` / `TRIP_DELIVERED` | trip records | Club accounts | yes | Tracking |
| `TRIP_HELD` | trip record "Held" | Logistics managers; club accounts | yes | Trip / incident |
| `TRIP_SHARED` *(built, US-F3-14)* | `RoutePlanService.confirmRoutePlan`, when the confirmed trip carries the job and another job and the trip's last confirmed route didn't share it; dedupe `TRIP_SHARED:{jobId}:{routePlanId}` | Club accounts | yes | Tracking (`/tracking?job={code}`) |
| `TRIP_TIMES_CHANGED` *(built, US-F3-14)* | the same confirmation, when the job already had times and they moved, or it came from another trip; dedupe `TRIP_TIMES_CHANGED:{jobId}:{routePlanId}` | Club accounts | yes | Tracking |
| `INCIDENT_RAISED` *(built, US-F5-01)* | `IncidentService.raiseFromCab` | The incident's owner and the job's coordinator (every coordinator when the job has none) | yes (an escalation) | Incident (`/staff/incidents/{id}`) |
| `INCIDENT_PROPOSAL` *(built, US-F5-02)* | `IncidentService.propose` | The incident's owner | yes (an escalation) | Incident |
| `INCIDENT_DECIDED` *(built, US-F5-03)* | `IncidentService.decide` | Whoever proposed it and the coordinator; the trip's crew; the job's specialist when documents turned red | no | Incident / cab / checklist |
| `INCIDENT_RETURNED` *(built, US-F5-03)* | `IncidentService.returnProposal` | Whoever proposed it | no | Incident |
| `INCIDENT_UPDATE` *(built, US-F5-03)* | `IncidentService.decide`; the manager's message as written; dedupe `INCIDENT_UPDATE:{incidentId}` | Club accounts | yes | Tracking |
| `DELAY_ALERT` *(built, US-F5-04)* | `IncidentService.sendDelayAlert`; the reason and the new arrival, the note only to the job's own club; dedupe `DELAY_ALERT:{jobId}:{incidentId}` for clubs | Every club on the trip; the trip's crew; the owner and the coordinator, unless they sent it | yes | Tracking / cab / incident |
| `INCIDENT_RESOLVED` *(built, US-F5-05)* | `IncidentService.resolve`; the resolution | The coordinator, whoever proposed and the owner, unless they closed it; the escort who reported it | no | Incident / cab |
| `HANDOVER_ACCEPTED` *(built, US-F6-02)* | `HandoverService.accept`, or `acceptByDefault` when the customer didn't answer by the due time | The manager who approved the job and its coordinator | no | Job |
| `JOB_REPLANNED` *(built, US-F3-14)* | `TripSharingService.takeOff`, before departure, when the job had been given times; dedupe `JOB_REPLANNED:{jobId}:{tripId}` | Club accounts | yes | Tracking |
| `INVOICE_ISSUED` *(built, US-F6-03)* | `InvoiceService`: the deposit at acceptance, the final invoice when the manager issues it | Club accounts | yes | Invoice (`/requests/{id}/invoices/{invoiceId}`) |
| `PAYMENT_RECORDED` *(built, US-F6-03)* | `InvoiceService.recordPayment` | Club accounts | yes | Invoice |
| `INVOICE_OVERDUE` | sweep (not built) | Club accounts | yes | Invoice |
| `NOTE_ROUTED` / `NOTE_ANSWERED` | customer notes | Routed role / club accounts | answered yes | Note |

The rule behind the e-mail column: **customers get e-mail for anything that asks something of them or changes their move. Staff get e-mail only for escalations.** Routine staff work already shows up in their queues and badges.

## 7. Frontend

- `apis/notification.ts` and `hooks/notification.ts`:
  - `useUnreadCount()`: React Query, `refetchInterval: 30_000`, `refetchOnWindowFocus: true`. The load plan already uses `refetchInterval`.
  - `useNotifications(state)`: infinite query.
  - `useMarkRead()` / `useMarkAllRead()`: optimistic; they decrement the count and stamp `readAt`, and roll back on error.
- `components/NotificationBell.tsx`: a native `<button>`, not AntD `Button`, because AntD's runtime CSS overrides Tailwind (see the SlotTile bug). It has a bell icon and a count chip that hides at 0 and reads `99+` above 99. Its accessible name says what it counts: "Notifications, 3 unread".
  - Owner header: between **Request transport** and the theme toggle.
  - Staff top bar: at the right end, opposite the breadcrumb.
- **Panel** (a popover, about 400 wide, max 560 tall, scrolls):
  - Head: "Notifications" and a Ghost "Mark all as read".
  - Tabs: Unread / All. It opens on Unread when there's anything unread.
  - Row: a tone icon (status in words *and* colour, never colour alone), the title, the body clamped to 2 lines, the code in Mono, then "2 h ago" with the absolute time in a tooltip. An unread row has a dot and the raised surface.
  - Clicking a row marks it read and navigates to `linkPath`.
  - Empty state: "You're all caught up. New requests, documents and trip updates will show here."
  - Foot: "See all notifications" goes to a full page, `/notifications` and `/staff/notifications`. The page reuses the list-table kit (tabs, a Kind select, 20 per page).
- **Design gap:** DESIGN.md and the Figma file have no bell or panel. Per CLAUDE.md, a frame needs to be added to the Owner and Staff rows (closed, open with items, empty), plus a DESIGN.md entry, before or with the FE PR.

## 8. Delivery plan (PRs)

1. **BE core:** V19, `NotificationKind`/`Audience`/`Subject`, `notify()`, link resolver, `/me/notifications` API. Retrofit the two existing callers. Both go to `ClubAccounts`, and `ADDITIONAL_INFO_REQUIRED` becomes `AUTHORITY_INFO_REQUIRED`. Unit tests: audience fan-out skips removed users, de-dupe upsert, another user's id gives 404.
2. **FE bell + panel + page**, behind the new Figma frame. Browser-verify as a club user and as Yến.
3. **E-mail outbox:** mail starter, Mailpit in compose, `NotificationEmailJob`, `LoggingMailSender` fallback. Test with a fake `JavaMailSender`: PENDING becomes SENT, and FAILED after 5 attempts.
4. **Wire the catalog flow by flow.** Each flow PR adds its kinds. `NotificationSweepJob` lands with the first time-based kind.

This closes the three acceptance criteria after PRs 1–3. PR 4 is ongoing.

## 9. Decisions (settled 20 Oct 2026)

1. **Customer notifications go to every active club account.** The club is the customer. `Audience.ClubAccounts` skips removed and disabled accounts. In PR 1, the authority-info caller changes from the request's creator to `ClubAccounts`, so both existing callers agree.
2. **Staff notifications fan out by role.** No per-job owner columns for now; the demo has one person per role. If jobs later get `assigned_specialist_id` / `assigned_coordinator_id`, only `Audience` resolution changes (owner if set, else the role). Callers stay the same.
3. **No notification settings in v1.** Everyone gets the catalog in §6 as defined. There's no mute and no e-mail opt-out. Legal and clearance notices must not be mutable, so any future setting covers FYI kinds only.
4. **One e-mail per event; a digest can come later.** `dedupe_key` already collapses repeats on the same item. A digest would only change `NotificationEmailJob` (group a user's `PENDING` rows older than N minutes into one mail), with no schema change.
