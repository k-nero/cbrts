/* =====================================================================
   Access: sign in, create a club account, accept a staff invite, reset
   a password. One door for customers and staff; the account decides
   where it lands. No nav, no marketing: the brand, the form, and a
   sunken panel that explains this particular case in words.
   ===================================================================== */
var AUTH_H = 900;              // the desktop viewport the access pages are drawn at
var AUTH_FORM = 440;           // form column width
var PW = '••••••••••••••';     // a 14-character password, drawn masked
var PW_RULE = 'At least 12 characters.';
var INVITE = { name: 'Bùi Anh Thư', email: 'thu.bui@equifreight.vn', role: 'Transport specialist', by: 'Vũ Hải Yến, logistics manager', sent: '25 Sep 2026, 10:14', until: '2 Oct 2026' };
var CUSTOMER_EMAIL = 'bookings@saigonturf.vn';

function authBar() {
  var bar = H({ name: 'Top bar', main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [0, 40, 0, 40], h: 64 });
  borderSide(bar, 'border/default', 'bottom');
  addAll(bar, [brand(), btn('Ghost', 'SM', 'Help', { lead: 'info' })]);
  return bar;
}
/* title and a one-paragraph summary, left-aligned over the form */
function authHead(title, summary) {
  var h = VV({ name: 'Head', gap: 12 });
  addAll(h, [Tx(title, 'Display/L', 'text/primary', { name: 'Title', w: AUTH_FORM }), Tx(summary, 'Body/M', 'text/secondary', { name: 'Summary', w: AUTH_FORM })]);
  return h;
}
function authForm(head, blocks) {
  var f = VV({ name: 'Form', gap: 32, w: AUTH_FORM });
  var fields = VV({ name: 'Fields', gap: 20 });
  blocks.forEach(function (b) { if (b) add(fields, fillW(b)); });
  addAll(f, [fillW(head), fillW(fields)]);
  return f;
}
/* a text row with a link-like Ghost action: "New to EquiFreight? Create an account" */
function authAlt(text, action, icon) {
  var r = H({ name: 'Alternative', gap: 4, cross: 'CENTER' });
  addAll(r, [Tx(text, 'Body/S', 'text/secondary'), btn('Ghost', 'SM', action, icon ? { trail: icon } : {})]);
  return r;
}
function authCheck(label, on) { var cb = inst(C.checkbox, { Checked: on ? 'True' : 'False' }); setP(cb, { Label: label }); cb.name = 'Check · ' + label; return cb; }
/* the page: two columns (form, then a sunken explanation) or one centred column */
function authScreen(name, form, aside, o) {
  o = o || {};
  var s = VV({ name: name, w: SCREEN_W, fill: 'bg/canvas' });
  add(s, fillW(authBar()));
  var body;
  if (aside) {
    body = H({ name: 'Body' });
    var left = VV({ name: 'Form column', w: 720, pad: [96, 120, 64, 160] });
    add(left, form);
    var right;
    if (o.photo) {
      /* a photograph, so Dark mode and a scrim from the bottom; the list sits on the dark end */
      right = photoPanel({ key: o.photo, dir: 'V', gap: 28, pad: [96, 120, 64, 96], main: 'MAX', vertical: true, scrim: [[0, NAVY + '00'], [0.3, NAVY + '26'], [0.55, NAVY + 'B3'], [1, NAVY + 'F5']] });
      right.name = 'Aside · Photo · ' + o.photo;
    } else {
      right = VV({ name: 'Aside', gap: 28, pad: [96, 120, 64, 96], fill: 'bg/sunken' });
      right.strokes = [P('border/default')]; right.strokeAlign = 'INSIDE';
      right.strokeTopWeight = 0; right.strokeBottomWeight = 0; right.strokeRightWeight = 0; right.strokeLeftWeight = 1;
    }
    aside.forEach(function (a) { add(right, a); });
    addAll(body, [left, fillW(right)]);
    right.layoutSizingVertical = 'FILL';
  } else {
    body = VV({ name: 'Body', cross: 'CENTER', pad: [120, 0, 64, 0] });
    add(body, form);
  }
  add(s, fillW(body));
  add(s, fillW(footer('Compact', o.asOf)));
  if (!o.tall) { s.resize(SCREEN_W, AUTH_H); s.layoutSizingVertical = 'FIXED'; body.layoutSizingVertical = 'FILL'; }
  return s;
}
/* the sunken side: a heading, then rows separated by hairlines (never cards) */
function asideList(title, rows, o) {
  o = o || {};
  var v = VV({ name: title, gap: 0, w: 480 });
  add(v, VV({ name: 'Title', gap: 6, pad: [0, 0, 16, 0] }, [Tx(title, 'Heading/H3')].concat(o.sub ? [Tx(o.sub, 'Body/S', 'text/secondary', { w: 480 })] : [])));
  rows.forEach(function (r, i) {
    var row = H({ name: r[0], gap: 14, pad: [14, 0, 14, 0], cross: 'MIN' });
    borderSide(row, 'border/default', 'top');
    if (o.numbered) {
      var cur = o.current === i, done = o.current > i;
      var n = H({ name: 'N', w: 28, h: 28, radius: 999, stroke: cur ? 'text/primary' : 'border/strong', fill: done ? 'status/ok/bg' : null, main: 'CENTER', cross: 'CENTER' });
      add(n, done ? Ic('check', 14, 'status/ok/fg') : Tx(String(i + 1), 'Mono/Caption', cur ? 'text/primary' : 'text/tertiary'));
      add(row, n);
    } else if (r[2]) add(row, Ic(r[2], 20, 'text/tertiary'));
    var t = VV({ name: 'Text', gap: 2 });
    add(t, Tx(r[0], 'Label/M'));
    if (!o.compact) add(t, Tx(r[1], 'Body/S', 'text/secondary', { fill: true }));
    add(row, fillW(t));
    add(v, fillW(row));
  });
  return v;
}
var ACCOUNT_KEEPS = [
  ['What you owe, and by when', 'Every upload and answer we need from you, sorted by deadline, each with its due date.', 'clock'],
  ['Documents checked against your travel dates', 'Each test and certificate is checked against the day the horse travels, not the day you upload it.', 'file'],
  ['Quotations you can read line by line', 'Every line says how it was worked out. You accept or decline in one place.', 'tag'],
  ['Your horses, entered once', 'Passport details, size and handling needs are reused on every move.', 'check']
];
/* on the photograph only the four titles are shown, so the list stays on the dark end of the scrim */
function signInAside() { return [asideList('One account for every move', ACCOUNT_KEEPS, { compact: true })]; }

