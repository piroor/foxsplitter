var config = require('lib/config');

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);

config.setDefault(domain+'shouldDuplicateOnSplit', true);
config.setDefault(domain+'shouldDuplicateOnDrop', false);

config.setDefault(domain+'acceptDropDelay', 500);
config.setDefault(domain+'dropZoneSize', 64);
config.setDefault(domain+'handleDragWithShiftKey', false);

config.setDefault(domain+'shouldMinimalizeUI', true);
config.setDefault(domain+'shouldAutoHideTabs', true);

config.setDefault(domain+'syncScrollX', true);
config.setDefault(domain+'syncScrollY', true);

config.setDefault(domain+'fixMispositoning', true);

config.setDefault(domain+'importTabsFromClosedSibling', FoxSplitterConst.IMPORT_ONLY_HIDDEN);
config.setDefault(domain+'hiddenUIInInactiveWindow', FoxSplitterConst.HIDE_MENUBAR |
                                                     FoxSplitterConst.HIDE_BOOKMARKS |
                                                     FoxSplitterConst.HIDE_EXTRA |
                                                     FoxSplitterConst.HIDE_NON_NAVIGATION_ITEMS);

config.setDefault(domain+'generalButton.split.position', FoxSplitterConst.POSITION_RIGHT);
config.setDefault(domain+'appMenu.split', true);
config.setDefault(domain+'appMenu.split.position', FoxSplitterConst.POSITION_RIGHT);
config.setDefault(domain+'viewMenu.split', true);
config.setDefault(domain+'context.splitFromLink', true);
config.setDefault(domain+'context.splitFromFrame', true);
config.setDefault(domain+'context.splitFromTab.move', true);
config.setDefault(domain+'context.splitFromTab.duplicate', true);
config.setDefault(domain+'context.gatherWindows', true);
config.setDefault(domain+'selection.grid', true);
config.setDefault(domain+'selection.x', true);
config.setDefault(domain+'selection.y', true);

config.setDefault(domain+'shortcut.splitTabToTop', '');
config.setDefault(domain+'shortcut.splitTabToRight',
	XULAppInfo.OS == 'Darwin' ? 'ctrl-"' : // compatible to XCode's one
	''
);
config.setDefault(domain+'shortcut.splitTabToBottom',
	XULAppInfo.OS == 'Darwin' ? 'alt-ctrl-"' : // compatible to XCode's one
	''
);
config.setDefault(domain+'shortcut.splitTabToLeft', '');

config.setDefault(domain+'platformOffset.needToBeUpdated', XULAppInfo.OS == 'Linux');

config.setDefault('extensions.multipletab.show.foxsplitter-selection-tile-grid', true);
config.setDefault('extensions.multipletab.show.foxsplitter-selection-tile-x',    true);
config.setDefault('extensions.multipletab.show.foxsplitter-selection-tile-y',    true);

