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

load('lib/jsdeferred');
load('lib/prefs');

var EXPORTED_SYMBOLS = ['FoxSplitterBase'];

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);

const WindowWatcher = Cc['@mozilla.org/embedcomp/window-watcher;1']
						.getService(Ci.nsIWindowWatcher);

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

function FoxSplitterBase() 
{
}
FoxSplitterBase.prototype = {
	__proto__ : FoxSplitterConst,

	newMemberFactor : 0.5,
	normalExpandFactor : 1.2,
	get expandFactor()
	{
		return this.maximized ? 1 : this.normalExpandFactor ;
	},

	get shouldDuplicateOnSplit() { return FoxSplitterBase.shouldDuplicateOnSplit; },
	set shouldDuplicateOnSplit(aValue) { return FoxSplitterBase.shouldDuplicateOnSplit = aValue; },

	get offsetX() { return FoxSplitterBase.offsetX; },
	get offsetY() { return FoxSplitterBase.offsetY; },
	get offsetWidth() { return FoxSplitterBase.offsetWidth; },
	get offsetHeight() { return FoxSplitterBase.offsetHeight; },
	get shouldKeepSizeRatioOnResize() { return FoxSplitterBase.shouldKeepSizeRatioOnResize; },
	set shouldKeepSizeRatioOnResize(aValue) { return FoxSplitterBase.shouldKeepSizeRatioOnResize = aValue; },

	isGroup : false,

	get root()
	{
		var parent = this;
		while (parent.parent)
		{
			parent = parent.parent;
		}
		return (parent && parent != this) ? parent : null ;
	},

	get sameAxisRoot()
	{
		var parent = this;
		var isHorizontal = this.position & this.POSITION_HORIZONTAL;
		while (
				parent.parent &&
				(parent.position & this.POSITION_HORIZONTAL) == isHorizontal
			)
		{
			parent = parent.parent;
		}
		return (parent && parent != this) ? parent : this.parent ;
	},

	get sibling()
	{
		var parent = this.parent;
		if (!parent || parent.members.length < 2)
			return null;

		var otherMembers = parent.members.filter(function(aMember) {
				return aMember != this;
			}, this);
		return otherMembers[0];
	},
	get topSibling() { return this.getSiblingAt(this.POSITION_TOP); },
	get bottomSibling() { return this.getSiblingAt(this.POSITION_BOTTOM); },
	get rightSibling() { return this.getSiblingAt(this.POSITION_RIGHT); },
	get leftSibling() { return this.getSiblingAt(this.POSITION_LEFT); },

	getSiblingAt : function FSB_getSiblingAt(aPosition)
	{
		if (!this.parent)
			return null;

		var current = this;
		var sibling;
		while (
			current &&
			(sibling = current.sibling) &&
			current.sibling.position != aPosition
		)
		{
			current = current.parent;
		}
		return sibling;
	},


	// group management

	createGroup : function FSB_createGroup()
	{
		if (!this.groupClass)
			throw new Error('no constructor for groups');

		return new this.groupClass();
	},

	bindWith : function FSB_bindWith(aSibling, aOptions) /* PUBLIC API */
	{
		aOptions = aOptions || {};

		var position   = aOptions.position;
		var silent     = aOptions.silent;
		var mainWindow = aOptions.mainWindow;
		if (typeof aOptions != 'object') { // for backward compatibility
			position = arguments[1];
			silent   = arguments.length > 2 ? arguments[2] : false ;
		}

		if (!aSibling || !(position & this.POSITION_VALID))
			return Deferred.next(function() {});

		this.binding++;

		var deferreds = [];

		mainWindow = (
			mainWindow ||
			aSibling.main && aSibling.root.mainWindow ||
			this.main && this.root.mainWindow
		);

		if (this.parent)
			this.unbind();

		if (!this.parent && this.maximized)
			this.restore();
		if (!aSibling.parent && aSibling.maximized)
			aSibling.restore();

		var newGroup = this.createGroup();

		var existingGroup = aSibling.parent;
		if (existingGroup) {
			// swap existing relations
			newGroup.position = aSibling.position;
			existingGroup.register(newGroup);
			existingGroup.unregister(aSibling);
		}

		newGroup.register(aSibling);
		newGroup.register(this);

		this.position = position;
		aSibling.position = this.opposite[position];

		if (!silent)
			deferreds.push(this._initPositionAndSize());

		this.setGroupedAppearance();
		if (!this.isGroup) {
			this.saveState();

			let self = this;
			let binding = this.binding;
			deferreds.push(Deferred.next(function() {
				if (!binding) {
					let event = self.document.createEvent('Events');
					event.initEvent(self.EVENT_TYPE_SPLIT, true, false);
					self.document.dispatchEvent(event);
				}

				self.active = self.active; // update status of grouped windows
			}));
		}

		aSibling.setGroupedAppearance();
		if (!aSibling.isGroup) {
			aSibling.saveState();

			deferreds.push(Deferred.next(function() {
				let event = aSibling.document.createEvent('Events');
				event.initEvent(aSibling.EVENT_TYPE_SPLIT, true, false);
				aSibling.document.dispatchEvent(event);
			}));
		}

		if (mainWindow)
			mainWindow.main = true;
		else if (!this.isGroup && this.main && aSibling.main)
			aSibling.main = true;

		this.binding--;

		return deferreds.length > 1 ?
				Deferred.parallel(deferreds) :
			deferreds.length ?
				deferreds[0] :
				Deferred.next(function() {}) ;
	},

	_initPositionAndSize : function FSB_initPositionAndSize()
	{
		var base = this.sibling;
		var positionAndSize = base.calculatePositionAndSizeFor(this.position);

		var deferreds = [];
		if (positionAndSize.base.deltaX || positionAndSize.base.deltaY)
			base.moveBy(positionAndSize.base.deltaX, positionAndSize.base.deltaY);
		if (positionAndSize.base.deltaWidth || positionAndSize.base.deltaHeight)
			deferreds.push(base.resizeBy(positionAndSize.base.deltaWidth, positionAndSize.base.deltaHeight));

		if (this.x != positionAndSize.x || this.y != positionAndSize.y)
			this.moveTo(positionAndSize.x, positionAndSize.y);
		if (this.width != positionAndSize.width || this.height != positionAndSize.height)
			deferreds.push(this.resizeTo(positionAndSize.width, positionAndSize.height));

		var self = this;
		return (deferreds.length > 1 ?
					Deferred.parallel(deferreds) :
				deferreds.length ?
					deferreds[0] :
					Deferred )
					.next(function() {
						return base.parent.resetPositionAndSize(base);
					});
	},

	calculatePositionAndSizeFor : function FSB_calculatePositionAndSizeFor(aPosition)
	{
		var x, y, width, height;
		var base = {
				deltaX      : 0,
				deltaY      : 0,
				deltaWidth  : 0,
				deltaHeight : 0
			};
		var group = (this.isGroup && this || this.root);
		var maximized = this.maximized;
		var baseWindow = (group && group.allWindows[0] || this).window;
		if (aPosition & this.POSITION_HORIZONTAL) {
			y = this.y;
			let baseWidth = maximized ?
							this.width :
							Math.min(baseWindow.screen.availWidth, this.width * this.expandFactor) ;
			let deltaX = Math.round((baseWidth - this.width) / 2);
			width = Math.round(baseWidth * this.newMemberFactor);
			height = this.height;
			if (aPosition == this.POSITION_LEFT) {
				x = this.x - (deltaX * 2);
				base.deltaX = width - (deltaX * 2);
			}
			else {
				x = this.x + baseWidth - width;
			}
			base.deltaWidth = -width + (deltaX * 2);
		}
		else {
			x = this.x;
			width = this.width;
			let baseHeight = maximized ?
							this.height :
							Math.min(baseWindow.screen.availHeight, this.height * this.expandFactor) ;
			let deltaY = Math.round((baseHeight - this.height) / 2);
			height = Math.round(baseHeight * this.newMemberFactor);
			if (aPosition == this.POSITION_TOP) {
				y = this.y - (deltaY * 2);
				base.deltaY = height - (deltaY * 2);
			}
			else {
				y = this.y + baseHeight - height;
			}
			base.deltaHeight = -height + (deltaY * 2);
		}
		return {
			x      : x,
			y      : y,
			width  : width,
			height : height,
			base   : base
		};
	},

	_findBindTarget : function FSB_findBindTarget(aEvent, aPosition)
	{
		var parent = this.parent;
		if (!parent)
			return this;

		if (aPosition & this.POSITION_HORIZONTAL &&
			this.position & this.POSITION_VERTICAL) {
			let y = aEvent.screenY - this.y;
			let area = this.height / 3;
			if (y > area && y < area * 2)
				return this;
		}
		else if (aPosition & this.POSITION_VERTICAL &&
				this.position & this.POSITION_HORIZONTAL) {
			let x = aEvent.screenX - this.x;
			let area = this.width / 3;
			if (x > area && x < area * 2)
				return this;
		}

		return this.parent._findBindTarget(aEvent, aPosition);
	},

	unbind : function FSB_unbind(aSilent) /* PUBLIC API */
	{
		if (!this.parent)
			return;

		var sibling = this.sibling;

		if (!aSilent)
			this._expandSibling();

		let lastMainWindow = this.root.mainWindow;

		this.parent.unregister(this);

		this.updateGroupedAppearance();
		if (!this.isGroup) {
			if (!aSilent)
				this.saveState();

			if (!this.binding) {
				this.clearGroupedAppearance();

				let event = this.document.createEvent('Events');
				event.initEvent(this.EVENT_TYPE_UNSPLIT, true, false);
				this.document.dispatchEvent(event);
			}
		}
		if (lastMainWindow)
			lastMainWindow.main = true;

		if (!this.root || !this.root.mainWindow)
			this.main = true;

		if (sibling) {
			sibling.updateGroupedAppearance();
			if (!sibling.isGroup) {
				if (!aSilent)
					sibling.saveState();

				if (!sibling.parent) {
					sibling.clearGroupedAppearance();

					let event = sibling.document.createEvent('Events');
					event.initEvent(sibling.EVENT_TYPE_UNSPLIT, true, false);
					sibling.document.dispatchEvent(event);
				}
			}
			if (!sibling.root || !sibling.root.mainWindow)
				sibling.main = true;
		}
	},

	unbindAsIndependent : function FSB_unbindAsIndependent(aX, aY) /* PUBLIC API */
	{
		if (!this.parent)
			return;

		var root = this.root;
		var x = aX !== undefined ? aX : root.x + 16 ;
		var y = aY !== undefined ? aY : root.y + 16 ;
		var width = Math.round(root.width / this.normalExpandFactor);
		var height = Math.round(root.height / this.normalExpandFactor);
		this.unbind();
		this.resizeTo(width, height);
		this.moveTo(x, y);
	},

	_expandSibling : function FSB_expandSibling()
	{
		var sibling = this.sibling;
		if (!sibling)
			return Deferred.next(function() {});

		var deferred;
		if (sibling.position & this.POSITION_HORIZONTAL) {
			let totalWidth = this.parent.width;
			let deltaX = this.maximized ? 0 : Math.round(totalWidth - (totalWidth / this.expandFactor)) ;
			if (sibling.position == this.POSITION_RIGHT) {
				// if this is a member of a nested groups, we should not move whole groups right.
				let deltaXToMove = sibling.parent.parent ? 0 : deltaX ;
				sibling.moveBy(-this.width + deltaXToMove, 0);
			}
			deferred = sibling.resizeBy(this.width - deltaX, 0);
		}
		else {
			let totalHeight = this.parent.height;
			let deltaY = this.maximized ? 0 : Math.round(totalHeight - (totalHeight / this.expandFactor)) ;
			if (sibling.position == this.POSITION_BOTTOM) {
				// if this is a member of a nested groups, we should not move whole groups bottom.
				let deltaYToMove = sibling.parent.parent ? 0 : deltaY ;
				sibling.moveBy(0, -this.height + deltaYToMove);
			}
			deferred = sibling.resizeBy(0, this.height - deltaY);
		}

		let parent = sibling.parent.parent;
		if (parent) {
			(deferred || Deferred)
				.next(function() {
					return parent.resetPositionAndSize(sibling);
				});
		}
	},


	// commands to create new pane

	_openWindow : function FSB_openWindow(aURIOrTab, aPositionAndSize)
	{
		var options = [
				'chrome,dialog=no,all',
				'screenX='+aPositionAndSize.x,
				'screenY='+aPositionAndSize.y,
				'outerWidth='+aPositionAndSize.width - this.offsetWidth,
				'outerHeight='+aPositionAndSize.height - this.offsetHeight
			].join(',');
		var deferred = new Deferred();

		var arg = aURIOrTab;
		if (!(arg instanceof Ci.nsISupports)) {
			let array = Cc['@mozilla.org/supports-array;1']
						.createInstance(Ci.nsISupportsArray);
			let variant = Cc['@mozilla.org/variant;1']
							.createInstance(Ci.nsIVariant)
							.QueryInterface(Ci.nsIWritableVariant);
			variant.setFromVariant(arg);
			array.AppendElement(variant);
			arg = array;
		}

		var window = WindowWatcher.openWindow(
				this._window || null,
				'chrome://browser/content/browser.xul',
				'_blank',
				options,
				arg
			);
		var self = this;

		/**
		 * Browser windows inherits screenX/screenY/width/height from the last
		 * browser window. We have to override them after those values are applied
		 * from localstore.rdf.
		 */
		window.addEventListener('DOMContentLoaded', function(aEvent) {
			window.removeEventListener(aEvent.type, arguments.callee, false);
			var root = window.document.documentElement;
			root.setAttribute('screenX', aPositionAndSize.x);
			root.setAttribute('screenY', aPositionAndSize.y);
			root.setAttribute('width', aPositionAndSize.width);
			root.setAttribute('height', aPositionAndSize.height);
		}, false);

		window.addEventListener(this.EVENT_TYPE_READY, function(aEvent) {
			if (window) {
				window.removeEventListener(aEvent.type, arguments.callee, false);
				deferred.call(window);
				window = undefined;
			}
			else {
				deferred.fail(new Error(aEvent.type+' event is handled twice.'));
			}
		}, false);

		return deferred
				.next(function(aWindow) {
					var sv = aWindow.FoxSplitter;

					if (sv.x != aPositionAndSize.x || sv.y != aPositionAndSize.y)
						sv.moveTo(aPositionAndSize.x, aPositionAndSize.y);

					if (sv.width != aPositionAndSize.width || sv.height != aPositionAndSize.height)
						return sv.resizeTo(aPositionAndSize.width, aPositionAndSize.height)
								.next(function() {
									return aWindow;
								});

					return aWindow;
				})
				.error(this.defaultHandleError);
	},

	openLinksAt : function FSB_openLinksAt(aURIs, aPosition, aOptions) /* PUBLIC API */
	{
		aURIs = aURIs.slice(0);
		var first = aURIs.shift(); // only the first element can be tab

		var maximized = !this.parent && !this.isGroup && this.maximized;
		var waitRestored = maximized ?
						this.restore() :
						null ;
		var self = this;
		var lastMainWindow = (this.parent && this.root.mainWindow) || this;
		return (waitRestored || Deferred)
				.next(function() {
					let positionAndSize = self.calculatePositionAndSizeFor(aPosition);
					return self._openWindow(first, positionAndSize)
				})
				.next(function(aWindow) {
					return aWindow.FoxSplitter.bindWith(self, {
								position   : aPosition,
								mainWindow : lastMainWindow
							})
								.next(function() {
									return aWindow;
								});
				})
				.next(function(aWindow) {
					aURIs.forEach(function(aURI) {
						aWindow.gBrowser.addTab(aURI);
					});

					if (!maximized)
						return aWindow;

					self.root.readyToMaximize();
					var waitMaximized = self._waitDOMEvent(self.window, self.EVENT_TYPE_WINDOW_STATE_CHANGED)
							.next(function() {
								waitMaximized = null;
								return aWindow;
							});
					self.maximize();
					return waitMaximized || aWindow;
				})
				.error(this.defaultHandleError);
	},

	openLinkAt : function FSB_openLinkAt(aURIOrTab, aPosition, aOptions) /* PUBLIC API */
	{
		return this.openLinksAt([aURIOrTab], aPosition, aOptions);
	},

	duplicateTabsAt : function FSB_duplicateTabsAt(aTabs, aPosition, aOptions) /* PUBLIC API */
	{
		aOptions = aOptions || {};
		var self = this;
		return this.openLinkAt('about:blank', aPosition)
				.next(function(aWindow) {
					var firstTab = aWindow.gBrowser.selectedTab;
					var tabs = aWindow.FoxSplitter.duplicateTabs(aTabs);
					aWindow.gBrowser.removeTab(firstTab);
					if (aOptions.scrollToSplitPosition)
						self._scrollTabsToSplitPosition(aTabs, tabs, aPosition);
					return aWindow;
				})
				.error(this.defaultHandleError);
	},
	duplicateTabAt : function FSB_duplicateTabAt(aTab, aPosition, aOptions) /* PUBLIC API */
	{
		return this.duplicateTabsAt([aTab], aPosition, aOptions);
	},
	_scrollTabsToSplitPosition : function FSB_scrollTabsToSplitPosition(aSourceTabs, aNewTabs, aPosition)
	{
		aSourceTabs.forEach(function(aSourceTab, aIndex) {
			this._scrollTabToSplitPosition(aSourceTab, aNewTabs[aIndex], aPosition);
		}, this);
	},
	_scrollTabToSplitPosition : function FSB_scrollTabToSplitPosition(aSourceTab, aNewTab, aPosition)
	{
		if (aPosition & this.POSITION_AFTER) {
			let browser = aNewTab.linkedBrowser;
			let scrollSize = aPosition == this.POSITON_RIGHT ?
							{
								x : browser.boxObject.width,
								y : 0,
							} :
							{
								x : 0,
								y : browser.boxObject.height,
							} ;
			let self = this;
			aNewTab.addEventListener('SSTabRestored', function() {
				aNewTab.removeEventListener('SSTabRestored', arguments.callee, false);
				browser.contentWindow.setTimeout(function() {
					self._scrollContentToSplitPosition(browser.contentWindow, scrollSize);
				}, 0);
			}, false);
		}
		else {
			let browser = aSourceTab.linkedBrowser;
			let scrollSize = aPosition == this.POSITON_LEFT ?
							{
								x : browser.boxObject.width,
								y : 0,
							} :
							{
								x : 0,
								y : browser.boxObject.height,
							} ;
			this._scrollContentToSplitPosition(browser.contentWindow, scrollSize);
		}
	},
	_scrollContentToSplitPosition : function FSB_scrollContentToSplitPosition(aWindow, aScrollSize)
	{
		var root = aWindow.document.documentElement;
		var currentX = aWindow.scrollX;
		var currentY = aWindow.scrollY;
		aWindow.scrollBy(aScrollSize.x, aScrollSize.y);
		root.setAttribute(this.SCROLLED_X, currentX + '=>' + aWindow.scrollX);
		root.setAttribute(this.SCROLLED_Y, currentY + '=>' + aWindow.scrollY);
	},
	_restoreSiblingScrollPosition : function FSB_restoreSiblingScrollPosition()
	{
		let sibling = this.sibling;
		if (sibling.isGroup)
			return;

		sibling.allTabs.forEach(function(aTab) {
			var window = aTab.linkedBrowser.contentWindow;
			var root = window.document.documentElement;
			var deltaX = 0;
			var deltaY = 0;
			var x = root.getAttribute(this.SCROLLED_X);
			if (x) {
				x = x.split('=>');
				if (x.length == 2) {
					deltaX = Number(x[1]) - Number(x[0]);
					if (isNaN(deltaX)) deltaX = 0;
				}
			}
			var y = root.getAttribute(this.SCROLLED_Y);
			if (y) {
				y = y.split('=>');
				if (y.length == 2) {
					deltaY = Number(y[1]) - Number(y[0]);
					if (isNaN(deltaY)) deltaY = 0;
				}
			}
			if (deltaX || deltaY)
				window.scrollBy(-deltaX, -deltaY);
		}, sibling);
	},

	moveTabsTo : function FSB_moveTabsTo(aTabs, aPosition, aOptions) /* PUBLIC API */
	{
		aTabs = aTabs.slice(0);

		var windowMove = this.shouldMoveWindow(aTabs);

		// Multiple Tab Handler moves selected tabs, so we should process only one tab.
		var selectedTabs = this._filterSelectedTabs(aTabs);
		if (
			'MultipleTabService' in aTabs[0].ownerDocument.defaultView &&
			selectedTabs.length
			)
			aTabs = [selectedTabs[0]];

		if (windowMove)
			return this.moveWindowTo(aTabs[0].ownerDocument.defaultView, aPosition);

		return this.openLinkAt('about:blank', aPosition)
				.next(function(aWindow) {
					var firstTab = aWindow.gBrowser.selectedTab;
					aWindow.FoxSplitter.importTabs(aTabs);
					aWindow.gBrowser.removeTab(firstTab);
					return aWindow;
				})
				.error(this.defaultHandleError);
	},
	moveTabTo : function FSB_moveTabTo(aTab, aPosition, aOptions) /* PUBLIC API */
	{
		return this.moveTabsTo([aTab], aPosition, aOptions);
	},

	moveWindowTo : function FSB_moveWindowTo(aDOMWindow, aPosition, aOptions) /* PUBLIC API */
	{
		if (aDOMWindow.FoxSplitter != this) {
			let lastMainWindow = this.mainWindow || this;
			return aDOMWindow.FoxSplitter.bindWith(this, {
						position   : aPosition,
						mainWindow : lastMainWindow
					})
					.next(function() {
						return aDOMWindow;
					});
		}

		return Deferred.next(function() {
			return aDOMWindow;
		});
	},

	splitTabsTo : function FSB_splitTabsTo(aTabs, aPosition, aOptions) /* PUBLIC API */
	{
		aOptions = aOptions || {};

		// for backward compatibility
		if (aOptions instanceof Ci.nsIDOMEvent)
			aOptions = { triggerEvent : aOptions };

		if (this.shouldDuplicateOnSplit != this.isMiddleClick(aOptions.triggerEvent))
			return this.duplicateTabsAt(aTabs, aPosition, aOptions);
		else
			return this.moveTabsTo(aTabs, aPosition, aOptions);
	},

	splitTabTo : function FSB_splitTabTo(aTab, aPosition, aOptions) /* PUBLIC API */
	{
		return this.splitTabsTo([aTab], aPosition, aOptions);
	},


	// handling of window resizing

	reserveMoveBy : function FSB_reserveMoveBy(aDX, aDY)
	{
		if (this._reservedMoveBy) {
			this._reservedMoveBy.cancel();
			delete this._reservedMoveBy;
		}

		this._reservedMoveDeltaX = (this._reservedMoveDeltaX || 0) + aDX;
		this._reservedMoveDeltaY = (this._reservedMoveDeltaY || 0) + aDY;

		var self = this;
		this._reservedMoveBy = Deferred.next(function() {
			self.moveBy(self._reservedMoveDeltaX, self._reservedMoveDeltaY);
			delete self._reservedMoveDeltaX;
			delete self._reservedMoveDeltaY
			delete self._reservedMoveBy;
		});
		this._reservedMoveBy.error(this.defaultHandleError);
	},

	reserveResizeBy : function FSB_reserveResizeBy(aDW, aDH)
	{
		if (this._reservedResizeBy) {
			this._reservedResizeBy.cancel();
			delete this._reservedResizeBy;
		}

		this._reservedResizeDeltaWidth = (this._reservedResizeDeltaWidth || 0) + aDW;
		this._reservedResizeDeltaHeight = (this._reservedResizeDeltaHeight || 0) + aDH;

		var self = this;
		this._reservedResizeBy = Deferred.next(function() {
			self.resizeBy(self._reservedResizeDeltaWidth, self._reservedResizeDeltaHeight);
			delete self._reservedResizeDeltaWidth;
			delete self._reservedResizeDeltaHeight
			delete self._reservedResizeBy;
		});
		this._reservedResizeBy.error(this.defaultHandleError);
	},

	onResizeTop : function FSB_onResizeTop(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_TOP) {
				splitterResizing = true;
				if (!sibling.collapsed) sibling.resizeBy(0, -aDelta);
			}
			else if (sibling.position == this.POSITION_BOTTOM) {
				if (!sibling.collapsed) {
					let resizeDelta = this.shouldKeepSizeRatioOnResize ? Math.round(aDelta / 2) : 0 ;
					if (resizeDelta) {
						this.reserveResizeBy(0, -resizeDelta);
						sibling.reserveResizeBy(0, aDelta - resizeDelta);
						sibling.reserveMoveBy(0, -resizeDelta);
					}
				}
			}
			else { // horizontal slbling
				sibling.moveBy(0, -aDelta);
				sibling.resizeBy(0, aDelta)
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeTop(aDelta);
	},

	onResizeRight : function FSB_onResizeRight(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_RIGHT) {
				splitterResizing = true;
				sibling.moveBy(aDelta, 0);
				if (!sibling.collapsed) sibling.resizeBy(-aDelta, 0);
			}
			else if (sibling.position == this.POSITION_LEFT) {
				if (!sibling.collapsed) {
					let resizeDelta = this.shouldKeepSizeRatioOnResize ? Math.round(aDelta / 2) : 0 ;
					if (resizeDelta) {
						// resize before move, to prevent unexpected resizing fired by window move
						this.reserveResizeBy(-(aDelta - resizeDelta), 0);
						this.reserveMoveBy(resizeDelta, 0);
						sibling.reserveResizeBy(resizeDelta, 0);
					}
				}
			}
			else { // vertical slbling
				sibling.resizeBy(aDelta, 0);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeRight(aDelta);
	},

	onResizeBottom : function FSB_onResizeBottom(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_BOTTOM) {
				splitterResizing = true;
				sibling.moveBy(0, aDelta);
				if (!sibling.collapsed) sibling.resizeBy(0, -aDelta);
			}
			else if (sibling.position == this.POSITION_TOP) {
				if (!sibling.collapsed) {
					let resizeDelta = this.shouldKeepSizeRatioOnResize ? Math.round(aDelta / 2) : 0 ;
					if (resizeDelta) {
						// resize before move, to prevent unexpected resizing fired by window move
						this.reserveResizeBy(0, -(aDelta - resizeDelta));
						this.reserveMoveBy(0, resizeDelta);
						sibling.reserveResizeBy(0, resizeDelta);
					}
				}
			}
			else { // horizontal slbling
				sibling.resizeBy(0, aDelta);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeBottom(aDelta);
	},

	onResizeLeft : function FSB_onResizeLeft(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_LEFT) {
				splitterResizing = true;
				if (!sibling.collapsed) sibling.resizeBy(-aDelta, 0);
			}
			else if (sibling.position == this.POSITION_RIGHT) {
				if (!sibling.collapsed) {
					let resizeDelta = this.shouldKeepSizeRatioOnResize ? Math.round(aDelta / 2) : 0 ;
					if (resizeDelta) {
						this.reserveResizeBy(-resizeDelta, 0);
						sibling.reserveMoveBy(-resizeDelta, 0);
						sibling.reserveResizeBy(aDelta - resizeDelta, 0);
					}
				}
			}
			else { // vertical sibling
				sibling.moveBy(-aDelta, 0);
				sibling.resizeBy(aDelta, 0);
				this.parent.reserveResetPositionAndSize(this);
			}
		}
		var parent = this.parent;
		if (!splitterResizing && parent)
			parent.onResizeLeft(aDelta);
	},


	// utility methods

	makeURIFromSpec : function FSB_makeURIFromSpec(aURI) 
	{
		const IOService = Cc['@mozilla.org/network/io-service;1']
							.getService(Ci.nsIIOService);
		var newURI;
		aURI = aURI || '';
		if (aURI && String(aURI).indexOf('file:') == 0) {
			let fileHandler = IOService.getProtocolHandler('file')
								.QueryInterface(Ci.nsIFileProtocolHandler);
			let tempLocalFile = fileHandler.getFileFromURLSpec(aURI);
			newURI = IOService.newFileURI(tempLocalFile);
		}
		else {
			if (!/^\w+\:/.test(aURI)) aURI = 'http://'+aURI;
			newURI = IOService.newURI(aURI, null, null);
		}
		return newURI;
	},

	isAccelKeyPressed : function FSB_isAccelKeyPressed(aEvent)
	{
		return aEvent && (XULAppInfo.OS == 'Darwin' ? aEvent.metaKey : aEvent.ctrlKey );
	},

	isMiddleClick : function FSB_isMiddleClick(aEvent)
	{
		return (
			aEvent &&
			aEvent.type == 'click' &&
			(
				aEvent.button == 1 ||
				(aEvent.button == 0 && this.isAccelKeyPressed(aEvent))
			)
		);
	},

	getTabBrowserFromTab : function FSB_getTabBrowserFromTab(aTab)
	{
		return aTab.ownerDocument.defaultView.FoxSplitter.browser;
	},

	shouldMoveWindow : function FSB_shouldMoveWindow(aTabs)
	{
		var tabs = aTabs.slice(0);

		var browser = this.getTabBrowserFromTab(tabs[0]);
		var allTabs = browser.visibleTabs || browser.mTabContainer.childNodes;

		var windowMove = allTabs.length == tabs.length;
		var selectedTabs = this._filterSelectedTabs(tabs);

		// Tree Style Tabs tries to move the dragged tab with descendant tabs.
		if ('treeStyleTab' in browser && !selectedTabs.length) {
			tabs = [tabs[0]].concat(browser.treeStyleTab.getDescendantTabs(tabs[0]));
			windowMove = allTabs.length == tabs.length;
		}

		return windowMove;
	},

	_filterSelectedTabs : function FSB_filterSelectedTabs(aTabs)
	{
		return aTabs.filter(function(aTab) {
			return aTab.getAttribute('multiselected') == 'true';
		});
	},

	_waitDOMEvent : function FSB_waitDOMEvent(aTarget)
	{
		var deferred = new Deferred();
		var eventTypes = Array.slice(arguments, 1);

		var handleEvent = function() {
				eventTypes.forEach(function(aType) {
					aTarget.removeEventListener(aType, handleEvent, true);
				});
				if (timer) timer.cancel();
				deferred.call();
			};

		eventTypes.forEach(function(aType) {
			aTarget.addEventListener(aType, handleEvent, true);
		});

		// timeout (for safety)
		let timer = Deferred.wait(0.5);
		timer
			.next(function() {
				timer = null;
				handleEvent();
			})
			.error(this.defaultHandleError);

		return deferred;
	},

	defaultHandleError : function FSB_defaultHandleError(aError)
	{
		dump(aError+'\n'+aError.stack.replace(/^/gm, '  ')+'\n');
		throw aError;
	},

	dumpError : function FSB_dumpError(aError, aMessage)
	{
		var message = aMessage ? aMessage+'\n' : '' ;
		dump(message+aError+'\n'+aError.stack.replace(/^/gm, '  ')+'\n');
	}
};

