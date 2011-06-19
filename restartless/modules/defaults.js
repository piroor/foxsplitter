var config = require('lib/config');

config.setDefault("foxsplitter.tab.closetab",         false);
config.setDefault("foxsplitter.tabs.autoHide",        true);

config.setDefault("foxsplitter.syncScroll.mainArea",   true);
config.setDefault("foxsplitter.syncScroll.vertical",   true);
config.setDefault("foxsplitter.syncScroll.horizontal", true);

// 0 = always, 1 = only with modifier key
config.setDefault("foxsplitter.show.addbuttons.hover.type",     0);
config.setDefault("foxsplitter.show.addbuttons.dragdrop",       true);
config.setDefault("foxsplitter.show.toolbar.always",            true);
config.setDefault("foxsplitter.show.toolbar.navigation.always", false);
config.setDefault("foxsplitter.show.syncScroll",                true);
config.setDefault("foxsplitter.show.collapseexpand",            false);

config.setDefault("foxsplitter.show.menu",                    true);
config.setDefault("foxsplitter.show.tab.context.split",       true);
config.setDefault("foxsplitter.show.tab.context.layout.grid", true);
config.setDefault("foxsplitter.show.tab.context.layout.x",    false);
config.setDefault("foxsplitter.show.tab.context.layout.y",    false);
config.setDefault("foxsplitter.show.tab.context.gather",      true);

config.setDefault("foxsplitter.appearance.scrollbar.size",  16);
config.setDefault("foxsplitter.appearance.addbuttons.size", 16);
config.setDefault("foxsplitter.appearance.addbuttons.area", 150);

config.setDefault("foxsplitter.delay.addbuttons.show", 500);
config.setDefault("foxsplitter.delay.addbuttons.hide", 2450);
config.setDefault("foxsplitter.delay.addbuttons.fade", 250);
config.setDefault("foxsplitter.delay.subbrowser.toolbar.show", 800);
config.setDefault("foxsplitter.delay.subbrowser.toolbar.hide", 4000);

config.setDefault("extensions.multipletab.show.multipletab-selection-foxsplitter-layout-grid", true);
config.setDefault("extensions.multipletab.show.multipletab-selection-foxsplitter-layout-x",    true);
config.setDefault("extensions.multipletab.show.multipletab-selection-foxsplitter-layout-y",    true);

