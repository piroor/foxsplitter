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

load('base');
load('wait');
load('ui');
load('lib/prefs');
load('lib/here');

var { Promise } = Components.utils.import('resource://gre/modules/Promise.jsm', {});

var EXPORTED_SYMBOLS = ['FoxSplitterWindow'];

const SessionStore = Cc['@mozilla.org/browser/sessionstore;1']
					.getService(Ci.nsISessionStore);
const ObserverService = Cc['@mozilla.org/observer-service;1']
					.getService(Ci.nsIObserverService);

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

var bundle = require('lib/locale')
				.get('chrome://foxsplitter/locale/label.properties');

function FoxSplitterWindow(aWindow, aOnInit) 
{
	this.init(aWindow, aOnInit);
}
FoxSplitterWindow.prototype = inherit(FoxSplitterBase.prototype, {

	lastX      : null,
	lastY      : null,
	lastWidth  : null,
	lastHeight : null,

	_syncScroll : false,
	get syncScroll()
	{
		return this._syncScroll;
	},
	set syncScroll(aValue)
	{
		this._syncScroll = !!aValue;
		if (this.ui)
			this.ui.onSyncScrollStateChange();
		return this._syncScroll;
	},

	get shouldDuplicateOnDrop() { return FoxSplitterWindow.shouldDuplicateOnDrop; },
	set shouldDuplicateOnDrop(aValue) { return FoxSplitterWindow.shouldDuplicateOnDrop = aValue; },
	get acceptDropDelay() { return FoxSplitterWindow.acceptDropDelay; },
	set acceptDropDelay(aValue) { return FoxSplitterWindow.acceptDropDelay = aValue; },
	get dropZoneSize() { return FoxSplitterWindow.dropZoneSize; },
	set dropZoneSize(aValue) { return FoxSplitterWindow.dropZoneSize = aValue; },
	get handleDragWithShiftKey() { return FoxSplitterWindow.handleDragWithShiftKey; },
	set handleDragWithShiftKey(aValue) { return FoxSplitterWindow.handleDragWithShiftKey = aValue; },
	get syncScrollX() { return FoxSplitterWindow.syncScrollX; },
	set syncScrollX(aValue) { return FoxSplitterWindow.syncScrollX = aValue; },
	get syncScrollY() { return FoxSplitterWindow.syncScrollY; },
	set syncScrollY(aValue) { return FoxSplitterWindow.syncScrollY = aValue; },
	get fixMispositoning() { return FoxSplitterWindow.fixMispositoning; },
	set fixMispositoning(aValue) { return FoxSplitterWindow.fixMispositoning = aValue; },
	get importTabsFromClosedSibling() { return FoxSplitterWindow.importTabsFromClosedSibling; },
	set importTabsFromClosedSibling(aValue) { return FoxSplitterWindow.importTabsFromClosedSibling = aValue; },
	get methodToRaiseWindow() { return FoxSplitterWindow.methodToRaiseWindow; },
	set methodToRaiseWindow(aValue) { return FoxSplitterWindow.methodToRaiseWindow = aValue; },

	get x()
	{
		return this.internalX - this.offsetX;
	},
	get y()
	{
		return this.internalY - this.offsetY;
	},
	get width()
	{
		return this.internalWidth + this.offsetWidth;
	},
	get height()
	{
		return this.internalHeight + this.offsetHeight;
	},

	get internalX()
	{
		return this.window.screenX;
	},
	get internalY()
	{
		return this.window.screenY;
	},
	get internalWidth()
	{
		return this.window.outerWidth;
	},
	get internalHeight()
	{
		return this.window.outerHeight;
	},

	get imaginaryX()
	{
		return this.stretched ? this.x + this.stretchedOffsetX : this.x ;
	},
	get imaginaryY()
	{
		return this.stretched ? this.y + this.stretchedOffsetY : this.y ;
	},
	get imaginaryWidth()
	{
		return this.stretched ? this.width + this.stretchedOffsetWidth : this.width ;
	},
	get imaginaryHeight()
	{
		return this.stretched ? this.height + this.stretchedOffsetHeight : this.height ;
	},

	updateLastPositionAndSize : function FSW_updateLastPositionAndSize(aExpected)
	{
		if (!this._window)
			return;

		this.lastX      = this.x;
		this.lastY      = this.y;
		this.lastWidth  = this.width;
		this.lastHeight = this.height;
	},

	get window()
	{
		if (!this._window) {
			let error = new Error('illegal access to "window"');
			this.dumpError(error);
			throw error;
		}
		return this._window;
	},
	set window(aValue)
	{
		return this._window = aValue;
	},

	get id()
	{
		return this._id;
	},
	set id(aValue)
	{
		if (aValue != this._id) {
			if (this._id && this._id in FoxSplitterWindow.instancesById)
				delete FoxSplitterWindow.instancesById[this._id];

			this._id = aValue;
			if (aValue)
				FoxSplitterWindow.instancesById[aValue] = this;
		}
		return this._id;
	},

	get active()
	{
		return this._active;
	},
	set active(aValue)
	{
		this._active = !!aValue;
		if (aValue && this.parent) {
			this.root.allWindows.forEach(function(aFSWindow) {
				if (aFSWindow != this)
					aFSWindow.active = false;
			}, this);
		}
		this.documentElement.setAttribute(this.ACTIVE, this._active);
		return this._active;
	},

	get main()
	{
		return this._main;
	},
	set main(aValue)
	{
		this._main = !!aValue;
		if (aValue && this.parent) {
			this.root.allWindows.forEach(function(aFSWindow) {
				if (aFSWindow != this)
					aFSWindow.main = false;
			}, this);
		}

		if (this._main)
			this.documentElement.setAttribute(this.MAIN, true);
		else
			this.documentElement.removeAttribute(this.MAIN);

		this.saveState();

		if (this.ui)
			this.ui.updateGroupedAppearance();
		return this._main;
	},
	_main : false,

	get mainWindow()
	{
		return this.main ? this :
				this.parent ? this.root.mainWindow :
				this ;
	},

	get windowState()
	{
		var state = this._window ? this.window.windowState : -1 ;
/*
		if (// on Windows, minimized window is possibly normal and out of screen
			state == this.STATE_NORMAL && 
			this.x == -32000 &&
			this.y == -32000
			)
			state = this.STATE_MINIMIZED;
*/
		return state;
	},

	get maximized()
	{
		return (
			(this.parent && this.root.maximized) ||
			(this.windowState == this.STATE_MAXIMIZED) ||
			this.window.fullScreen
		);
	},

	get minimized()
	{
		return this.windowState == this.STATE_MINIMIZED;
	},

	get documentElement()
	{
		return this.document.documentElement;
	},
	get document()
	{
		return this.window.document;
	},
	get browser()
	{
		return this._window && this.window.gBrowser;
	},
	get visibleTabs()
	{
		return !this._window ? [] :
			(this.browser.visibleTabs || this.allTabs);
	},
	get selectedTabs()
	{
		return this.visibleTabs.filter(function(aTab) {
			return aTab.getAttribute('multiselected') == 'true';
		});
	},
	get allTabs()
	{
		return !this.browser ? [] :
			Array.slice(this.browser.mTabContainer.childNodes);
	},


	get wmctrl()
	{
		if (!this._wmctrl) {
			load('wmctrl');
			this._wmctrl = new Wmctrl(this.window);
		}
		return this._wmctrl;
	},


	init : function FSW_init(aWindow, aOnInit) 
	{
		this.window = aWindow;

		this.positioning = 0;
		this.resizing    = 0;
		this.raising     = 0;
		this.scrolling   = 0;
		this.scrollPositionSynching = 0;
		this.windowStateUpdating = 0;
		this.maximizing  = 0;

		this.id = 'window-' + Date.now() + '-' + parseInt(Math.random() * 65000);
		this.parent = null;
		FoxSplitterWindow.instances.push(this);

		this.ui = new FoxSplitterUI(this);

		if (!aOnInit)
			aWindow.addEventListener('load', this, false);

		aWindow.addEventListener('unload', this, false);

		ObserverService.addObserver(this, 'sessionstore-windows-restored', false);

		this.active = true;
		this.main = true;

		if (aOnInit) {
			let self = this;
			wait(100).then(function() {
				return self._initAfterLoad();
			});
		}
	},

	_initAfterLoad : function FSW_initAfterLoad()
	{
		// for _preDestroy()
		Cc['@mozilla.org/embedcomp/window-watcher;1']
			.getService(Ci.nsIWindowWatcher)
			.registerNotification(this);

		var self = this;
		return next(function() {
			// workaround to fix broken appearance on sized windows
			if (!self.maximized) {
				self.resizeBy(0, -1);
				self.resizeBy(0, 1);
			}
			return self._restoreState();
		})
		.then(function() {
			self.startListen();
			self.watchWindowState();

			var event = self.document.createEvent('Events');
			event.initEvent(self.EVENT_TYPE_READY, true, false);
			self.document.dispatchEvent(event);
		})
		.catch(this.defaultHandleError)
		.then(function() {
			// OK, it's the time to start saving any state changing!
			self.shouldSaveState = true;
			return wait(1000); // wait for other windows...
		})
		.then(function() {
			self.saveState();
		})
		.catch(this.defaultHandleError);
	},

	_restoreState : function FSW_restoreState()
	{
		if (this._restoringContext)
			return this._continueRestoreState();

		if (this._restored || !this._needRestored)
			return false;

		this.syncScroll = this.getWindowValue(this.SYNC_SCROLL) == 'true';

		var lastState = this._lastState || this.getWindowValue(this.STATE);
		if (!lastState)
			return false;

		// Cache the last state to restore after a delay.
		this._lastState = lastState = (this._lastState || JSON.parse(lastState));
		if (!lastState.id)
			return false;

		if (this.id == lastState.id) {
			this._needRestored = false;
			this._restored = true;
			return false;
		}
		else {
			// Override the id by the old id, if it was stored.
			this.id = lastState.id;
		}

		var sibling = lastState.sibling;
		if (!sibling || this.parent) {
			// already grouped by some reason - do not restore anymore!
			delete this._lastState;
			this._restored = true;
			return lastState.whole ? this._restoreMetaGroups(lastState.whole) : false ;
		}

		var siblingInstance = this._getSiblingById(sibling);
		if (siblingInstance)
			return this._restoreStatePostProcess({
				sibling   : siblingInstance,
				lastState : lastState
			});

		// the sibling is not restored yet, so wait its restoration
		this._restoringContext = {
			siblingId : sibling,
			lastState : lastState
		};
		return wait(0);
	},
	_getSiblingById : function FSB_getSiblingById(aId)
	{
		return (
			(this.memberClass && this.memberClass.instancesById[aId]) ||
			(this.groupClass && this.groupClass.getInstanceById(aId))
		);
	},
	_restoreStatePostProcess : function FSW_restoreStatePostProcess(aContext)
	{
		var self = this;
		return this._restorePosition(aContext)
				.then(function() {
					return self._restoreSize(aContext);
				})
				.then(function() {
					return self._restoreGroup(aContext);
				});
	},
	_restorePosition : function FSW_restorePosition(aContext)
	{
		if (aContext.lastState.x != this.imaginaryX ||
			aContext.lastState.y != this.imaginaryY)
			return this.moveTo(aContext.lastState.x, aContext.lastState.y);
		else
			return Promise.resolve();
	},
	_restoreSize : function FSW_restoreSize(aContext)
	{
		if (aContext.lastState.width != this.imaginaryWidth ||
			aContext.lastState.height != this.imaginaryHeight)
			return this.resizeTo(aContext.lastState.width, aContext.lastState.height);
		else
			return Promise.resolve();
	},
	_restoreGroup : function FSW_restoreGroup(aContext)
	{
		aContext = aContext || {};
		if (aContext.siblingId) {
			aContext.sibling = this._getSiblingById(aContext.siblingId);
			// the sibling is not restored yet...
			if (!aContext.sibling)
				return wait(0);
		}

		if (this._restoringContext)
			delete this._restoringContext;

		var sibling = aContext.sibling;
		var lastState = aContext.lastState;

		if (!sibling || sibling.parent) {
			return this._restoreMetaGroups(lastState.whole);
		}

		this.bindTo(sibling, {
			position   : lastState.position,
			silent     : true,
			mainWindow : this
		});
		this.parent.resetPositionAndSize(this);

		if (lastState.main) {
			let mainWindow = FoxSplitterWindow.instancesById[lastState.main];
			if (mainWindow)
				mainWindow.main = true;
		}

		delete this._lastState;
		this._restored = true;

		/**
		 * Because this group is restored, other member related
		 * to the restored group can become to restorable.
		 */
		FoxSplitterWindow.instances.forEach(function(aFSWindow) {
			aFSWindow._continueRestoreState();
		});

		return this._restoreMetaGroups(lastState.whole);
	},
	_needRestored : true,
	_restored : false,
	_restoringContext : null,
	// Group-groups cannot be restored by the restoration of windows.
	// So, we have to restore them after all window-groups are restored.
	_restoreMetaGroups : function FSW_restoreMetaGroups(aGroupState)
	{
		if (!aGroupState || typeof aGroupState != 'object' || !aGroupState.members)
			return Promise.resolve();

		var self = this;
		var members = aGroupState.members;
		var left = members.left;
		var right = members.right;
		var top = members.top;
		var bottom = members.bottom;

		var mainWindow = null;
		Object.keys(members).some(function findMainWindow(aMember) {
			if (aMember.members)
				return Object.keys(aMember.members).some(findMainWindow);

			var FSWindow = FoxSplitterWindow.instancesById[aMember];
			if (FSWindow)
				return mainWindow = FSWindow.mainWindow;

			return false;
		});

		return next(function() {
				if (left && typeof left != 'string')
					return self._restoreMetaGroups(left)
				else if (top && typeof top != 'string')
					return self._restoreMetaGroups(top);
			})
			.then(function() {
				if (right && typeof right != 'string')
					return self._restoreMetaGroups(right);
				else if (bottom && typeof members.bottom != 'string')
					return self._restoreMetaGroups(bottom);
			})
			.then(function() {
				left = left && self.groupClass.getInstanceById(typeof left == 'string' ? left : left.id);
				right = right && self.groupClass.getInstanceById(typeof right == 'string' ? right : right.id);
				top = top && self.groupClass.getInstanceById(typeof top == 'string' ? top : top.id);
				bottom = bottom && self.groupClass.getInstanceById(typeof bottom == 'string' ? bottom : bottom.id);

				if (left && !left.parent && right && !right.parent) {
					right.bindTo(left, {
						position   : self.POSITION_RIGHT,
						silent     : true,
						mainWindow : mainWindow
					});
				}
				else if (top && !top.parent && bottom && !bottom.parent) {
					bottom.bindTo(top, {
						position   : self.POSITION_BOTTOM,
						silent     : true,
						mainWindow : mainWindow
					});
				}
			})
			.catch(this.defaultHandleError);
	},

	_continueRestoreState : function FSW_continueRestoreState()
	{
		return this._restoringContext ?
			this._restoreGroup(this._restoringContext) :
			false ;
	},


	/**
	 * This process must be done at the timing between "close/DOMWindowClose"
	 * and "unload".
	 * On "close" (and "DOMWindowClose"), we cannot know whether the window
	 * is really closed or not. However, on "unload" it's too late to do
	 * this process.
	 * The nsWindowWatcher notifies "domwindowclosed" event before "unload"
	 * so it is the best timing.
	 */
	_preDestroy : function FSW_preDestroy(aOnQuit) 
	{
		this._preDestroyDone = true;

		Cc['@mozilla.org/embedcomp/window-watcher;1']
			.getService(Ci.nsIWindowWatcher)
			.unregisterNotification(this);

		if (this.parent && !aOnQuit) {
			this._restoreSiblingScrollPosition();
			this._exportTabsToSibling();
		}
	},
	_preDestroyDone : false,

	destroy : function FSW_destroy(aOnQuit) 
	{
		this.shouldSaveState = !aOnQuit;

		if (!this._preDestroyDone)
			this._preDestroy(aOnQuit);

		if (this._reservedHandleRaised) {
			this._reservedHandleRaised.cancel();
			delete this._reservedHandleRaised;
			FoxSplitterWindow.raising--;
		}

		this._onTabViewHidden();

		this.hideDropIndicator();
		this.unwatchWindowState();

		ObserverService.removeObserver(this, 'sessionstore-windows-restored');

		this.setWindowValue(this.SYNC_SCROLL, this.syncScroll);

		this.ui.destroy(aOnQuit);
		delete this.ui;

		var id = this.id;

		this.unbind(aOnQuit);

		var w = this.window;
		w.removeEventListener('unload', this, false);
		this.endListen();

		delete this.window;
		delete this._wmctrl;

		FoxSplitterWindow.instances = FoxSplitterWindow.instances.filter(function(aFSWindow) {
			return aFSWindow != this;
		}, this);
		delete FoxSplitterWindow.instancesById[id];
	},

	_exportTabsToSibling : function FSW_exportTabsToSibling()
	{
		if (
			!this.parent ||
			!this.sibling ||
			this.importTabsFromClosedSibling == this.IMPORT_NOTHING
			)
			return;

		var removingTabs = this.browser._removingTabs || [];
		var exportTabs = this.allTabs.filter(function(aTab) {
				return (
					(this.window.isBlankPageURL ? !this.window.isBlankPageURL(aTab.linkedBrowser.currentURI.spec) : (aTab.linkedBrowser.currentURI.spec != 'about:blank')) &&
					removingTabs.indexOf(aTab) < 0
				);
			}, this);
		if (this.importTabsFromClosedSibling == this.IMPORT_ONLY_HIDDEN) {
			exportTabs = exportTabs.filter(function(aTab) {
				return aTab.hidden;
			}, this);
		}
		else {
			// prevent to close the window on this timing
			this.browser.addTab('about:blank');
		}
		if (exportTabs.length)
			this.sibling.importTabs(exportTabs);
	},


	// proxy methods for DOMWindow

	moveTo : function FSW_moveTo(aX, aY)
	{
		if (this.minimized || !this._window)
			return Promise.resolve();

		this.positioning++;

		if (this.stretched) {
			aX += this.stretchedOffsetX;
			aY += this.stretchedOffsetY;
		}

		this.window.moveTo(Math.round(aX), Math.round(aY));
		this.updateLastPositionAndSize();

		var self = this;
		return next(function() {
				self.updateLastPositionAndSize();
			})
			.catch(this.defaultHandleError)
			.then(function() {
				self.positioning--;
			});
	},

	moveBy : function FSW_moveBy(aDX, aDY)
	{
		if (this.minimized || !this._window)
			return Promise.resolve();

		this.positioning++;

		var aDX = Math.round(aDX) - this.offsetX;
		var aDY = Math.round(aDY) - this.offsetY;
		this.window.moveBy(aDX, aDY);
		this.updateLastPositionAndSize();

		var self = this;
		return next(function() {
				self.updateLastPositionAndSize();
			})
			.catch(this.defaultHandleError)
			.then(function() {
				self.positioning--;
			});
	},

	resizeTo : function FSW_resizeTo(aW, aH)
	{
		if (this.minimized || !this._window)
			return Promise.resolve();

		this.resizing++;

		if (this.stretched) {
			aW += this.stretchedOffsetWidth;
			aH += this.stretchedOffsetHeight;
		}

		aW = Math.max(this.MIN_WIDTH, Math.round(aW)) - this.offsetWidth;
		aH = Math.max(this.MIN_HEIGHT, Math.round(aH)) - this.offsetHeight;
		var waitResizeEvent = this._waitDOMEvent(this.window, 'resize')
								.then(function() {
									waitResizeEvent = null;
								});
		this.window.resizeTo(aW, aH);
		this.updateLastPositionAndSize();

		var self = this;
		return next(function() {
					return waitResizeEvent;
				})
				.then(function() {
					self.updateLastPositionAndSize();
					self.resizing--;
				})
				.catch(this.defaultHandleError);
	},

	resizeBy : function FSW_resizeBy(aDW, aDH)
	{
		if (this.minimized || !this._window)
			return Promise.resolve();

		this.resizing++;

		aDW = Math.max(-this.window.innerWidth+this.MIN_WIDTH, Math.round(aDW));
		aDH = Math.max(-this.window.innerHeight+this.MIN_HEIGHT, Math.round(aDH));
		var waitResizeEvent = this._waitDOMEvent(this.window, 'resize')
								.then(function() {
									waitResizeEvent = null;
								});
		this.window.resizeBy(aDW, aDH);
		this.updateLastPositionAndSize();

		var self = this;
		return next(function() {
					return waitResizeEvent;
				})
				.then(function() {
					self.updateLastPositionAndSize();
					self.resizing--;
				})
				.catch(this.defaultHandleError);
	},

	raise : function FSW_raise()
	{
		if (
			!this._window ||
			this.raising ||
			this.minimized ||
			this.methodToRaiseWindow == this.DO_NOT_RAISE_WINDOW
			)
			return Promise.resolve();

		switch (this.methodToRaiseWindow)
		{
			case this.RAISE_WINDOW_BY_RAISED_FLAG:
				return this._raiseWindowByRaisedFlag();
			case this.RAISE_WINDOW_BY_WMCTRL:
				return this._raiseWindowByWmctrl();
			case this.RAISE_WINDOW_BY_XLIB:
				return this._raiseWindowByXLib();
			case this.RAISE_WINDOW_BY_FOCUS:
			default:
				return this._raiseWindowByFocus();
		}

	},

	/**
	 * This works only on Windows and OS/2 due to Gecko's limitation.
	 * See:
	 *   https://bugzilla.mozilla.org/show_bug.cgi?id=453274#c2
	 *     https://bugzilla.mozilla.org/show_bug.cgi?id=91508
	 *     https://bugzilla.mozilla.org/show_bug.cgi?id=450576
	 *     https://bugzilla.mozilla.org/show_bug.cgi?id=117730#c25
	 */
	_raiseWindowByRaisedFlag : function FSW_raiseWindowByRaisedFlag()
	{
		this.raising++;

		var XULWindow = this.window
						.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIWebNavigation)
						.QueryInterface(Ci.nsIDocShellTreeItem)
						.treeOwner
						.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIXULWindow);
		var originalFlag = XULWindow.zLevel;
		XULWindow.zLevel = Ci.nsIXULWindow.highestZ;

		var self = this;
		return next(function() {
				XULWindow.zLevel = originalFlag; // Ci.nsIXULWindow.normalZ;
				self.raising--;
			});
	},

	_raiseWindowByWmctrl : function FSW_raiseWindowByWmctrl()
	{
		this.raising++;

		var self = this;
		return this.wmctrl.raise()
				.catch(function(e) {
					dump(e+'\n');
				})
				.then(function() {
					self.raising--;
				});
	},

	_raiseWindowByXLib : function FSW_raiseWindowByXLib()
	{
		return wait(0);
	},

	/**
	 * on Windows:
	 *   (event loop 1) focused => "activate" event is fired
	 *     => (event loop 2) next() is processed
	 *       => ready to decrement the "raising" counter
	 * on Linux:
	 *   (event loop 1) focused
	 *     => (event loop 2) next() is processed

	 *       => (event loop 3) "activate" event is fired
	 *         => ready to decrement the "raising" counter
	 *
	 * Grouped windows flick each other infinitely, if I decrement
	 * the counter too early. To avoid this flick, I have to wait
	 * until this window is surely activated.
	 */
	_raiseWindowByFocus : function FSW_raiseWindowByFocus()
	{
		this.raising++;

		var self = this;
		var promise = Promise.all([
							this._waitDOMEvent(this.window, 'activate', 'deactivate'),
							wait(0)
						])
						.then(function() {
							self.raising--;
						});

		try {
			var fm = Cc['@mozilla.org/focus-manager;1'].getService(Ci.nsIFocusManager);

			var focusedWindow = {};
			var focusedElement = fm.getFocusedElementForWindow(this.window, true, focusedWindow);
			var reason = fm.getLastFocusMethod(focusedWindow.value);
			var flags = Ci.nsIFocusManager.FLAG_RAISE |
						Ci.nsIFocusManager.FLAG_NOSCROLL |
						Ci.nsIFocusManager.FLAG_NOSWITCHFRAME |

						reason;

			focusedWindow.value.focus();

			if (focusedElement)
				fm.setFocus(focusedElement, flags);
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO RAISE A WINDOW!');
		}

		return promise;
	},

	maximize : function FSW_maximize()
	{
		var window = this.window;
		return this._doChangeWindowStateOperation(function() {
			window.maximize();
		});
	},

	fullscreen : function FSW_fullscreen()
	{
		var window = this.window;
		return this._doChangeWindowStateOperation(function() {
			window.fullScreen = true;
		});
	},

	minimize : function FSW_minimize()
	{
		this.window.minimize();
	},

	restore : function FSW_restore()
	{
		var window = this.window;
		if (window.fullScreen || this.windowState == this.STATE_MAXIMIZED)
			return this._doChangeWindowStateOperation(function() {
				if (window.fullScreen)
					window.fullScreen = false;
				else
					window.restore();
			});

		var root = this.root;
		if (root && (root.minimized || root.maximized))
			return root.restore();

		return Promise.resolve();
	},

	_doChangeWindowStateOperation : function FSW_doChangeWindowStateOperation(aOperation)
	{
		var window = this.window;
		var waitStateChanged = new Promise((function(aResolve, aReject) {
			window.addEventListener(this.EVENT_TYPE_WINDOW_STATE_CHANGED, function onStateChanged(aEvent) {
				window.removeEventListener(aEvent.type, onStateChanged, false);
				aResolve();
				waitStateChanged = null;
			}, false);
		}).bind(this));
		var waitRestored = this._waitDOMEvent(window, 'resize')
							.then(function() {
								waitRestored = null;
							});

		aOperation();

		var promises = [];

		if (waitStateChanged) promises.push(waitStateChanged);
		if (waitRestored) promises.push(waitRestored);

		return promises.length > 1 ?
				Promise.all(promises) :
			promises.length ?
				promises[0] :
				Promise.resolve();
	},


	stretch : function FSW_stretch()
	{
		if (!this.parent || this.stretched || this.root.stretchedMember)
			return Promise.resolve();

		var root = this.root;
		var x = root.x;
		var y = root.y;
		var width = root.width;
		var height = root.height;

		var currentX = this.x;
		var currentY = this.y;
		var currentWidth = this.width;
		var currentHeight = this.height;

		var self = this;
		return this.moveTo(x, y)
			.then(function() {
				return self.resizeTo(width, height);
			})
			.then(function() {
				self.stretched = true;
				self.stretchedOffsetX = currentX - x;
				self.stretchedOffsetY = currentY - y;
				self.stretchedOffsetWidth = currentWidth - width;
				self.stretchedOffsetHeight = currentHeight - height;
				self.documentElement.setAttribute(self.STRETCHED, true);

				self.clearGroupedAppearance();
				self.saveState();

				if (self.ui)
					self.ui.onStretchedStateChange();
			});
	},

	shrink : function FSW_shrink(aSilent)
	{
		if (!this.parent || !this.stretched)
			return Promise.resolve();

		this.stretched = false;
		this.documentElement.removeAttribute(this.STRETCHED);

		if (aSilent) {
			this._shrinkPostProcess();
			return Promise.resolve();
		}

		var self = this;
		return this.resizeTo(this.width + this.stretchedOffsetWidth, this.height + this.stretchedOffsetHeight)
			.then(function() {
				// don't move the window yet, because it is not resized actually!
			})
			.then(function() {
				// now, the window is actually shown with the specified size.
				// we can move it.
				self.moveTo(self.x + self.stretchedOffsetX, self.y + self.stretchedOffsetY);
				// self.parent.resetPositionAndSize(self);
				self._shrinkPostProcess();
			});
	},
	_shrinkPostProcess : function FSW_shrinkPostProcess()
	{
		delete this.stretchedOffsetX;
		delete this.stretchedOffsetY;
		delete this.stretchedOffsetWidth;
		delete this.stretchedOffsetHeight;

		this.setGroupedAppearance();
		this.saveState();

		if (this.ui)
			this.ui.onStretchedStateChange();
	},


	tileTabs : function FSW_tileTabs(aTabs, aMode) /* PUBLIC API */
	{
		var isAllTabs = aTabs.length == this.visibleTabs.length;
		if (
			!this._window ||
			(isAllTabs && aTabs.length == 1)
			) {
			return Promise.resolve([]);
		}

		var selectedTab = this.browser.selectedTab;
		var tilesCount = aTabs.length + (isAllTabs ? 0 : 1 );

		var beforeTabs = aTabs.filter(function(aTab) {
				return aTab._tPos < selectedTab._tPos;
			});
		var afterTabs = aTabs.filter(function(aTab) {
				if (aTab.selected && isAllTabs)
					return false;
				return aTab._tPos >= selectedTab._tPos;
			});

		var baseX = this.imaginaryX;
		var baseY = this.imaginaryY;
		var totalWidth = this.imaginaryWidth;
		var totalHeight = this.imaginaryHeight;

		var maxRows, maxCols, lastMaxCols;
		switch (aMode)
		{
			case this.TILE_MODE_GRID:
			default:
				maxRows = Math.floor(Math.sqrt(tilesCount));
				maxCols = Math.floor(tilesCount / maxRows);
				lastMaxCols = maxCols + tilesCount - (maxCols * maxRows);
				break;

			case this.TILE_MODE_X_AXIS:
				maxRows = 1;
				maxCols = tilesCount;
				lastMaxCols = tilesCount;

			case this.TILE_MODE_Y_AXIS:
				maxRows = tilesCount;
				maxCols = 1;
				lastMaxCols = 1;
		}

		var width              = Math.round(totalWidth / maxCols);
		var lastWidth          = totalWidth - (width * (maxCols - 1)) ;
		var widthInLastRow     = Math.round(totalWidth / lastMaxCols);
		var lastWidthInLastRow = totalWidth - (widthInLastRow * (lastMaxCols - 1)) ;
		var height             = Math.round(totalHeight / maxRows);
		var lastHeight         = totalHeight - (height * (maxRows - 1)) ;

		var col = 0;
		var row = 0;
		var promises = [];
		var self = this;
		var tiles = beforeTabs.concat([null]).concat(afterTabs)
					.map(function(aTab) {
						let isLastRow = (row == maxRows - 1);
						let currentMaxCols = isLastRow ? lastMaxCols : maxCols ;
						let offsetWidth = isLastRow ? widthInLastRow : width ;
						let tile = {
								col       : col,
								row       : row,
								first     : col == 0,
								last      : (col == currentMaxCols- 1 ),
								direction : ((aTab && aTab._tPos < selectedTab._tPos) ? -1 : aTab ? 1 : 0 ),
								width     : ((col == currentMaxCols - 1) ?
												(isLastRow ? lastWidthInLastRow : lastWidth ) :
												offsetWidth
											),
								height    : isLastRow ? lastHeight : height
							};
						tile.x = baseX + (offsetWidth * col);
						tile.y = baseY + (height * row);
						if (aTab) {
							promises.push(this._openWindow(aTab, tile));
						}
						else {
							this.moveTo(tile.x, tile.y);
							this.resizeTo(tile.width, tile.height);
							promises.push(next(function() {
								return self.window;
							}));
						}
						col++;
						if (col == currentMaxCols) {
							col = 0;
							row++;
						}
						return tile;
					}, this);

		return Promise
				.all(promises)
				.then(function(aWindows) {
					var beforeXTiles = [];
					var beforeYTiles = [];
					var afterXTiles  = [];
					var afterYTiles  = [];
					var rows = [];

					aWindows.forEach(function(aWindow, aIndex) {
						var tile = tiles[aIndex];
						tile.FSWindow = aWindow.FoxSplitter;
						if (tile.direction == -1) {
							if (tile.last)
								beforeYTiles.unshift(tile);
							else
								beforeXTiles.unshift(tile);
						}
						else if (tile.direction == 1) {
							if (tile.first)
								afterYTiles.push(tile);
							else
								afterXTiles.push(tile);
						}
						let row = rows[tile.row] || [];
						row[tile.col] = tile;
						rows[tile.row] = row;
					});

					beforeYTiles.forEach(function(aTile, aIndex) {
						var base = !aIndex ? self : beforeYTiles[aIndex-1];
						aTile.FSWindow.bindTo(base, {
							position   : self.POSITION_TOP,
							silent     : true,
							mainWindow : self
						});
					});
					beforeXTiles.forEach(function(aTile) {
						var row = rows[aTile.row]
						aTile.FSWindow.bindTo(row[aTile.col+1].FSWindow, {
							position   : self.POSITION_LEFT,
							silent     : true,
							mainWindow : self
						});
					});

					afterYTiles.forEach(function(aTile, aIndex) {
						var base = !aIndex ? self : afterYTiles[aIndex-1];
						aTile.FSWindow.bindTo(base, {
							position   : self.POSITION_BOTTOM,
							silent     : true,
							mainWindow : self
						});
					});
					afterXTiles.forEach(function(aTile) {
						var row = rows[aTile.row]
						aTile.FSWindow.bindTo(row[aTile.col-1].FSWindow, {
							position   : self.POSITION_RIGHT,
							silent     : true,
							mainWindow : self
						});
					});

					self.parent.resetPositionAndSize(self); // for safety

					return tiles.map(function(aTile) {
						return aTile.FSWindow.window;
					})
				})
				.catch(this.defaultHandleError);
	},

	tileAllTabs : function FSW_tileAllTabs(aMode) /* PUBLIC API */
	{
		return this.tileTabs(this.visibleTabs, aMode);
	},

	tileSelectedTabs : function FSW_tileSelectedTabs(aMode) /* PUBLIC API */
	{
		return this.tileTabs(this.selectedTabs, aMode);
	},


	gatherWindows : function FSW_gatherWindows() /* PUBLIC API */
	{
		if (!this.parent || !this._window)
			return Promise.resolve([]);

		var FSWindows = this.root.allWindows;
		var current = FSWindows.indexOf(this);
		var offset = 0;
		var promises = [];
		FSWindows.forEach(function(aFSWindow, aIndex) {
			if (aIndex == current)
				return;

			var count = aFSWindow.allTabs.length;
			promises.push(this.importAllTabsFrom(aFSWindow.window, offset));
			offset += count;
		}, this);

		if (!promises.length)
			return Promise.resolve([]);

		var self = this;
		return Promise
				.all(promises)
				.then(function(aTabsFromWindows) {
					self.clearGroupedAppearance();
					return aTabsFromWindows.slice(0);
				})
				.catch(this.defaultHandleError);
	},

	importAllTabsFrom : function FSW_importAllTabsFrom(aWindow, aOffset) /* PUBLIC API */
	{
		if (!this.parent || !this._window || !aWindow.FoxSplitter)
			return Promise.resolve([]);

		var FSWindows = this.root.allWindows;
		var current = FSWindows.indexOf(this);
		var importSource = FSWindows.indexOf(aWindow.FoxSplitter);
		var allTabsCount = this.allTabs.length;
		var offset = importSource > -1 && current > importSource ?
						allTabsCount :
						0 ;
		if (aOffset)
			offset += aOffset;

		offset = Math.min(allTabsCount, offset);

		var selectedTab = this.browser.selectedTab;
		var promises = this.importTabs(aWindow.FoxSplitter.allTabs, offset);

		if (!promises.length)
			return Promise.resolve([]);

		var self = this;
		return Promise
				.all(promises)
				.then(function(aImportedTabs) {
					/**
					 * swapBrowsersAndCloseOther() focuses to the imported tab,
					 * so we have to focus to the original selected tab again.
					 */
					self.browser.selectedTab = selectedTab;
					return aImportedTabs.filter(function(aTab) {
						return aTab;
					});
				})
				.catch(this.defaultHandleError);
	},

	importTabs : function FSW_importTabs(aTabs, aPosition) /* PUBLIC API */
	{
		var groupInfos = aTabs.map(function(aTab) {
				if (aTab.hidden)
					aTab.hidden = false;
				return this._getGroupInfo(aTab);
			}, this);

		if (this.browser.treeStyleTab && this.browser.treeStyleTab.importTabs) {
			let allTabs = this.allTabs;
			let insertBefore = aPosition < allTabs.length ? this.allTabs[aPosition] : null ;
			return this.browser.treeStyleTab.importTabs(aTabs, insertBefore)
					.map(function(aTab, aIndex) {
						return this._reserveMoveTabToGroup(aTab, groupInfos[aIndex]);
					}, this);
		}

		return aTabs.map(function(aTab, aIndex) {
			var newTab = this._importTabInternal(aTab, aPosition === undefined ? undefined : aPosition++ );
			return this._reserveMoveTabToGroup(newTab, groupInfos[aIndex]);
		}, this);
	},

	importTab : function FSW_importTab(aTab, aPosition) /* PUBLIC API */
	{
		if (!this._window)
			return Promise.resolve(null);

		var groupInfo = this._getGroupInfo(aTab);
		// we cannot import hidden tab!
		if (aTab.hidden) aTab.hidden = false;
		var newTab = this._importTabInternal(aTab, aPosition);
		return this._reserveMoveTabToGroup(newTab, groupInfo);
	},
	_importTabInternal : function FSW_importTabInternal(aTab, aPosition)
	{
		if (!this._window)
			return null;

		var newTab = this.browser.addTab('about:blank');
		newTab.linkedBrowser.stop();
		newTab.linkedBrowser.docShell;
		if (aPosition !== undefined && aPosition > -1)
			this.browser.moveTabTo(newTab, aPosition);

		// we cannot import collapsed tree!
		var sourceBrowser = this.getTabBrowserFromTab(aTab);
		if ('treeStyleTab' in sourceBrowser &&
			sourceBrowser.treeStyleTab.isCollapsed(aTab)) {
			sourceBrowser.treeStyleTab.collapseExpandSubtree(aTab, false, true);
			sourceBrowser.treeStyleTab.collapseExpandTab(aTab, false, true);
		}

		this.browser.swapBrowsersAndCloseOther(newTab, aTab);
		this.browser.setTabTitle(newTab);

		return newTab;
	},

	_reserveMoveTabToGroup : function FSW_reserveMoveTabToGroup(aTab, aGroupInfo)
	{
		var self = this;
		return new Promise((function(aResolve, aReject) {
		next(function() {
			if (aGroupInfo)
				self._moveImportedTabToNamedGroup(aTab, aGroupInfo)
					.then(function() {
						aResolve(aTab);
					});
			else
				aResolve(aTab);
		});
		}).bind(this))
		  .catch(this.defaultHandleError);
	},

	_getExistingGroups : function FSW_getExistingGroups()
	{
		var self = this;
		return new Promise(function(aResolve, aReject) {
			next(function() {
				self.window.TabView._initFrame(function() {
					aResolve(self.window.TabView._window.GroupItems.groupItems);
				})
			});;
		});
	},

	_getGroupInfo : function FSW_getGroupInfo(aTab)
	{
		var item = aTab._tabViewTabItem;
		if (!item)
			return null;

		var parent = item.parent;
		if (!parent)
			return null;

		var groupInfo = {
				id     : parent.id,
				title  : parent.getTitle(),
				window : aTab.ownerDocument.defaultView.FoxSplitter.id
			};
		if (!groupInfo.title)
			groupInfo.title = this._generateTemporaryNameForAnonymousGroup(groupInfo);
		return groupInfo;
	},

	_generateTemporaryNameForAnonymousGroup : function FSW_generateTemporaryNameForAnonymousGroup(aGroupInfo)
	{
		return bundle.getFormattedString('tabView.importedGroup', [aGroupInfo.window + '-' + aGroupInfo.id]);
	},

	_moveImportedTabToNamedGroup : function FSW_moveImportedTabToNamedGroup(aTab, aTargetGroupInfo)
	{
		var self = this;
		return this._getExistingGroups()
				.then(function(aGroups) {
					var targetGroup;
					aGroups.some(function(aGroup) {
						if (aGroup.getTitle() != aTargetGroupInfo.title)
							return false;
						return targetGroup = aGroup;
					});
					var groupId = targetGroup ? targetGroup.id : null ;

					/**
					 * If the tab is the last tab (when the window is newly opened),
					 * Panorama will be shown automatically. To prevent it, we have
					 * to create a dummy tab as the new selected tab after the imported
					 * tab is moved to a background group.
					 */
					var tempTab = self.visibleTabs.length == 1 ? self.browser.addTab('about:blank') : null ;

					self.window.TabView.moveTabTo(aTab, groupId);
					// newly created group has no title yet!
					if (!groupId && aTab._tabViewTabItem && aTargetGroupInfo.title)
						aTab._tabViewTabItem.parent.setTitle(aTargetGroupInfo.title);

					// Cleanup the dummy tab and a new group for the dummy tab.
					if (tempTab && aTab._tabViewTabItem) {
						self.browser.selectedTab = aTab;

						if (tempTab._tabViewTabItem &&
							tempTab._tabViewTabItem.parent)
							tempTab._tabViewTabItem.parent.close();
						self.browser.removeTab(tempTab);
					}
				})
				.catch(this.defaultHandleError);
	},

	duplicateTabs : function FSW_duplicateTabs(aTabs) /* PUBLIC API */
	{
		var tabs;
		if (this.browser.treeStyleTab && this.browser.treeStyleTab.duplicateTab) {
			tabs = this.browser.treeStyleTab.duplicateTabs(aTabs);
		}
		else {
			// Multiple Tab Handler duplicates selected tabs, so we should process only one tab.
			let selectedTabs = this._filterSelectedTabs(aTabs);
			if (
				'MultipleTabService' in aTabs[0].ownerDocument.defaultView &&
				selectedTabs.length
				)
				aTabs = [selectedTabs[0]];

			tabs = aTabs.map(function(aTab) {
				return this.browser.duplicateTab(aTab);
			}, this);
		}
		return tabs;
	},


	canClose : function FSW_canClose()
	{
		if (
			!this._window ||
			!this.window.WindowIsClosing
			)
			return true;

		return this.window.WindowIsClosing();
	},

	close : function FSW_close(aForce) /* PUBLIC API */
	{
		if (aForce || this.canClose())
			this.window.close();
	},

	closeAll : function FSW_closeAll() /* PUBLIC API */
	{
		if (this.parent)
			this.root.close();
		else
			this.close();
	},

	closeOther : function FSW_closeOther() /* PUBLIC API */
	{
		if (this.parent)
			this.root.closeExcept(this);
	},


	splitCurrentTabTo : function FSW_splitCurrentTabTo(aPosition) /* PUBLIC API */
	{
		return this.splitTabTo(this.browser.selectedTab, aPosition);
	},

	moveCurrentTabTo : function FSW_moveCurrentTabTo(aPosition) /* PUBLIC API */
	{
		return this.moveTabTo(this.browser.selectedTab, aPosition);
	},

	duplicateCurrentTabAt : function FSW_duplicateCurrentTabAt(aPosition) /* PUBLIC API */
	{
		return this.duplicateTabAt(this.browser.selectedTab, aPosition);
	},


	getWindowValue : function FSW_getWindowValue(aKey)
	{
		if (
			!this._window ||
			!this.window.__SSi // not initialized yet by nsSessionStore
			)
			return null;

		return SessionStore.getWindowValue(this.window, aKey);s
	},

	setWindowValue : function FSW_setWindowValue(aKey, aValue)
	{
		if (
			!this._window ||
			!this.window.__SSi // not initialized yet by nsSessionStore
			)
			return;

		SessionStore.setWindowValue(this.window, aKey, aValue);
	},

	get state()
	{
		return {
			id        : this.id,
			x         : this.imaginaryX,
			y         : this.imaginaryY,
			width     : this.imaginaryWidth,
			height    : this.imaginaryHeight,
			sibling   : (this.sibling ? this.sibling.id : null ),
			position  : this.position,
			main      : this.mainWindow.id
		};
	},

	saveState : function FSW_saveState()
	{
		if (!this._window || !this.shouldSaveState)
			return;

		var state = this.state;
		state.whole = this.parent ? this.root.state : null ;
		state = JSON.stringify(state);
		this.setWindowValue(this.STATE, state);
	},
	shouldSaveState : false,


	// event handling
	get MutationObserver()
	{
		var w = this.window;
		return w.MutationObserver || w.MozMutationObserver;
	},

	startListen : function FSW_startListen()
	{
		if (this._listening || !this._window) return;

		this.mutationOserver = new this.MutationObserver((function(aMutations, aObserver) {
			this.handleMutations(aMutations, aObserver);
		}).bind(this));
		this.mutationOserver.observe(this.documentElement, { attributes : true });

		this.window.addEventListener('resize', this, false);
		this.window.addEventListener('activate', this, true);
		this.window.addEventListener('deactivate', this, true);
		this.window.addEventListener('scroll', this, true);
		this.window.addEventListener('dragover', this, false);
		this.window.addEventListener('dragleave', this, true);
		this.window.addEventListener('drop', this, true);
		this.window.addEventListener('dragend', this, true);
		this.window.addEventListener('tabviewshown', this, true);
		this.window.addEventListener('tabviewhidden', this, true);
		this.window.addEventListener(this.EVENT_TYPE_CONTENT_SPLIT_REQUEST, this, true, true);
		this.window.addEventListener(this.EVENT_TYPE_CONTENT_UNSPLIT_REQUEST, this, true, true);
		this._listening = true;
	},
	_listening : false,

	endListen : function FSW_endListen()
	{
		if (!this._listening || !this._window) return;

		if (this.mutationOserver) {
			this.mutationOserver.disconnect();
			delete this.mutationOserver;
		}

		this.window.removeEventListener('resize', this, false);
		this.window.removeEventListener('activate', this, true);
		this.window.removeEventListener('deactivate', this, true);
		this.window.removeEventListener('scroll', this, true);
		this.window.removeEventListener('dragover', this, false);
		this.window.removeEventListener('dragleave', this, true);
		this.window.removeEventListener('drop', this, true);
		this.window.removeEventListener('dragend', this, true);
		this.window.removeEventListener('tabviewshown', this, true);
		this.window.removeEventListener('tabviewhidden', this, true);
		this.window.removeEventListener(this.EVENT_TYPE_CONTENT_SPLIT_REQUEST, this, true, true);
		this.window.removeEventListener(this.EVENT_TYPE_CONTENT_UNSPLIT_REQUEST, this, true, true);
		this._listening = false;
	},

	watchWindowState : function FSW_watchWindowState()
	{
		if (this._watchingWindowStateTimer || !this._window) return;
		this.lastWindowState = this.windowState;
		this._watchingWindowStateTimer = this.window.setInterval(function(aSelf) {
			aSelf._checkWindowState();
		}, 500, this);
	},
	_watchingWindowStateTimer : undefined,

	unwatchWindowState : function FSW_unwatchWindowState()
	{
		if (!this._watchingWindowStateTimer) return;
		this.window.clearInterval(this._watchingWindowStateTimer);
		this._watchingWindowStateTimer = undefined;
	},

	handleEvent : function FSW_handleEvent(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.window.removeEventListener('load', this, false);
				this._initAfterLoad();
				return;

			case 'unload':
				return this.destroy();


			case 'resize':
				if (aEvent.target == this.window)
					this.onResize();
				return;

			case 'activate':
				return this.onActivate();

			case 'deactivate':
				return this.onDeactivate();

			case 'scroll':
				return this.onScroll(aEvent);


			case 'dragover':
				return this._onDragOver(aEvent);

			case 'dragleave':
				return this._onDragLeave(aEvent);

			case 'drop':
				return this._onDrop(aEvent);

			case 'dragend':
				return this._onDragEnd(aEvent);


			case 'tabviewshown':
				return this._onTabViewShown();

			case 'tabviewhidden':
				return this._onTabViewHidden();


			case this.EVENT_TYPE_CONTENT_SPLIT_REQUEST:
				return this._onSplitRequestFromContent(aEvent);

			case this.EVENT_TYPE_CONTENT_UNSPLIT_REQUEST:
				return this._onUnsplitRequestFromContent(aEvent);
		}
	},

	observe : function FSW_observe(aSubject, aTopic, aData)
	{
		switch (aTopic)
		{
			case 'domwindowclosed':
				if (aSubject == this.window)
					this._preDestroy();
				return;

			case 'sessionstore-windows-restored':
				return this._continueRestoreState();
		}
	},

	handleMutations : function FSW_handleMutations(aMutations, aObserver)
	{
		aMutations.forEach(function(aMutation) {
			if (aMutation.type != 'attributes')
				return;

			switch (aMutation.attributeName)
			{
				case 'screenX':
				case 'screenY':
					// possible maximized. do it after the "sizemode" is updated.
					return next((function() {
						this.onMove();
					}).bind(this));

				case 'sizemode':
					return this._onWindowStateChange();

				case 'chromemargin':
					if (this.ui) {
						let value = aMutation.target.getAttribute(aMutation.attributeName);
						this.ui.onChromeMarginChange(value);
					}
					return;
			}
		}, this);
	},

	_checkWindowState : function FSW_checkWindowState()
	{
		if (this.lastWindowState != this.windowState) {
			this._onWindowStateChange();
		}
		else if (
			!this.positioning &&
			(this.x != this.lastX || this.y != this.lastY)
			) {
			this.onMove();
		}
	},

	_onWindowStateChange : function FSW_onWindowStateChange()
	{
		if (!this._window)
			return;

		var state = this.windowState;
		var lastState = this.lastWindowState;
		if (state == lastState)
			return;

		this.lastWindowState = state;

		var event = this.document.createEvent('Events');
		event.initEvent(this.EVENT_TYPE_WINDOW_STATE_CHANGED, true, false);

		if (!this.parent || this.windowStateUpdating) {
			this.document.dispatchEvent(event);
			return;
		}

		this.windowStateUpdating++;

		var promise;
		try {
			switch (state)
			{
				case this.STATE_MINIMIZED:
					/**
					 * When the active window is minimized, another member can be focused.
					 * So we have to minimize other windows with a delay.
					 */
					promise = next((function() {
							this.root.minimize(this);
						}).bind(this))
						.catch(this.defaultHandleError);
					break;

				case this.STATE_MAXIMIZED:
					promise = this._onMaximized(false);
					break;

				case this.STATE_FULLSCREEN:
					promise = this._onMaximized(true);
					break;

				default:
					if (lastState == this.STATE_MINIMIZED)
						this.root.restore(this);
					break;
			}
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO MINIMIZE/RESTORE WINDOWS!');
		}

		if (promise) {
			let self = this;
			promise.then(function() {
				self.windowStateUpdating--;
				self.document.dispatchEvent(event);
			});
		}
		else {
			this.windowStateUpdating--;
			this.document.dispatchEvent(event);
		}
	},

	onMove : function FSW_onMove()
	{
		if (
			!this._window ||
			this.lastX === null ||
			this.lastY === null ||
			this.positioning ||
			this.minimized ||
			this.maximizing ||
			(this.lastX == this.x && this.lastY == this.y)
			)
			return;

		if (this.parent) {
			let root = this.root;
			if (root.movingWindow &&
				root.movingWindow != this)
				return;

			if (root.movingWindowClearer)
				root.movingWindowClearer.cancel();

			root.movingWindow = this;
			root.movingWindowClearer = wait(500).then(function() {
				root.movingWindow = null;
				root.movingWindowClearer = null;
			});
		}

		var self = this;
		if (this.parent && this.root.maximized)
			return this.root.restore()
					.then(function() {
						self.parent.resetPositionAndSize(self)
					});

		this.positioning++;
		FoxSplitterWindow.positioning++;

		var prevX = this.lastX;
		var prevY = this.lastY;
		this.updateLastPositionAndSize();
		var newX = this.x;
		var newY = this.y;

		wait(100).then(function() {
			self.positioning--;
			/**
			 * Switching of workspaces (virtual desktops) on the platform can move
			 * multiple windows on the same time. We don't have to handle it because
			 * the platform should keep relative positions of all windows.
			 */
			var root = self.root;
			if (root && FoxSplitterWindow.positioning == 1) {
				self.parent.resetPositionAndSize(self);
				next(function() {
					FoxSplitterWindow.positioning--;
				});
			}
			else {
				FoxSplitterWindow.positioning--;
			}
		});
	},

	onResize : function FSW_onResize()
	{
		if (
			!this._window ||
			this.resizing ||
			this.minimized ||
			this.maximizing
			)
			return;

		if (this.windowState == this.STATE_MAXIMIZED && this.stillMaximizedYet)
			return;

		if (this.stretched && this.parent) {
			this.updateLastPositionAndSize();
			this.root.reserveResetPositionAndSize(this);
			return;
		}

		var x = this.x;
		var y = this.y;
		var width  = this.width;
		var height = this.height;

		if (x != this.lastX)
			this.onResizeLeft(this.lastX - x);
		else if (width != this.lastWidth)
			this.onResizeRight(width - this.lastWidth);

		if (y != this.lastY)
			this.onResizeTop(this.lastY - y);
		else if (height != this.lastHeight)
			this.onResizeBottom(height - this.lastHeight);

		this.updateLastPositionAndSize();

		if (this.parent)
			this.parent.reserveResetPositionAndSize(this); // for safety
	},

	onActivate : function FSW_onActivate()
	{
		if (!this._window || this.raising || this.minimized)
			return;

		if (
			FoxSplitterWindow.positioning ||
			FoxSplitterWindow.resizing ||
			FoxSplitterWindow.raising
			)
			return;

		FoxSplitterWindow.raising++;

		this.active = true;

		if (this.parent && this.root.stretchedMember) {
			FoxSplitterWindow.raising--;
			return;
		}

		if (this._reservedHandleRaised)
			this._reservedHandleRaised.cancel();

		var self = this;
		this._reservedHandleRaised = next(function() {
			delete self._reservedHandleRaised;
			self._handleRaised();
		});
		this._reservedHandleRaised
			.catch(this.defaultHandleError)
			.then(function() {
				return wait(100);
			})
			.then(function() {
				FoxSplitterWindow.raising--;
			});

		if (this._reservedHandleLowered) {
			this._reservedHandleLowered.cancel();
			delete this._reservedHandleLowered;
		}
	},
	_handleRaised : function FSW_handleRaised()
	{
		if (!this._window || this.minimized)
			return;

		// _onWindowStateChange() should handle this event instead of this method.
		if (!this.parent || this.root.hasMinimizedWindow)
			return;

		this.root.raise(this);
	},

	onDeactivate : function FSW_onDeactivate()
	{
		if (!this._window || this.raising || this.minimized)
			return;

		if (this._reservedHandleRaised) {
			this._reservedHandleRaised.cancel();
			delete this._reservedHandleRaised;
			FoxSplitterWindow.raising--;
		}
	},

	onScroll : function FSW_onScroll(aEvent)
	{
		if (!this._window || !this.parent || this.scrolling || this.scrollPositionSynching || !this.syncScroll)
			return;

		var scrolledFrame = aEvent.originalTarget.defaultView;
		if (
			!scrolledFrame ||
			// ignore scrolling in Firefox UI
			scrolledFrame.top == this.window ||
			// ignore scrolling in background tabs
			scrolledFrame.top != this.browser.contentWindow
			)
			return;

		this.scrolling++;

		try {
			var xFactor = scrolledFrame.scrollX / scrolledFrame.scrollMaxX;
			var yFactor = scrolledFrame.scrollY / scrolledFrame.scrollMaxY;
			var frames = this._collectAllFrames(scrolledFrame.top);
			var index = frames.indexOf(scrolledFrame);
			this.root.allWindows.forEach(function(aFSWindow) {
				if (aFSWindow != this && aFSWindow.syncScroll)
					aFSWindow._setScrollPosition(xFactor, yFactor, index);
			}, this);
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO SYNC SCROLL!');
		}

		var self = this;
		next(function() {
			self.scrolling--;
		});
	},

	_collectAllFrames : function FSW_getAllFrames(aFrame)
	{
		var frames = [aFrame];
		frames.push(aFrame);
		Array.forEach(aFrame.frames, function(aFrame) {
			frames = frames.concat(this._collectAllFrames(aFrame));
		}, this);
		return frames;
	},

	_setScrollPosition : function FSW_applyScroll(aXFactor, aYFactor, aFrameIndex)
	{
		if (!this._window || this.scrollPositionSynching)
			return;

		this.scrollPositionSynching++;

		var frames = this._collectAllFrames(this.browser.contentWindow);
		if (!aFrameIndex || aFrameIndex >= frames.length)
			aFrameIndex = 0;

		var frame = frames[aFrameIndex];
		frame.scrollTo(
			(this.syncScrollX ? (aXFactor * frame.scrollMaxX) : frame.scrollX ),
			(this.syncScrollY ? (aYFactor * frame.scrollMaxY) : frame.scrollY )
		);

		var self = this;
		next(function() {
			self.scrollPositionSynching--;
		});
	},

	_onMaximized : function FSW_onMaximized(aFullScreen)
	{
		if (!this._window || !this.parent || this.maximizing)
			return Promise.resolve();

		this.resizing++;
		this.positioning++;
		this.maximizing++;

		var root = this.root;
		try {
			root.readyToMaximize();
		}
		catch(e) {
			this.dumpError(e, 'FoxSplitter: FAILED TO MAXIMIZE!');
			this.resizing--;
			this.positioning--;
			this.maximizing--;
			return Promise.resolve();
		}

		var waitMaximized = this.notMaximizedYet ?
								this._waitDOMEvent(this.window, 'resize')
									.then(function() {
										waitMaximized = null;
									}) :
								null ;

		var stretched = this.stretched;
		var maximizedX, maximizedY, maximizedWidth, maximizedHeight;
		var self = this;
		return (waitMaximized || Promise.resolve())
			.then(function() {
				maximizedX = self.x;
				maximizedY = self.y;
				maximizedWidth = self.width;
				maximizedHeight = self.height;

				var waitRestored = self._waitDOMEvent(self.window, 'resize')
										.then(function() {
											waitRestored = null;
										});

				if (aFullScreen)
					self.window.fullScreen = false;
				else
					self.window.restore();

				return waitRestored;
			})
			.catch(function(aError) {
				self.dumpError(e, 'FoxSplitter: FAILED TO MAXIMIZE!');
			})
			.then(function() {
				self.resizing--;
				self.positioning--;

				if (stretched)
					return self.shrink();
			})
			.then(function() {
				if (root.maximized)
					return root.restore();
				else
					return root.maximizeTo({
						x          : maximizedX,
						y          : maximizedY,
						width      : maximizedWidth,
						height     : maximizedHeight,
						fullScreen : aFullScreen
					});
			})
			.then(function() {
				// fix broken rendering on Windows (workaround)
				return self.resizeBy(0, 1)
						.then(function() {
							return self.resizeBy(0, -1);
						});
			})
			.then(function() {
				self.maximizing--;

				if (stretched)
					return self.stretch();
			})
			.catch(this.defaultHandleError);
	},

	get notMaximizedYet()
	{
		return this.width < this.window.screen.availWidth * 0.8;
	},
	get stillMaximizedYet()
	{
		return this.width >= this.window.screen.availWidth * 0.8;
	},

	// called by the parent group
	setGroupedAppearance : function FSW_setGroupedAppearance()
	{
		this.documentElement.setAttribute(this.MEMBER, true);
		if (this.ui)
			this.ui.setGroupedAppearance();
	},
	updateGroupedAppearance : function FSW_updateGroupedAppearance()
	{
		if (this.ui)
			this.ui.updateGroupedAppearance();
	},
	clearGroupedAppearance : function FSW_clearGroupedAppearance(aOnQuit)
	{
		this.documentElement.removeAttribute(this.MEMBER);
		if (this.ui)
			this.ui.clearGroupedAppearance(aOnQuit);
	},


	getDragInfo : function FSW_getDragInfo(aEvent)
	{
		var dragInfo = {
				tabs     : [],
				links    : [],
				canDrop  : false,
				position : this.POSITION_OUTSIDE,
				allTabs  : false,
				target   : this

			};
		if (aEvent.shiftKey != this.handleDragWithShiftKey)
			return dragInfo;

		var window = this._getDraggedWindow(aEvent);
		if (window) {
			dragInfo.tabs = window.FoxSplitter.visibleTabs;
		}
		else {
			dragInfo.tabs  = this._getDraggedTabs(aEvent);
			dragInfo.links = this._getDraggedLinks(aEvent);
		}

		var sourceFSWindow = dragInfo.tabs.length && dragInfo.tabs[0].ownerDocument.defaultView.FoxSplitter;
		if (sourceFSWindow && sourceFSWindow.visibleTabs.length == dragInfo.tabs.length)
			dragInfo.allTabs = true;

		dragInfo.canDrop = !!(
			dragInfo.tabs.length ?
				(
					this.handleDragWithShiftKey ||
					!this._isEventFiredOnTabbar(aEvent)
				) :
			dragInfo.links.length ?
				(
					this.handleDragWithShiftKey ||
					this._isEventFiredOnDroppable(aEvent)
				) :
				false
		);
		dragInfo.position = this._getDropPosition(aEvent);

		/**
		 * If this window has a parent, then the dragged tab can be
		 * attached to a FoxSplitterGroup itself (not a FoxSplitterWindow).
		 *
		 * However, we must ignore an edge case. If the dragging
		 * will move the window itself and the dragged window is the
		 * sibling of this window, then, Fox Splitter will do following
		 * processes:
		 *
		 *  1. The dragged window is unbound from its parent group.
		 *  2. The parent group of the dragged window automatically
		 *     destroys itself, *because there is only one member left (A)*.
		 *     (If the dragged window is the sibling of this window,
		 *     this window also loses its parent.)
		 *  3. Fox Splitter tries to attach the dragged window to the
		 *     drop target goup.
		 *  4. However, *if the drop target is the parent of both windows
		 *     this and the dragged (B)*, it has been already destroyed
		 *     and we cannot attach the dragged window anymore.
		 *
		 * As the result, Fox Splitter will fail to move the dragged
		 * window. So, we should ignore the "possibly drop target" group
		 * if both (A) and (B) are true.
		 */
		let target = (this.stretched && this.parent) ?
						this.root._lookDownBindTarget(aEvent, dragInfo.position) :
						this._lookUpBindTarget(aEvent, dragInfo.position);
		if (
			target &&
			(target != sourceFSWindow.parent || !dragInfo.allTabs)
			)
			dragInfo.target = target;

		// window move?
		if (dragInfo.canDrop && dragInfo.allTabs && !this.isAccelKeyPressed(aEvent))
			dragInfo.canDrop = (
				// Ignore dropping on the dragged window itself.
				dragInfo.target != sourceFSWindow &&
				(// Ignore dropping to the position between this and the dragged window.
					dragInfo.target != sourceFSWindow.sibling ||
					dragInfo.position != sourceFSWindow.position
				)
			);

		if (!dragInfo.canDrop)
			dragInfo.position = this.POSITION_OUTSIDE;

		return dragInfo;
	},

	_onDragOver : function FSW_onDragOver(aEvent)
	{
		var dragInfo = this.getDragInfo(aEvent);
		if (!dragInfo.canDrop ||
			!(dragInfo.position & this.POSITION_VALID)) {
			this._reserveHideAllDropIndicator();
			return;
		}

		this._cancelReserveHideAllDropIndicator();
		this._reserveHandleDragOver(dragInfo);

		aEvent.dataTransfer.effectAllowed = 'all';
		aEvent.dataTransfer.dropEffect = dragInfo.tabs.length ?
				(this.isAccelKeyPressed(aEvent) ? 'copy' : 'move' ) :
				'link' ;
		aEvent.preventDefault();
	},
	_reserveHandleDragOver : function FSW_reserveHandleDragOver(aDragInfo)
	{
		if (this._reservedHandleDragOver)
			return;

		var self = this;
		this._reservedHandleDragOver = wait(this.acceptDropDelay);
		this._reservedHandleDragOver
			.then(function() {
				delete self._reservedHandleDragOver;
				self._updateDropIndicator(aDragInfo.position, aDragInfo.target);
			})
			.catch(this.defaultHandleError);
	},

	_onDragLeave : function FSW_onDragLeave(aEvent)
	{
		this._reserveHideAllDropIndicator();
	},

	_onDrop : function FSW_onDrop(aEvent)
	{
		var dragInfo = this.getDragInfo(aEvent);
		if (!dragInfo.canDrop)
			return;

		var tabs = dragInfo.tabs;
		var links = dragInfo.links;
		var position = dragInfo.position;
		var target = dragInfo.target;

		FoxSplitterWindow.instances.forEach(function(aFSWindow) {
			aFSWindow.hideDropIndicator();
		});

		if (
			!(position & this.POSITION_VALID) ||
			!this._dropIndicator ||
			this._dropIndicator.state != 'open'
			)
			return;

		aEvent.stopPropagation();
		aEvent.preventDefault();

		if (tabs.length) {
			if (this.isAccelKeyPressed(aEvent) != this.shouldDuplicateOnDrop)
				target.duplicateTabsAt(tabs, position);
			else
				target.moveTabsTo(tabs, position);
		}
		else {
			links = this._filterOnlySafeLinks(links);
			if (!links.length)
				return;
			target.openLinksAt(links, position);
		}
	},
	_filterOnlySafeLinks : function FSW_filterOnlySafeLinks(aURIs, aSourceURI)
	{
		if (!aSourceURI) {
			let currentDragSession = Cc['@mozilla.org/widget/dragservice;1']
										.getService(Ci.nsIDragService)
										.getCurrentSession();
			let sourceDoc = currentDragSession ? currentDragSession.sourceDocument : null ;
			aSourceURI = sourceDoc ? sourceDoc.documentURI : 'file:///' ;
		}

		const SecMan = Cc['@mozilla.org/scriptsecuritymanager;1']
						.getService(Ci.nsIScriptSecurityManager);

		return aURIs.filter(function(aURI) {
			if (aURI.indexOf(' ', 0) != -1 || /^\s*(javascript|data):/.test(aURI))
				return false;
			var normalizedURI = this.makeURIFromSpec(aURI);
			if (normalizedURI && aSourceURI.indexOf('chrome://') < 0) {
				try {
					SecMan.checkLoadURIStr(aSourceURI, normalizedURI.spec, Ci.nsIScriptSecurityManager.STANDARD);
				}
				catch(e) {
					return false;
				}
			}
			return true;
		}, this);
	},

	_onDragEnd : function FSW_onDragEnd(aEvent)
	{
		if (!this._window)
			return;

		next(function() {
			FoxSplitterWindow.instances.forEach(function(aFSWindow) {
				aFSWindow.hideDropIndicator();
			});
		})
		.catch(this.defaultHandleError);
	},

	_getTabFromEvent : function FSW_getTabFromEvent(aEvent)
	{
		var node = aEvent.originalTarget;
		var d = node.ownerDocument;
		if (!d)
			return null;
		return d.evaluate(
				'ancestor-or-self::*[local-name()="tab" and contains(concat(" ", @class, " "), " tabbrowser-tab ")][1]',
				node,
				null,
				Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
	},

	_isEventFiredOnTabbar : function FSW_isEventFiredOnTabbar(aEvent)
	{
		var node = aEvent.originalTarget;
		var d = node.ownerDocument;
		if (!d)
			return false;
		return d.evaluate(
				'ancestor-or-self::*[local-name()="tabs" and contains(concat(" ", @class, " "), " tabbrowser-tabs ")][1]',
				node,
				null,
				Ci.nsIDOMXPathResult.BOOLEAN_TYPE,
				null
			).booleanValue;
	},

	_isEventFiredOnDroppable : function FSW_isEventFiredOnDroppable(aEvent)
	{
		if (!aEvent.originalTarget.ownerDocument)
			return true;

		var inputFieldPattern = here(/*(
				(
					contains(" input INPUT ", concat(" ", local-name(), " ")) and
					contains(" text TEXT file FILE password PASSWORD ", concat(" ", @type, " "))
				) or
				contains(" textarea TEXTAREA ", concat(" ", local-name(), " "))
			)*/);
		var popupPattern = here(/*(
				contains(" popup menupopup panel tooltip ", concat(" ", local-name(), " ")) and
				not(contains(@class, "DROP_INDICATOR_CLASS"))
			)*/).replace(/DROP_INDICATOR_CLASS/g, this.DROP_INDICATOR);
		var undroppablePattern = ('ancestor-or-self::*[local-name()="textbox" or '+inputFieldPattern+' or '+popupPattern+']').replace(/\s\s+/g, ' ');
		return (
			!aEvent.originalTarget.ownerDocument.evaluate(
				undroppablePattern,
				aEvent.originalTarget,
				null,
				Ci.nsIDOMXPathResult.BOOLEAN_TYPE,
				null
			).booleanValue &&
			!aEvent.target.ownerDocument.evaluate(
				undroppablePattern,
				aEvent.target,
				null,
				Ci.nsIDOMXPathResult.BOOLEAN_TYPE,
				null
			).booleanValue
		);
	},

	_getDraggedWindow : function FSW_getDraggedWindow(aEvent)
	{
		var dt = aEvent.dataTransfer;
		if (dt.mozItemCount < 1 || !dt.mozTypesAt(0).contains(this.WINDOW_DROP_TYPE))
			return null;

		return dt.mozGetDataAt(this.WINDOW_DROP_TYPE, 0);
	},

	_getDraggedTabs : function FSW_getDraggedTabs(aEvent)
	{
		var dt = aEvent.dataTransfer;
		var tabs = [];
		if (dt.mozItemCount < 1 || !dt.mozTypesAt(0).contains(this.TAB_DROP_TYPE))
			return tabs;

		for (let i = 0, maxi = dt.mozItemCount; i < maxi; i++)
		{
			tabs.push(dt.mozGetDataAt(this.TAB_DROP_TYPE, i));
		}
		return tabs.sort(function(aA, aB) { return aA._tPos - aB._tPos; });
	},

	_getDraggedLinks : function FSW_getDraggedLinks(aEvent)
	{
		var dt = aEvent.dataTransfer;
		var urls = [];
		for (let i = 0; i < this.LINK_DROP_TYPES.length; i++) {
			let dataType = this.LINK_DROP_TYPES[i];
			for (let i = 0, maxi = dt.mozItemCount; i < maxi; i++)
			{
				let urlData = dt.mozGetDataAt(dataType, i);
				if (urlData) {
					urls = urls.concat(this._retrieveURLsFromData(urlData, dataType));
				}
			}
			if (urls.length)
				break;
		}
		return urls;
	},
	_retrieveURLsFromData : function FSW_retrieveURLsFromData(aData, aType)
	{
		switch (aType)
		{
			case 'text/uri-list':
				return aData.replace(/\r/g, '\n')
							.replace(/^\#.+$/gim, '')
							.replace(/\n\n+/g, '\n')
							.split('\n');

			case 'text/unicode':
			case 'text/plain':
			case 'text/x-moz-text-internal':
				return [aData.replace(/^\s+|\s+$/g, '')];

			case 'text/x-moz-url':
				return [((aData instanceof Ci.nsISupportsString) ? aData.toString() : aData)
							.split('\n')[0]];

			case 'application/x-moz-file':
				let fileHandler = Cc['@mozilla.org/network/io-service;1']
									.getService(Ci.nsIIOService)
									.getProtocolHandler('file')
									.QueryInterface(Ci.nsIFileProtocolHandler);
				return [fileHandler.getURLSpecFromFile(aData)];
		}
		return [];
	},

	_getDropPosition : function FSW_getDropPosition(aEvent)
	{
		var oX = this.x;
		var oY = this.y;
		var x = aEvent.screenX - oX;
		var y = aEvent.screenY - oY;
		var width = this.width;
		var height = this.height;

		// out of area
		if (x < 0 || x > width || y < 0 || y > height)
			return this.POSITION_OUTSIDE;

		// too inside
		if (
			this.dropZoneSize < x && width - this.dropZoneSize > x &&
			this.dropZoneSize < y && height - this.dropZoneSize > y
			)
			return this.POSITION_INSIDE;

		var isTopLeft    = x <= width - (y * width / height);
		var isBottomLeft = x <= y * width / height;

		return (isTopLeft && isBottomLeft) ? this.POSITION_LEFT :
			(isTopLeft && !isBottomLeft) ? this.POSITION_TOP :
			(!isTopLeft && isBottomLeft) ? this.POSITION_BOTTOM :
			this.POSITION_RIGHT ;
	},

	_updateDropIndicator : function FSW_updateDropIndicator(aPosition, aTarget)
	{
		if (!this._window || !(aPosition & this.POSITION_VALID)) {
			this._reserveHideAllDropIndicator();
			return;
		}

		this._cancelReserveHideAllDropIndicator();

		if (this._lastDropPosition != aPosition) {
			let self = this;
			this.hideDropIndicator()
				.then(function() {
					self._showDropIndicatorAt(aPosition, aTarget);
				});
		}
		else if (!this._dropIndicator || this._dropIndicator.state != 'open') {
			this._showDropIndicatorAt(aPosition, aTarget);
		}
	},

	_showDropIndicatorAt : function FSW_showDropIndicatorAt(aPosition, aTarget)
	{
		if (!this._window)
			return Promise.resolve();

		return new Promise((function(aResolve, aReject) {

		var size = 10;
		var indicator = this._dropIndicator;

		if (!indicator) {
			indicator = this._dropIndicator = this.document.createElement('panel');
			indicator.setAttribute('class', this.DROP_INDICATOR+' '+this.positionName[aPosition]);
			let label = indicator.appendChild(this.document.createElement('label'));
			label.style.fontSize = Math.round(size * 0.8)+'px';
			this.documentElement.appendChild(indicator);
		}

		var target = aTarget || this;

		var x = target.x;
		var y = target.y;
		var width  = aPosition & this.POSITION_HORIZONTAL ? size : target.width ;
		var height = aPosition & this.POSITION_VERTICAL ? size : target.height ;
		switch (aPosition)
		{
			case this.POSITION_TOP:
				y = this.y - size;
				indicator.firstChild.setAttribute('value', '\u25B2');
				break;
			case this.POSITION_RIGHT:
				x = this.x + this.width;
				indicator.firstChild.setAttribute('value', '\u25B6');
				break;
			case this.POSITION_BOTTOM:
				y = this.y + this.height;
				indicator.firstChild.setAttribute('value', '\u25BC');
				break;
			case this.POSITION_LEFT:
				x = this.x - size;
				indicator.firstChild.setAttribute('value', '\u25C0');
				break;
		}

		indicator.width = width;
		indicator.height = height;
		indicator.addEventListener('popupshown', function onPopupshown() {
			indicator.removeEventListener('popupshown', onPopupshown, false);
			indicator.style.opacity = 1;
			aResolve();
		}, false);

		indicator.openPopupAtScreen(x, y, false, null);

		this._lastDropPosition = aPosition;

		}).bind(this))
				.catch(this.defaultHandleError);
	},

	hideDropIndicator : function FSW_hideDropIndicator()
	{
		if (!this._window)
			return;

		this._cancelReserveHideAllDropIndicator();

		if (this._reservedHandleDragOver) {
			this._reservedHandleDragOver.cancel();
			delete this._reservedHandleDragOver;
		}

		var indicator = this._dropIndicator;
		if (!indicator) {
			return wait(0);
		}

		indicator.style.opacity = 0;

		var promise;
		if (this.window.getComputedStyle(indicator, null).getPropertyValue('opacity') == '0') {
			promise = wait(0);
		}
		else {
			promise = new Promise(function(aResolve, aReject) {
				indicator.addEventListener('transitionend', function onTransitionend() {
					indicator.removeEventListener('transitionend', onTransitionend, false);
					aResolve();
				}, false);
			});
		}

		var self = this;
		return promise
				.then(function() {
					return self._hideDropIndicatorPostProcess();
				})
				.catch(this.defaultHandleError);
	},
	_hideDropIndicatorPostProcess : function FSW_hideDropIndicatorPostProcess()
	{
		if (!this._window)
			return;

		var promise;

		var indicator = this._dropIndicator;
		delete this._lastDropPosition;

		if (indicator) {
			delete this._dropIndicator;
			if (indicator.state == 'closed') {
				indicator.parentNode.removeChild(indicator);
				promise = wait(0);
			}
			else {
				promise = new Promise(function(aResolve, aReject) {
					indicator.addEventListener('popuphidden', function onPopuphidden() {
						indicator.removeEventListener('popuphidden', onPopuphidden, false);
						indicator.parentNode.removeChild(indicator);
						aResolve();
					}, false);
					indicator.hidePopup();
				});
			}
		}
		else {
			promise = wait(0);
		}
		return promise
				.catch(this.defaultHandleError);
	},

	_reserveHideAllDropIndicator : function FSW_reserveHideAllDropIndicator()
	{
		this._cancelReserveHideAllDropIndicator();
		var self = this;
		this._reservedHideAllDropIndicator = next(function() {
			self._reservedHideAllDropIndicator = undefined;
			FoxSplitterWindow.instances.forEach(function(aFSWindow) {
				aFSWindow.hideDropIndicator();
			});
		});
		this._reservedHideAllDropIndicator.catch(this.defaultHandleError);
	},

	_cancelReserveHideAllDropIndicator : function FSW_cancelReserveHideAllDropIndicator()
	{
		if (!this._reservedHideAllDropIndicator)
			return;
		this._reservedHideAllDropIndicator.cancel();
		this._reservedHideAllDropIndicator = undefined;
	},

	get _reservedHideAllDropIndicator()
	{
		return FoxSplitterWindow._reservedHideAllDropIndicator;
	},
	set _reservedHideAllDropIndicator(aValue)
	{
		return FoxSplitterWindow._reservedHideAllDropIndicator = aValue;
	},


	_onTabViewShown : function FSW_onTabViewShown()
	{
		this.stretch();
	},

	_onTabViewHidden : function FSW_onTabViewHidden()
	{
		this.shrink();
	},

	_onSplitRequestFromContent : function FSW_onSplitRequestFromContent(aEvent)
	{
		var sourceEvent = aEvent.sourceEvent;
		if (!sourceEvent || sourceEvent.type.indexOf('SubBrowserAddRequest') != 0)
			return;

		var type = sourceEvent.type;
		var position = type.match(/pos(?:ition)?\s*=\s*(top|right|bottom|left|tab)/i)
		if (!position)
			return;

		position = position[1].toUpperCase();

		var target = aEvent.originalTarget;
		var frame = !('nodeType' in target) ? target :
				(target.nodeType == Ci.nsIDOMNode.DOCUMENT_NODE) ? target.defaultView :
				target.ownerDocument.defaultView;
		var uri = type.match(/ur[li]\s*=\s*([^\&\;]*)/i);
		uri = uri ? decodeURIComponent(uri[1]) : 'about:blank' ;

		var uris = this._filterOnlySafeLinks([uri], frame.location.href);
		if (!uris.length)
			return;

		uri = uris[0];
		if (position == 'TAB') {
			this.browser.loadOneTab(uri, {
				referrerURI  : this.makeURIFromSpec(frame.location.href),
				inBackground : prefs.getPref('browser.tabs.loadDivertedInBackground')
			});
		}
		else {
			this.openLinkAt(uri, this['POSITION_'+position]);
		}
	},

	_onUnsplitRequestFromContent : function FSW_onUnsplitRequestFromContent(aEvent)
	{
		this.close(true);
	},


	// compatibility for old versions

	LAYOUT_GRID      : FoxSplitterBase.prototype.TILE_MODE_GRID,
	LAYOUT_ON_X_AXIS : FoxSplitterBase.prototype.TILE_MODE_X_AXIS,
	LAYOUT_ON_Y_AXIS : FoxSplitterBase.prototype.TILE_MODE_Y_AXIS,

	get activeBrowser()
	{
		return this.browser;
	},

	get browsers()
	{
		return [];
	},

	collapseAllSubBrowsers : function FSW_collapseAllSubBrowsers()
	{
	},

	expandAllSubBrowsers : function FSW_collapseAllSubBrowsers()
	{
	},

	addSubBrowser : function FSW_addSubBrowser(aURI, aTargetSubBrowser, aPosition)
	{
		this.openLinkAt(aURI, aPosition);
		return null;
	},

	addSubBrowserFromTab : function FSW_addSubBrowser(aTab, aPosition, aPositionTarget, aCopy)
	{
		if (aCopy)
			this.duplicateTabAt(aTab, aPosition);
		else
			this.moveTabTo(aTab, aPosition);
		return null;
	},

	getSubBrowserAndBrowserFromFrame : function FSW_getSubBrowserAndBrowserFromFrame(aFrame)
	{
		if (aFrame && this._window) {
			aFrame= aFrame.top || aFrame;
			let browsers = this.browser.browsers;
			for (let i = 0, maxi = browsers.length; i < maxi; i++)
			{
				if (browsers[i].contentWindow == aFrame)
					return {
						subBrowser : null,
						browser    : browsers[i]
					};
			}
		}

		return {
			subBrowser : null,
			browser    : null
		};
	}
});