FoxSplitterBase.shouldDuplicateOnSplit = prefs.getPref(domain+'shouldDuplicateOnSplit');
FoxSplitterBase.offsetX = prefs.getPref(domain+'platformOffset.x');
FoxSplitterBase.offsetY = prefs.getPref(domain+'platformOffset.y');
FoxSplitterBase.offsetWidth = prefs.getPref(domain+'platformOffset.width');
FoxSplitterBase.offsetHeight = prefs.getPref(domain+'platformOffset.height');
FoxSplitterBase.shouldKeepSizeRatioOnResize = prefs.getPref(domain+'shouldKeepSizeRatioOnResize');

/**
 * Due to Firefox's bug 581863 and bug 581866, windows are mispositioned.
 * We have to calculate offset values for positioning and sizing.
 * https://github.com/piroor/foxsplitter/issues/26
 * https://bugzilla.mozilla.org/show_bug.cgi?id=581863
 * https://bugzilla.mozilla.org/show_bug.cgi?id=581866
 *
 * "window.screenX", "window.screenY", "window.outerWidth", and "window.outerHeight" return wrong values.
 * On Linux they return the dimension of the root element, without window decorations.
 * So...
 * 
 *  * offsetX => left window border (ex. 3px)
 *      => actualScreenX = screenX - offsetX
 *  * offsetY => window caption (ex. 20px)
 *      => actualScreenY = screenY - offsetY
 *  * offsetWidth => both left and right window borders (ex. 3px + 3px )
 *      => actualOuterWidth = outerWidth - offsetWidth
 *  * offsetHeight => both window caption and bottom window border (ex. 20px + 3px)
 *      => actualOuterHeight = outerHeight - offsetHeight
 * 
 * And,
 * 
 *  1. openDialog() with features "screenX", "screenY", "outerWidth", "outerHeight"
 *     => "screenX" and "screenY" work correctly.  Specify them without offsets.
 *     => "outerWidth" and "outerHeight" doesn't work. The opened window becomes
 *        larger than the specified size. So, you need to specify them with
 *        negative offsets.
 *        (expectedWidth - offsetWidth, expectedHeight - offsetHeight)
 *  2. moveTo(x, y)
 *     => Works correctly. Specify them without offsets.
 *  3. moveBy(deltaX, deltaY)
 *     => Does't work as we expect. The window is wrongly moved from the
 *        position (0, 0) of the root element. You need to specify deltaX and
 *        deltaY with nevative offsets.
 *        (deltaX - offsetX, deltaY - offsetY)
 *  4. resizeTo(width, height)
 *     => Doesn't work as we expect. The window becomes larger than we expected.
 *        So, you have to specify them with nevative offsets.
 *        (expectedWidth - offsetWidth, expectedHeight - offsetHeight)
 *  5. resizeBy(deltaWidth, deltaHeight)
 *     => Works correctly. Specify "deltaWidth" and "deltaHeight" without offsets.
 */
