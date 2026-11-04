/* ---------------------------------------------------------------------
   Main: the plugin runs the same entries as the MCP route (04-mcp.js),
   in the same order, in one go. build.sh lists them in PLUGIN_ENTRIES
   from build-mcp.sh, so both routes build the same file. Each entry
   rehydrates its registries from the file, as it does in a fresh
   use_figma call.
   --------------------------------------------------------------------- */
async function main() {
  var out = null;
  for (var i = 0; i < PLUGIN_ENTRIES.length; i++) {
    var entry = PLUGIN_ENTRIES[i];
    figma.notify('EquiFreight ' + (i + 1) + '/' + PLUGIN_ENTRIES.length + ': ' + entry.name, { timeout: 3000 });
    out = await entry();
  }
  if (out && out.loose && out.loose.length) {
    figma.closePlugin('EquiFreight generator failed: frames that fit no canvas row: ' + out.loose.join(', '));
    return;
  }
  var msg = 'EquiFreight: ' + COLORS.length + ' colour variables × 2 modes, ' + STATS.components + ' components, ' + STATS.variants + ' variants.';
  if (FALLBACKS.length) msg += ' Font fallbacks: ' + FALLBACKS.join('; ');
  figma.closePlugin(msg);
}

main().catch(function (e) {
  console.error(e);
  figma.closePlugin('EquiFreight generator failed: ' + (e && e.message ? e.message : e));
});
