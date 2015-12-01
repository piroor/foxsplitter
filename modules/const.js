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
 * Portions created by the Initial Developer are Copyright (C) 2007-2012
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

var Cc = Components.classes;
var Ci = Components.interfaces;
const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);
const Comparator = Cc['@mozilla.org/xpcom/version-comparator;1']
					.getService(Ci.nsIVersionComparator);

var EXPORTED_SYMBOLS = ['FoxSplitterConst'];

var FoxSplitterConst = {
	domain         : 'extensions.foxsplitter@piro.sakura.ne.jp.',
	IMAGES_VERSION : 3,
	PREFS_VERSION  : 1,

	OS         : XULAppInfo.OS,
	IS_GECKO_2 : Comparator.compare(XULAppInfo.version, '4.0') >= 0,

	ATTACHED_POSITION : 'foxsplitter-attached-position',
	MAIN              : 'foxsplitter-main-window',
	ACTIVE            : 'foxsplitter-active',
	STRETCHED         : 'foxsplitter-stretched',
	MEMBER            : 'foxsplitter-member-window',
	HOVER             : 'foxsplitter-hover',
	STATE             : 'foxsplitter-state',
	TOGGLE_MODE       : 'foxsplitter-toggle-mode',
	CHROMEHIDDEN      : 'foxsplitter-chromehidden',
	ID                : 'foxsplitter-id',
	SYNC_SCROLL       : 'foxsplitter-syncScroll',
	SCROLLED_X        : 'foxsplitter-scrolled-x',
	SCROLLED_Y        : 'foxsplitter-scrolled-y',

	DROP_INDICATOR : 'foxsplitter-drop-indicator',
	TOOLBAR_ITEM   : 'foxsplitter-toolbar-item',
	MENU_ITEM      : 'foxsplitter-menuitem',

	EVENT_TYPE_READY                : 'nsDOMFoxSplitterReady',
	EVENT_TYPE_WINDOW_STATE_CHANGED : 'nsDOMFoxSplitterWindowStateChange',
	EVENT_TYPE_SPLIT                : 'nsDOMFoxSplitterSplit',
	EVENT_TYPE_UNSPLIT              : 'nsDOMFoxSplitterUnsplit',
	// compatible to old versions
	EVENT_TYPE_CONTENT_SPLIT_REQUEST   : 'SubBrowserAddRequestFromContent',
	EVENT_TYPE_CONTENT_UNSPLIT_REQUEST : 'SubBrowserRemoveRequestFromContent',

	STATE_MAXIMIZED  : Ci.nsIDOMChromeWindow.STATE_MAXIMIZED,
	STATE_MINIMIZED  : Ci.nsIDOMChromeWindow.STATE_MINIMIZED,
	STATE_NORMAL     : Ci.nsIDOMChromeWindow.STATE_NORMAL,
	STATE_FULLSCREEN : Ci.nsIDOMChromeWindow.STATE_FULLSCREEN,

	// compatible to old implementation
	POSITION_TOP    : (1 << 2),
	POSITION_RIGHT  : (1 << 1),
	POSITION_BOTTOM : (1 << 3),
	POSITION_LEFT   : (1 << 0),

	POSITION_HORIZONTAL : (1 << 0) | (1 << 1),
	POSITION_VERTICAL   : (1 << 2) | (1 << 3),
	POSITION_BEFORE     : (1 << 0) | (1 << 2),
	POSITION_AFTER      : (1 << 1) | (1 << 3),

	POSITION_VALID   : (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3),
	POSITION_INVALID : 0,

	POSITION_OUTSIDE : (1 << 4),
	POSITION_INSIDE  : (1 << 5),

	// compatible to old implementation
	TILE_MODE_GRID   : 0,
	TILE_MODE_X_AXIS : (1 << 0),
	TILE_MODE_Y_AXIS : (1 << 1),

	IMPORT_NOTHING     : 0,
	IMPORT_ALL         : 1,
	IMPORT_ONLY_HIDDEN : 2,

	HIDE_MENUBAR   : (1 << 0),
	HIDE_TOOLBAR   : (1 << 1),
	HIDE_LOCATION  : (1 << 2),
	HIDE_BOOKMARKS : (1 << 3),
	HIDE_STATUS    : (1 << 4),
	HIDE_EXTRA     : (1 << 5),
	HIDE_NON_NAVIGATION_ITEMS : (1 << 6),
	HIDE_EXTRA_TOOLBARS       : (1 << 7),

	RAISE_WINDOW_BY_FOCUS       : 0,
	RAISE_WINDOW_BY_RAISED_FLAG : 1,
	RAISE_WINDOW_BY_WMCTRL      : 2,
	RAISE_WINDOW_BY_XLIB        : 3,
	DO_NOT_RAISE_WINDOW         : -1,

	WINDOW_DROP_TYPE : 'application/x-foxsplitter-window',
	TAB_DROP_TYPE    : 'application/x-moz-tabbrowser-tab',
	LINK_DROP_TYPES  : [
		'text/uri-list',
		'text/x-moz-text-internal',
		'text/x-moz-url',
		'text/plain',
		'application/x-moz-file'
	],

	// opacity=0 panel isn't shown on Linux
	MIN_OPACITY : (XULAppInfo.OS == 'Linux' ? '0.01' : '0' ),
	// too small window isn't shown on Linux
	MIN_WIDTH : 16,
	MIN_HEIGHT : 16,


	REASON_WINDOW_CLOSE : 1,
	REASON_QUIT : 2,

	CONTENT_SCRIPT : 'chrome://foxsplitter/content/content-utils.js',
	MESSAGE_TYPE     : 'foxsplitter',
	COMMAND_SHUTDOWN : 'shutdown',
	COMMAND_REQUEST_UPDATE_SYNC_STATE   : 'request-update-sync-state',
	COMMAND_REQUEST_APPLY_SCROLL_FACTOR : 'request-apply-scroll-factor',
	COMMAND_REPORT_PAGE_SCROLLED        : 'report-page-scrolled'
};