FoxSplitterBase.updatePlatformOffset = function FSB_updatePlatformOffset() {
	var self = this;
	if (!prefs.getPref(domain+'platformOffset.needToBeUpdated'))
		return Deferred.next(function() {
			return {
				x : self.offsetX,
				y : self.offsetY,
				width : self.offsetWidth,
				heigh : self.offsetHeight
			};
		});

	var deferred = new Deferred();
	prefs.setPref(domain+'platformOffset.needToBeUpdated', false);
	var window = WindowWatcher.openWindow(
			null,
			'about:blank?'+Math.random(),
			'_blank',
			'chrome,dialog=no,all,screenX=100,screenY=100,outerWidth=100,outerHeight=100',
			null
		);
	window.addEventListener('load', function() {
		window.removeEventListener('load', arguments.callee, false);
		Deferred.next(function() {
			prefs.setPref(domain+'platformOffset.x', self.offsetX = window.screenX - 100);
			prefs.setPref(domain+'platformOffset.y', self.offsetY = window.screenY - 100);
			var width = window.screen.availWidth;
			var height = window.screen.availHeight;
			window.moveTo(0, 0);
			window.resizeTo(width, height);
			Deferred.next(function() {
				prefs.setPref(domain+'platformOffset.width', self.offsetWidth = width - window.outerWidth);
				prefs.setPref(domain+'platformOffset.height', self.offsetHeight = height - window.outerHeight);
				window.close();
				deferred.call({
					x : self.offsetX,
					y : self.offsetY,
					width : self.offsetWidth,
					heigh : self.offsetHeight
				});
			});
		});
	}, false);
	return deferred;
};
FoxSplitterBase.updatePlatformOffset();

var prefListener = {
		domain : domain,
		observe : function FSWPL_observe(aSubject, aTopic, aData) {
			if (aTopic != 'nsPref:changed')
				return;

			var prefName = aData.replace(domain, '');
			if (prefName in FoxSplitterBase) {
				FoxSplitterBase[prefName] = prefs.getPref(aData);
			}
			else {
				switch (prefName)
				{
					case 'platformOffset.needToBeUpdated':
						return FoxSplitterBase.updatePlatformOffset();
				}
			}
		}
	};

prefs.addPrefListener(prefListener);

function shutdown()
{
	prefs.removePrefListener(prefListener);
	prefs = undefined;
	FoxSplitterConst = undefined;
}