/* ---------- Sign in ---------- */
function signInForm(o) {
  o = o || {};
  var blocks = [];
  if (o.locked) blocks.push(callout('Bad', 'Signing in is locked for 15 minutes', 'After 5 failed attempts we pause sign-in for this email. You can still reset your password now; a reset unlocks the account.'));
  blocks.push(input('Text', o.locked ? 'Disabled' : 'Default', 'Email', CUSTOMER_EMAIL, null));
  blocks.push(input('Password', o.locked ? 'Disabled' : o.error ? 'Error' : 'Focus', 'Password', o.error ? '•••••••••' : PW, o.error ? 'Email or password doesn’t match. 3 attempts left before a 15-minute lock.' : null));
  var opts = H({ name: 'Options', main: 'SPACE_BETWEEN', cross: 'CENTER' });
  add(opts, authCheck('Keep me signed in on this device', false));
  if (!o.locked) add(opts, btn('Ghost', 'SM', 'Forgot password?')); // when locked, reset is the gold action below
  blocks.push(opts);
  if (o.locked) {
    var row = H({ name: 'Locked until', gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [12, 16, 12, 16], radius: 8, fill: 'bg/sunken' });
    var d = VV({ name: 'Due', gap: 2, cross: 'MAX' });
    addAll(d, [Tx('Unlocks in 12 min', 'Label/S', 'status/bad/fg', { align: 'RIGHT' }), Tx('14:32', 'Mono/Caption', 'text/tertiary', { align: 'RIGHT' })]);
    addAll(row, [Tx('Sign in again', 'Body/S', 'text/secondary'), d]);
    blocks.push(row);
    blocks.push(btn('Primary', 'MD', 'Reset password', { fill: true }));
    blocks.push(btn('Secondary', 'MD', 'Sign in', { fill: true, state: 'Disabled' }));
  } else blocks.push(btn('Primary', 'MD', 'Sign in', { fill: true }));
  blocks.push(divider());
  blocks.push(authAlt('New to EquiFreight?', 'Create a club account', 'arrow-right'));
  blocks.push(Tx('Staff sign in here too, with the email your invite was sent to. Your role decides where you land.', 'Body/S', 'text/tertiary', { fill: true }));
  return authForm(authHead('Sign in', 'One sign-in for racing clubs and EquiFreight staff.'), blocks);
}
function scrSignIn() { return authScreen('Access · Sign in', signInForm(), signInAside(), { photo: 'Sign in' }); }
function scrSignInError() { return authScreen('Access · Sign in · Wrong password', signInForm({ error: true }), signInAside(), { photo: 'Sign in' }); }
function scrSignInLocked() { return authScreen('Access · Sign in · Locked', signInForm({ locked: true }), signInAside(), { asOf: '26 Sep 2026, 14:20', tall: true, photo: 'Sign in' }); } // the lock notice and its two actions need more than 900

