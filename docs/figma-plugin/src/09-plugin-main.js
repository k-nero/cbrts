/* ---------------------------------------------------------------------
   Main
   --------------------------------------------------------------------- */
async function main() {
  figma.notify('Building EquiFreight design system…', { timeout: 4000 });
  await cleanup();
  await loadFonts();
  buildVariables();
  buildStyles();

  var old = figma.root.children.filter(function (p) { return PAGE_NAMES.indexOf(p.name) >= 0; });
  var pages = PAGE_NAMES.map(function (n) { var p = figma.createPage(); p.name = n; return p; });
  var cover = pages[0], foundations = pages[1], components = pages[2], screens = pages[3];
  await figma.setCurrentPageAsync(components);
  pages.forEach(function (p) { p.backgrounds = [{ type: 'SOLID', color: { r: 0.035, g: 0.055, b: 0.08 } }]; });
  for (var i = 0; i < old.length; i++) { try { old[i].remove(); } catch (e) { console.warn('Could not remove old page ' + old[i].name); } }

  var board = H({ name: 'Components', gap: 40, wrap: true, rowGap: 40, pad: 80, w: DOC_W * 2 + 40 + 160, fill: 'bg/canvas' });
  buildComponents(board);
  addChartVariables();
  addAdminIcons(board.findOne(function (n) { return n.name === 'Icon grid'; }));
  buildAdminComponents(board);
  buildTableComponents(board);
  buildTrackingComponents(board);
  var toastRow = docBlock(board, 'In use', 'Toasts confirm what just happened in words that match the button that caused it.');
  var tr = H({ name: 'Toasts', gap: 16 });
  var t1 = inst(C.toast, { Tone: 'Ok' }); setP(t1, { Message: 'Load plan confirmed for CBRT-2026-041' });
  var t2 = inst(C.toast, { Tone: 'Bad' }); setP(t2, { Message: 'Departure refused: 9 items outstanding' });
  addAll(tr, [t1, t2]);
  add(toastRow, tr);
  await flush();

  await figma.setCurrentPageAsync(foundations);
  buildFoundations(foundations);
  await flush();

  await figma.setCurrentPageAsync(screens);
  var row1 = [await scrLanding(), scrHome(), scrHorses(), scrHorseProfile(), scrHorseEdit(), scrRequest1(), scrRequest2(), scrRequest3(), scrRequest4(), scrFirstRequests(), scrAddHorse()];
  var row2 = [scrQuote(), scrLoadPlan(), scrClearance(), scrAuthorities(), scrAuthoritiesOverdue(), scrRoute(), scrTripCheckpoint(), scrTripWelfare(), scrTripDelivery(), scrTripHeld()];
  row1.concat(row2).forEach(primaryTheme);
  await flush();
  var lbl1 = Tx('Owner portal', 'Display/M');
  var lbl2 = Tx('Operations', 'Display/M');
  var lbl3 = Tx('Dark mode & mobile', 'Display/M');
  [lbl1, lbl2, lbl3].forEach(function (l) { screens.appendChild(l); });
  lbl1.x = 0; lbl1.y = -120;
  place(row1, 0, 0, 120);
  var y2 = Math.max.apply(null, row1.map(function (n) { return n.height; })) + 360;
  lbl2.x = 0; lbl2.y = y2 - 120;
  place(row2, 0, y2, 120);
  var y3 = y2 + Math.max.apply(null, row2.map(function (n) { return n.height; })) + 360;
  lbl3.x = 0; lbl3.y = y3 - 120;
  var light = [altCopy(row1[0]), altCopy(row2[2]), altCopy(row2[0])];
  light.forEach(function (n) { screens.appendChild(n); });
  var mob = primaryTheme(scrHorsesMobile());
  var mobL = altCopy(mob);
  screens.appendChild(mobL);
  place(light.concat([mob, mobL]), 0, y3, 120);
  await flush();

  var admin = [scrRegulations(), scrRates(), scrDashboard(), scrUsers(), scrUsersError(), scrJobs(), scrJobsSorted(), scrReview(), scrReviewOverride(), scrBuilder(), scrBuilderBlocked(), scrDocReview(), scrDocReject(), scrIncidentHeld(), scrIncidentReport(), scrStaffNotes()];
  await flush();
  var lblA = Tx('Staff workspace · Dark', 'Display/M');
  screens.appendChild(lblA);
  var yA = y3 + Math.max.apply(null, light.map(function (n) { return n.height; })) + 360;
  lblA.x = 0; lblA.y = yA - 120;
  place(admin, 0, yA, 120);
  await flush();

  var track = [scrMyRequests(), scrTrackReview(), scrTrackInfo(), scrTrackDocs(), scrAllDocs(), scrTrackAsk(), scrDocRefused(), scrDocUpload(), scrTrackTransit(), scrTrackDelivered(), scrTrackClosed(), scrTrackReport()];
  await flush();
  var lblT = Tx('Owner · Request tracking', 'Display/M');
  screens.appendChild(lblT);
  var yT = yA + Math.max.apply(null, admin.map(function (n) { return n.height; })) + 360;
  lblT.x = 0; lblT.y = yT - 120;
  place(track, 0, yT, 120);
  await flush();

  var access = ACCESS_SCREENS.map(function (f) { return f(); }), audit = AUDIT_SCREENS.map(function (f) { return f(); });
  await flush();
  var lblX = Tx('Access · Dark', 'Display/M');
  screens.appendChild(lblX);
  var yX = yT + Math.max.apply(null, track.map(function (n) { return n.height; })) + 360;
  lblX.x = 0; lblX.y = yX - 120;
  place(access, 0, yX, 120);
  var yU = yX + AUTH_H + 360;
  var lblU = Tx('Audit log · Dark', 'Display/M');
  screens.appendChild(lblU);
  lblU.x = 0; lblU.y = yU - 120;
  place(audit, 0, yU, 120);
  await flush();

  await figma.setCurrentPageAsync(cover);
  buildCover(cover);
  await flush();
  figma.viewport.scrollAndZoomIntoView(cover.children);

  var msg = 'EquiFreight: ' + COLORS.length + ' colour variables × 2 modes, ' + STATS.components + ' components, ' + STATS.variants + ' variants, 67 screens.';
  if (FALLBACKS.length) msg += ' Font fallbacks: ' + FALLBACKS.join('; ');
  figma.closePlugin(msg);
}

main().catch(function (e) {
  console.error(e);
  figma.closePlugin('EquiFreight generator failed: ' + (e && e.message ? e.message : e));
});
