var config = require('lib/config');

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

config.setDefault(domain+'dropZoneSize', 64);
config.setDefault(domain+'handleDragWithShiftKey', false);

config.setDefault(domain+'shouldMinimalizeUI', true);
config.setDefault(domain+'shouldAutoHideTabs', true);

config.setDefault(domain+'syncScrollX', true);
config.setDefault(domain+'syncScrollY', true);

config.setDefault(domain+'fixMispositoning', true);

config.setDefault(domain+'importTabsFromClosedSibling', FoxSplitterConst.IMPORT_ONLY_HIDDEN);

config.setDefault('extensions.multipletab.show.multipletab-selection-foxsplitter-layout-grid', true);
config.setDefault('extensions.multipletab.show.multipletab-selection-foxsplitter-layout-x',    true);
config.setDefault('extensions.multipletab.show.multipletab-selection-foxsplitter-layout-y',    true);