/* ---------- Create a club account ---------- */
var NEXT_STEPS = [
  ['Confirm your email', 'Open the link we send. It works for 24 hours.'],
  ['Add your horses', 'Name, microchip, size and temperament. About 3 minutes each.'],
  ['Request transport', 'You see an indicative range straight away, then an itemised quotation within 1 business day. Nothing to pay until you accept one.']
];
function formGroup(title, fields) {
  var g = VV({ name: title, gap: 14, pad: [18, 0, 0, 0] });
  borderSide(g, 'border/default', 'top');
  add(g, Tx(title, 'Heading/H4'));
  fields.forEach(function (f) { add(g, fillW(f)); });
  return g;
}
function pair(a, b) { var r = H({ name: 'Fields', gap: 16, cross: 'MIN' }); addAll(r, [fillW(a), fillW(b)]); return r; }
function scrSignUp() {
  var club = formGroup('Your club', [pair(input('Text', 'Default', 'Club or owner name', 'Đà Lạt Highland Stables', null), input('Select', 'Default', 'Country', 'Vietnam', null))]);
  var contact = formGroup('You', [input('Text', 'Default', 'Your name', 'Phạm Minh Đức', null), pair(input('Text', 'Default', 'Email', 'duc@dalathighland.vn', null), input('Text', 'Default', 'Phone', '+84 90 812 3456', null))]);
  var pw = formGroup('Password', [input('Password', 'Focus', 'Password', PW, PW_RULE + ' Yours has 14.')]);
  var terms = H({ name: 'Terms', gap: 4, cross: 'CENTER' });
  addAll(terms, [authCheck('I agree to the terms of service', false), btn('Ghost', 'SM', 'Read the terms')]);
  var form = authForm(authHead('Create a club account', 'For racing clubs and horse owners. Staff accounts come by invite from your logistics manager.'),
    [club, contact, pw, terms, btn('Primary', 'MD', 'Create account', { fill: true }), divider(), authAlt('Already have an account?', 'Sign in')]);
  var s = authScreen('Access · Create account', form, [asideList('What happens next', NEXT_STEPS, { numbered: true, current: 0 })], { tall: true });
  return s;
}
function scrSignUpSent() {
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Secondary', 'MD', 'Send the link again'), btn('Ghost', 'MD', 'Use a different email')]);
  var form = authForm(authHead('Check your email', 'We sent a confirmation link to duc@dalathighland.vn. Open it on any device to finish setting up Đà Lạt Highland Stables.'),
    [dlRowAuth('Link works until', '27 Sep 2026, 11:05'), acts, Tx('Nothing arrived after 5 minutes? Check spam, or send the link again.', 'Body/S', 'text/tertiary', { fill: true })]);
  return authScreen('Access · Create account · Check your email', form, [asideList('What happens next', NEXT_STEPS, { numbered: true, current: 0 })], { asOf: '26 Sep 2026, 11:05' });
}
function dlRowAuth(label, value) {
  var r = H({ name: label, gap: 16, main: 'SPACE_BETWEEN', cross: 'CENTER', pad: [12, 16, 12, 16], radius: 8, fill: 'bg/sunken' });
  addAll(r, [Tx(label, 'Body/S', 'text/secondary'), Tx(value, 'Mono/Data', 'text/primary')]);
  return r;
}