FoxSplitterBase.prototype.memberClass = FoxSplitterWindow;

FoxSplitterWindow.instances = [];
FoxSplitterWindow.instancesById = {};
FoxSplitterWindow.positioning = 0;
FoxSplitterWindow.resizing = 0;
FoxSplitterWindow.raising = 0;

FoxSplitterWindow.shouldDuplicateOnDrop = prefs.getPref(domain+'shouldDuplicateOnDrop');
FoxSplitterWindow.acceptDropDelay = prefs.getPref(domain+'acceptDropDelay');
FoxSplitterWindow.dropZoneSize = prefs.getPref(domain+'dropZoneSize');
FoxSplitterWindow.handleDragWithShiftKey = prefs.getPref(domain+'handleDragWithShiftKey');
FoxSplitterWindow.syncScrollX = prefs.getPref(domain+'syncScrollX');
FoxSplitterWindow.syncScrollY = prefs.getPref(domain+'syncScrollY');
FoxSplitterWindow.fixMispositoning = prefs.getPref(domain+'fixMispositoning');
FoxSplitterWindow.methodToRaiseWindow = prefs.getPref(domain+'methodToRaiseWindow');

FoxSplitterWindow.IMPORT_NOTHING     = FoxSplitterConst.IMPORT_NOTHING;
FoxSplitterWindow.IMPORT_ALL         = FoxSplitterConst.IMPORT_ALL;
FoxSplitterWindow.IMPORT_ONLY_HIDDEN = FoxSplitterConst.IMPORT_ONLY_HIDDEN;
FoxSplitterWindow.importTabsFromClosedSibling = prefs.getPref(domain+'importTabsFromClosedSibling');

var prefListener = {
		domain : domain,
		observe : function FSWPL_observe(aSubject, aTopic, aData) {
			if (aTopic != 'nsPref:changed')
				return;

			var prefName = aData.replace(domain, '');
			if (prefName in FoxSplitterWindow) {
				FoxSplitterWindow[prefName] = prefs.getPref(aData);
			}
			else {
				switch (prefName)
				{
					case 'platformOffset.x':
					case 'platformOffset.y':
					case 'platformOffset.width':
					case 'platformOffset.height':
						return FoxSplitterWindow.instances.forEach(function(aFSWindow) {
							var root = aFSWindow.root;
							if (root)
								root.reserveResetPositionAndSize(null, true);
						});
				}
			}
		}
	};

prefs.addPrefListener(prefListener);

function shutdown()
{
	prefs.removePrefListener(prefListener);
	prefs = undefined;
	here = undefined;
	FoxSplitterConst = undefined;
}
