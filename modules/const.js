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
 * The Initial Developer of the Original Code is Fox Splitter.
 * Portions created by the Initial Developer are Copyright (C) 2007-2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):: SHIMODA Hiroshi <piro.outsider.reflex@gmail.com>
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

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);
const Comparator = Cc['@mozilla.org/xpcom/version-comparator;1']
					.getService(Ci.nsIVersionComparator);

var exports = {
	domain         : 'extensions.foxsplitter@piro.sakura.ne.jp.',
	IMAGES_VERSION : 2,
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


	NON_NAVIGATION_ITEM_CLASS : <![CDATA[
		unified-back-forward-button
		urlbar-container
		reload-button
		stop-button
		fullscreenflex
		window-controls
		foxsplitter-general-button
		foxsplitter-syncScroll-button
	]]>.toString()
		.replace(/^\s+|\s+$/g, '')
		.split(/\s+/)
		.map(function(aId) {
			return ':not(#'+aId+')';
		})
		.join(''),

	STYLESHEET : <![CDATA[
		:root[%CHROMEHIDDEN%~="menubar"] .chromeclass-menubar,
		:root[%CHROMEHIDDEN%~="directories"] .chromeclass-directories,
		:root[%CHROMEHIDDEN%~="status"] .chromeclass-status,
		:root[%CHROMEHIDDEN%~="extrachrome"] .chromeclass-extrachrome:not(#sidebar-box),
		:root[%CHROMEHIDDEN%~="extrachrome"] #browser > .chromeclass-extrachrome#sidebar-box, /* Don't hide floating sidebar (by Ez Sidebar) */
		:root[%CHROMEHIDDEN%~="location"] .chromeclass-location,
		:root[%CHROMEHIDDEN%~="location"][chromehidden~="toolbar"] .chromeclass-toolbar,
		:root[%CHROMEHIDDEN%~="toolbar"] .chromeclass-toolbar-additional,
		:root[%CHROMEHIDDEN%~="toolbar-non-navigation-items"] toolbar[customizable="true"] toolbarseparator,
		:root[%CHROMEHIDDEN%~="toolbar-non-navigation-items"] toolbar[customizable="true"] toolbarspring,
		:root[%CHROMEHIDDEN%~="toolbar-non-navigation-items"] toolbar#nav-bar > *%NON_NAVIGATION_ITEM_CLASS%,
		:root[%CHROMEHIDDEN%~="extra-toolbars"] toolbar:not(#toolbar-menubar):not(#nav-bar):not(#PersonalToolbar):not(#TabsToolbar) {
			visibility: collapse;
			-moz-user-focus: none;
		}

		.%DROP_INDICATOR% {
			appearance: none;
			-moz-appearance: none;
			background: rgba(0, 0, 0, 0.75);
			border: 0 solid rgba(255, 255, 255, 0.75);
			border-radius: 0;
			-moz-border-radius: 0;
			border-radius: 0;
			box-align: center;
			-moz-box-align: center;
			box-pack: center;
			-moz-box-pack: center;
			line-height: 0;
			margin: 0;
			opacity: %MIN_OPACITY%;
			padding: 0;
			transition: opacity 0.25s ease-in;
			-moz-transition: opacity 0.25s ease-in;
		}

		.%DROP_INDICATOR%.top {
			border-top-width: 1px;
		}
		.%DROP_INDICATOR%.right {
			border-right-width: 1px;
		}
		.%DROP_INDICATOR%.bottom {
			border-bottom-width: 1px;
		}
		.%DROP_INDICATOR%.left {
			border-left-width: 1px;
		}

		.%DROP_INDICATOR% label {
			color: white;
			line-height: 0;
			margin: 0;
			min-height: 0;
			min-width: 0;
			padding: 0;
		}

		.toolbarbutton-1.%TOOLBAR_ITEM%,
		#foxsplitter-syncScroll-button {
			list-style-image: url("resource://foxsplitter-resources/modules/images/icon16.png?%IMAGES_VERSION%") !important;
			-moz-image-region: rect(0 16px 16px 0);
		}

		toolbox[iconsize="large"] .toolbarbutton-1.%TOOLBAR_ITEM%.platform-Linux {
			list-style-image: url("resource://foxsplitter-resources/modules/images/icon24.png?%IMAGES_VERSION%") !important;
			-moz-image-region: rect(0 24px 24px 0);
		}

		.%MENU_ITEM%.menuitem-iconic,
		.%MENU_ITEM%.menu-iconic,
		.%MENU_ITEM%[iconic="true"] {
			list-style-image: url("resource://foxsplitter-resources/modules/images/icon16.png?%IMAGES_VERSION%") !important;
			-moz-image-region: rect(0 16px 16px 0);
		}
		.%MENU_ITEM%.split                         { -moz-image-region: rect(0 16px 16px 0); }
		.%MENU_ITEM%.split[disabled="true"]        { -moz-image-region: rect(16px 16px 32px 0); }
		.%MENU_ITEM%.closeAll                      { -moz-image-region: rect(0 32px 16px 16px); }
		.%MENU_ITEM%.closeAll[disabled="true"]     { -moz-image-region: rect(16px 32px 32px 16px); }
		.%MENU_ITEM%.gather                        { -moz-image-region: rect(0 48px 16px 32px); }
		.%MENU_ITEM%.gather[disabled="true"]       { -moz-image-region: rect(16px 48px 32px 32px); }
		.%MENU_ITEM%.tile-grid                     { -moz-image-region: rect(0 64px 16px 48px); }
		.%MENU_ITEM%.tile-grid[disabled="true"]    { -moz-image-region: rect(16px 64px 32px 48px); }
		.%MENU_ITEM%.tile-x                        { -moz-image-region: rect(0 80px 16px 64px); }
		.%MENU_ITEM%.tile-x[disabled="true"]       { -moz-image-region: rect(16px 80px 32px 64px); }
		.%MENU_ITEM%.tile-y                        { -moz-image-region: rect(0 96px 16px 80px); }
		.%MENU_ITEM%.tile-y[disabled="true"]       { -moz-image-region: rect(16px 96px 32px 80px); }
		.%MENU_ITEM%.split-top                     { -moz-image-region: rect(0 144px 16px 128px); }
		.%MENU_ITEM%.split-top[disabled="true"]    { -moz-image-region: rect(16px 144px 32px 128px); }
		.%MENU_ITEM%.split-right                   { -moz-image-region: rect(0 160px 16px 144px); }
		.%MENU_ITEM%.split-right[disabled="true"]  { -moz-image-region: rect(16px 160px 32px 144px); }
		.%MENU_ITEM%.split-bottom                  { -moz-image-region: rect(0 176px 16px 160px); }
		.%MENU_ITEM%.split-bottom[disabled="true"] { -moz-image-region: rect(16px 176px 32px 160px); }
		.%MENU_ITEM%.split-left                    { -moz-image-region: rect(0 192px 16px 176px); }
		.%MENU_ITEM%.split-left[disabled="true"]   { -moz-image-region: rect(16px 192px 32px 176px); }
		.%MENU_ITEM%.toggleStretched[%TOGGLE_MODE%="stretch"]                  { -moz-image-region: rect(0 208px 16px 192px); }
		.%MENU_ITEM%.toggleStretched[%TOGGLE_MODE%="stretch"][disabled="true"] { -moz-image-region: rect(16px 208px 32px 192px); }
		.%MENU_ITEM%.toggleStretched[%TOGGLE_MODE%="shrink"]                   { -moz-image-region: rect(0 224px 16px 208px); }
		.%MENU_ITEM%.toggleStretched[%TOGGLE_MODE%="shrink"][disabled="true"]  { -moz-image-region: rect(16px 224px 32px 208px); }

		:root:not([%MEMBER%="true"]) toolbox:not([customizing="true"]) #foxsplitter-syncScroll-button {
			visibility: collapse;
		}
		#foxsplitter-syncScroll-button                 { -moz-image-region: rect(0 112px 16px 96px); }
		#foxsplitter-syncScroll-button[checked="true"] { -moz-image-region: rect(0 128px 16px 112px); }
		#foxsplitter-toggleStretched-button[%TOGGLE_MODE%="stretch"]                 { -moz-image-region: rect(0 208px 16px 192px); }
		#foxsplitter-toggleStretched-button[%TOGGLE_MODE%="stretch"][checked="true"] { -moz-image-region: rect(16px 208px 32px 192px); }
		#foxsplitter-toggleStretched-button[%TOGGLE_MODE%="shrink"]                  { -moz-image-region: rect(0 224px 16px 208px); }
		#foxsplitter-toggleStretched-button[%TOGGLE_MODE%="shrink"][checked="true"]  { -moz-image-region: rect(16px 224px 32px 208px); }

		/* shrink appmenu button */
		:root[%MEMBER%="true"]:not([%MAIN%="true"]):not([%STRETCHED%="true"]) #appmenu-button {
			padding-left: 0.7em;
			padding-right: 0.7em;
			min-width: 0;
		}
		:root[%MEMBER%="true"]:not([%MAIN%="true"]):not([%STRETCHED%="true"]) #appmenu-button > .box-inherit dropmarker {
			margin: 0;
		}
		:root[%MEMBER%="true"]:not([%MAIN%="true"]):not([%STRETCHED%="true"]) #appmenu-button > .box-inherit .button-text {
			visibility: collapse;
		}
	]]>.toString(),
	resolveSymbols : function FSC_resolveSymbols(aSource, aDefinitions)
	{
		var self = this;
		aDefinitions = aDefinitions || this;
		return aSource.replace(/\%[A-Z_]+\%/g, function(aMatched) {
				var symbol = aMatched.substr(1, aMatched.length-2);
				return symbol in aDefinitions ? aDefinitions[symbol] :
						symbol in self ? self[symbol] :
						aMatched;
			});
	}
};

exports.STYLESHEET = exports.resolveSymbols(exports.STYLESHEET);

exports.positionName = {};
exports.positionName[exports.POSITION_TOP]     = 'top';
exports.positionName[exports.POSITION_RIGHT]   = 'right';
exports.positionName[exports.POSITION_BOTTOM]  = 'bottom';
exports.positionName[exports.POSITION_LEFT]    = 'left';
exports.positionName[exports.POSITION_INSIDE]  = 'in';
exports.positionName[exports.POSITION_OUTSIDE] = 'out';

exports.opposite = {};
exports.opposite[exports.POSITION_TOP]     = exports.POSITION_BOTTOM;
exports.opposite[exports.POSITION_RIGHT]   = exports.POSITION_LEFT;
exports.opposite[exports.POSITION_BOTTOM]  = exports.POSITION_TOP;
exports.opposite[exports.POSITION_LEFT]    = exports.POSITION_RIGHT;
exports.opposite[exports.POSITION_INSIDE]  = exports.POSITION_OUTSIDE;
exports.opposite[exports.POSITION_OUTSIDE] = exports.POSITION_INSIDE;