/* ---------- Staff invite ---------- */
/* the role on offer, in the words Users & roles uses, plus the sidebar it will see */
function inviteAside(expired) {
  var v = VV({ name: 'Role', gap: 20, w: 480 });
  var tag = chip('Neutral', INVITE.role, { noDot: true }); tag.name = 'Role tag';
  var head = VV({ name: 'Title', gap: 10 });
  addAll(head, [tag, Tx('What a transport specialist does here', 'Heading/H3'), Tx('The same rights listed in Users & roles. They take effect when you set your password.', 'Body/S', 'text/secondary', { w: 480 })]);
  add(v, fillW(head));
  var caps = VV({ name: 'Can', gap: 0 });
  CAPS.filter(function (c) { return c[1][2]; }).forEach(function (c) {
    var r = H({ name: c[0], gap: 12, pad: [11, 0, 11, 0], cross: 'CENTER' });
    borderSide(r, 'border/default', 'top');
    addAll(r, [Ic('check', 16, 'status/ok/fg'), Tx(c[0], 'Body/S', 'text/primary', { fill: true })]);
    add(caps, fillW(r));
  });
  add(v, fillW(caps));
  var nav = VV({ name: 'Your sidebar', gap: 6 });
  addAll(nav, [Tx('Your sidebar', 'Label/S', 'text/secondary'), Tx(ROLE_NAV[INVITE.role].items.join(' · '), 'Body/S', 'text/primary', { w: 480 })]);
  add(v, fillW(nav));
  var by = VV({ name: 'Invited by', gap: 4, pad: [16, 0, 0, 0] });
  borderSide(by, 'border/default', 'top');
  addAll(by, [stamp(INVITE.sent, 'Invited by ' + INVITE.by), Tx(expired ? 'Expired ' + INVITE.until + '.' : 'Wrong role? Ask Yến to change it before you set a password.', 'Body/S', 'text/tertiary', { w: 480 })]);
  add(v, fillW(by));
  return [v];
}
function scrInvite() {
  var form = authForm(authHead('Set up your staff account', 'Vũ Hải Yến, logistics manager, invited you to EquiFreight as a transport specialist.'), [
    input('Text', 'Default', 'Your name', INVITE.name, null),
    input('Text', 'Disabled', 'Email', INVITE.email, 'Set by your invite. You sign in with it.'),
    input('Password', 'Focus', 'Password', PW, PW_RULE),
    dlRowAuth('Invite works until', INVITE.until),
    btn('Primary', 'MD', 'Set password and sign in', { fill: true })]);
  return authScreen('Access · Staff invite', form, inviteAside(false), { asOf: '27 Sep 2026' });
}
function scrInviteExpired() {
  var form = authForm(authHead('This invite has expired', 'Invites work for 7 days. This one was sent on 25 Sep and ended on 2 Oct.'), [
    callout('Warn', 'Ask Vũ Hải Yến for a new invite', 'She can resend it from Users & roles. Your email stays ' + INVITE.email + ', and nothing was set up yet, so nothing is lost.'),
    btn('Primary', 'MD', 'Ask Yến to resend', { fill: true }),
    authAlt('Already set a password?', 'Sign in')]);
  return authScreen('Access · Staff invite · Expired', form, inviteAside(true), { asOf: '3 Oct 2026' });
}

/* ---------- Reset a password (one centred column) ---------- */
function scrResetRequest() {
  return authScreen('Access · Reset password', authForm(authHead('Reset your password', 'Enter the email you sign in with. We’ll send a link that works for 1 hour.'), [
    input('Text', 'Focus', 'Email', CUSTOMER_EMAIL, null),
    btn('Primary', 'MD', 'Send reset link', { fill: true }),
    btn('Ghost', 'MD', 'Back to sign in', { lead: 'arrow-left' })]), null);
}
function scrResetSent() {
  var acts = H({ name: 'Actions', gap: 12, cross: 'CENTER' });
  addAll(acts, [btn('Secondary', 'MD', 'Send the link again'), btn('Ghost', 'MD', 'Back to sign in')]);
  return authScreen('Access · Reset password · Link sent', authForm(authHead('Check your email', 'If an account uses ' + CUSTOMER_EMAIL + ', a reset link is on its way.'), [
    dlRowAuth('Link works until', '26 Sep 2026, 10:12'), acts]), null, { asOf: '26 Sep 2026, 09:12' });
}
function scrResetNew() {
  return authScreen('Access · Reset password · New password', authForm(authHead('Choose a new password', 'For ' + CUSTOMER_EMAIL + '.'), [
    input('Password', 'Error', 'New password', '•••••••••', PW_RULE + ' Yours has 9.'),
    authCheck('Sign out of other devices', true),
    btn('Primary', 'MD', 'Save password and sign in', { fill: true })]), null, { asOf: '26 Sep 2026, 09:20' });
}
function scrResetExpired() {
  return authScreen('Access · Reset password · Link expired', authForm(authHead('This reset link has expired', 'Links work for 1 hour. This one was sent at 09:12 and ended at 10:12. Your password hasn’t changed.'), [
    btn('Primary', 'MD', 'Send a new link', { fill: true }),
    btn('Ghost', 'MD', 'Back to sign in', { lead: 'arrow-left' })]), null, { asOf: '26 Sep 2026, 10:40' });
}
var ACCESS_SCREENS = [scrSignIn, scrSignInError, scrSignInLocked, scrSignUp, scrSignUpSent, scrInvite, scrInviteExpired, scrResetRequest, scrResetSent, scrResetNew, scrResetExpired];
