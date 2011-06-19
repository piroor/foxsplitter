var config = require('lib/config');

load('base');

const base = 'extensions.foxsplitter@piro.sakura.ne.jp.';

config.setDefault(base+'dropZoneSize', 64);
config.setDefault(base+'handleDragWithShiftKey', false);

config.setDefault(base+'shouldMinimalizeUI', true);
config.setDefault(base+'shouldAutoHideTabs', true);

config.setDefault(base+'syncScrollX', true);
config.setDefault(base+'syncScrollY', true);

config.setDefault(base+'fixMispositoning', true);

config.setDefault(base+'importTabsFromClosedSibling', FoxSplitterBase.prototype.IMPORT_ONLY_HIDDEN);

config.setDefault('extensions.multipletab.show.multipletab-selection-foxsplitter-layout-grid', true);
config.setDefault('extensions.multipletab.show.multipletab-selection-foxsplitter-layout-x',    true);
config.setDefault('extensions.multipletab.show.multipletab-selection-foxsplitter-layout-y',    true);

