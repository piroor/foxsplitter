/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Fox Splitter.
 *
 * The Initial Developer of the Original Code is YUKI "Piro" Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2007-2015
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):: YUKI "Piro" Hiroshi <piro.outsider.reflex@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var config = require('lib/config');

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

config.setDefault(domain+'shouldDuplicateOnSplit', true);
config.setDefault(domain+'shouldDuplicateOnDrop', false);

config.setDefault(domain+'acceptDropDelay', 500);
config.setDefault(domain+'dropZoneSize', 64);
config.setDefault(domain+'handleDragWithShiftKey', false);

config.setDefault(domain+'shouldMinimalizeUI', true);
config.setDefault(domain+'shouldAutoHideTabs', true);
config.setDefault(domain+'shouldAutoHideToolbox', true);
config.setDefault(domain+'shouldAutoHideToolbox.animation.duration', 150);
config.setDefault(domain+'shouldAutoHideToolbox.animation.delay', 300);
config.setDefault(domain+'shouldAutoHideToolbox.collapsedHeight', 16);
config.setDefault(domain+'shouldScrollToSplitPosition', true);
config.setDefault(domain+'shouldKeepSizeRatioOnResize', true);

config.setDefault(domain+'syncScrollX', true);
config.setDefault(domain+'syncScrollY', true);

config.setDefault(domain+'fixMispositoning', true);
config.setDefault(domain+'draggableAppButton', true);

config.setDefault(domain+'importTabsFromClosedSibling', FoxSplitterConst.IMPORT_ONLY_HIDDEN);
config.setDefault(domain+'hiddenUIInMemberWindow', FoxSplitterConst.HIDE_MENUBAR |
                                                     FoxSplitterConst.HIDE_BOOKMARKS |
                                                     FoxSplitterConst.HIDE_EXTRA |
                                                     FoxSplitterConst.HIDE_NON_NAVIGATION_ITEMS |
                                                     FoxSplitterConst.HIDE_EXTRA_TOOLBARS);

config.setDefault(domain+'generalButton.split.position', FoxSplitterConst.POSITION_RIGHT);
config.setDefault(domain+'appMenu.split', true);
config.setDefault(domain+'appMenu.split.position', FoxSplitterConst.POSITION_RIGHT);
config.setDefault(domain+'viewMenu.split', true);
config.setDefault(domain+'context.splitFromLink', true);
config.setDefault(domain+'context.splitFromFrame', true);
config.setDefault(domain+'context.splitFromTab.move', true);
config.setDefault(domain+'context.splitFromTab.duplicate', true);
config.setDefault(domain+'context.gatherWindows', true);
config.setDefault(domain+'selection.splitToTop', true);
config.setDefault(domain+'selection.splitToRight', true);
config.setDefault(domain+'selection.splitToBottom', true);
config.setDefault(domain+'selection.splitToLeft', true);
config.setDefault(domain+'selection.grid', true);
config.setDefault(domain+'selection.x', true);
config.setDefault(domain+'selection.y', true);

config.setDefault(domain+'shortcut.splitTabToTop', '');
config.setDefault(domain+'shortcut.splitTabToRight',
	FoxSplitterConst.OS == 'Darwin' ? 'ctrl-"' : // compatible to XCode's one
	''
);
config.setDefault(domain+'shortcut.splitTabToBottom',
	FoxSplitterConst.OS == 'Darwin' ? 'alt-ctrl-"' : // compatible to XCode's one
	''
);
config.setDefault(domain+'shortcut.splitTabToLeft', '');
config.setDefault(domain+'shortcut.grid', '');
config.setDefault(domain+'shortcut.x', '');
config.setDefault(domain+'shortcut.y', '');
config.setDefault(domain+'shortcut.gather', '');

config.setDefault(domain+'platformOffset.needToBeUpdated', FoxSplitterConst.OS == 'Linux');
config.setDefault(domain+'platformOffset.x', 0);
config.setDefault(domain+'platformOffset.y', 0);
config.setDefault(domain+'platformOffset.width', 0);
config.setDefault(domain+'platformOffset.height', 0);

config.setDefault(domain+'methodToRaiseWindow',
	FoxSplitterConst.OS == 'WINNT' ?
		FoxSplitterConst.RAISE_WINDOW_BY_RAISED_FLAG :
	FoxSplitterConst.OS == 'Linux' && FoxSplitterConst.IS_GECKO_2 ?
		FoxSplitterConst.RAISE_WINDOW_BY_WMCTRL :
		FoxSplitterConst.RAISE_WINDOW_BY_FOCUS );
config.setDefault(domain+'wmctrl.path', '');
config.setDefault(domain+'wmctrl.alertNotFound', true);

config.setDefault(domain+'debug.all', false);
config.setDefault(domain+'debug.base', false);
config.setDefault(domain+'debug.window', false);
config.setDefault(domain+'debug.group', false);
config.setDefault(domain+'debug.ui', false);

config.setDefault('extensions.multipletab.show.foxsplitter-selection-split-top',    true);
config.setDefault('extensions.multipletab.show.foxsplitter-selection-split-right',  true);
config.setDefault('extensions.multipletab.show.foxsplitter-selection-split-bottom', true);
config.setDefault('extensions.multipletab.show.foxsplitter-selection-split-left',   true);
config.setDefault('extensions.multipletab.show.foxsplitter-selection-tile-grid',    true);
config.setDefault('extensions.multipletab.show.foxsplitter-selection-tile-x',       true);
config.setDefault('extensions.multipletab.show.foxsplitter-selection-tile-y',       true);

