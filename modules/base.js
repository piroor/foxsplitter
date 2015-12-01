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

load('lib/prefs');
load('wait');

var { Promise } = Components.utils.import('resource://gre/modules/Promise.jsm', {});

var EXPORTED_SYMBOLS = ['FoxSplitterBase'];

const WindowWatcher = Cc['@mozilla.org/embedcomp/window-watcher;1']
						.getService(Ci.nsIWindowWatcher);

var FoxSplitterConst = require('extended-const');
var domain = FoxSplitterConst.domain;

function log(aMessage, ...aArgs) {
	if (prefs.getPref(domain+'debug.base') || prefs.getPref(domain+'debug.all')) {
		if (aArgs.length > 0) {
			aArgs = aArgs.map(function(aArg) {
				try {
					return uneval(aArgs);
				}
				catch(e) {
					return aArgs;
				}
			});
			aMessage += ' / ' + aArgs.join(', ');
		}
		console.log(aMessage);
	}
}

function FoxSplitterBase() 
{
}
FoxSplitterBase.prototype = inherit(FoxSplitterConst, {

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

	bindTo : function FSB_bindTo(aSibling, aOptions, ...aArgs) /* PUBLIC API */
	{
		log('FSB_bindTo', aSibling, aOptions, aArgs);
		aOptions = aOptions || {};

		var position   = aOptions.position;
		var silent     = aOptions.silent;
		var mainWindow = aOptions.mainWindow;
		if (typeof aOptions != 'object') { // for backward compatibility
			let allArgs = [aSibling, aOptions].concat(aArgs);
			position = allArgs[1];
			silent   = allArgs.length > 2 ? allArgs[2] : false ;
		}

		if (!aSibling || !(position & this.POSITION_VALID)) {
			log('FSB_bindTo: no sibling or invalid position');
			return Promise.resolve();
		}

		if (!this.isGroup && this.stretched) {
			let self = this;
			log('FSB_bindTo: try shrink self');
			return this.shrink().then(function() {
					log('FSB_bindTo: retry');
					self.bindTo(aSibling, aOptions);
				});
		}
		else if (!aSibling.isGroup && aSibling.stretched) {
			let self = this;
			log('FSB_bindTo: try shrink sibling');
			return aSibling.shrink().then(function() {
					log('FSB_bindTo: retry');
					self.bindTo(aSibling, aOptions);
				});
		}

		this.binding++;

		var promises = [];

		mainWindow = (
			mainWindow ||
			aSibling.main && aSibling.parent && aSibling.root.mainWindow ||
			this.main && this.parent && this.root.mainWindow
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
			promises.push(this._initPositionAndSize());

		this.setGroupedAppearance();
		if (!this.isGroup) {
			this.saveState();

			let self = this;
			let binding = this.binding;
			promises.push(next(function() {
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

			promises.push(next(function() {
				let event = aSibling.document.createEvent('Events');
				event.initEvent(aSibling.EVENT_TYPE_SPLIT, true, false);
				aSibling.document.dispatchEvent(event);
			}));
		}

		if (mainWindow && typeof mainWindow == 'string')
			mainWindow = this.memberClass.instancesById[mainWindow];
		if (mainWindow) {
			// if the specified main is not a member of this group, then fall back to the existing main.
			if (!this.root.allWindows.some(function(aFSWindow) {
					if (aFSWindow == mainWindow) {
						return mainWindow.main = true;
					}
					else
						return false;
				}))
				this.root.mainWindow.main = true;
		}
		else if (!this.isGroup && this.main && aSibling.main)
			aSibling.main = true;
		else if (this.parent) // finally, fall back to one of existing main windows.
			this.root.mainWindow.main = true;

		this.binding--;

		return promises.length > 1 ?
				Promise.all(promises) :
			promises.length ?
				promises[0] :
				Promise.resolve() ;
	},
	bindWith : function FSB_bindWith(aSibling, aOptions) /* PUBLIC API, for backward compatibility */
	{
		return this.bindTo(aSibling, aOptions);
	},

	_initPositionAndSize : function FSB_initPositionAndSize()
	{
		var base = this.sibling;
		var positionAndSize = base.calculatePositionAndSizeFor(this.position);

		var promises = [];
		if (positionAndSize.base.deltaX || positionAndSize.base.deltaY)
			base.moveBy(positionAndSize.base.deltaX, positionAndSize.base.deltaY);
		if (positionAndSize.base.deltaWidth || positionAndSize.base.deltaHeight)
			promises.push(base.resizeBy(positionAndSize.base.deltaWidth, positionAndSize.base.deltaHeight));

		if (this.x != positionAndSize.x || this.y != positionAndSize.y)
			this.moveTo(positionAndSize.x, positionAndSize.y);
		if (this.width != positionAndSize.width || this.height != positionAndSize.height)
			promises.push(this.resizeTo(positionAndSize.width, positionAndSize.height));

		var self = this;
		return (promises.length > 1 ?
					Promise.all(promises) :
				promises.length ?
					promises[0] :
					Promise.resolev() )
					.then(function() {
						return base.parent.resetPositionAndSize(base);
					});
	},

	calculatePositionAndSizeFor : function FSB_calculatePositionAndSizeFor(aPosition, aSimulate)
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

		var currentScreen;
		var screenLeft   = {},
			screenTop    = {},
			screenWidth  = {},
			screenHeight = {},
			screenAvailLeft   = {},
			screenAvailTop    = {},
			screenAvailWidth  = { value : baseWindow.screen.availWidth },
			screenAvailHeight = { value : baseWindow.screen.availHeight };
		try {
			currentScreen = Cc['@mozilla.org/gfx/screenmanager;1']
							.getService(Ci.nsIScreenManager)
							.screenForRect(this.imaginaryX, this.imaginaryY, this.imaginaryWidth, this.imaginaryHeight);
			currentScreen.GetRect(screenLeft, screenTop, screenWidth, screenHeight);
			currentScreen.GetAvailRect(screenAvailLeft, screenAvailTop, screenAvailWidth, screenAvailHeight);
		}
		catch(e) {
			log(e);
		}
		screenLeft   = screenLeft.value;
		screenTop    = screenTop.value;
		screenWidth  = screenWidth.value;
		screenHeight = screenHeight.value;
		screenAvailLeft   = screenAvailLeft.value;
		screenAvailTop    = screenAvailTop.value;
		screenAvailWidth  = screenAvailWidth.value;
		screenAvailHeight = screenAvailHeight.value;

		var root = this.root || this;
		if (aPosition & this.POSITION_HORIZONTAL) {
			y = this.imaginaryY;
			let baseWidth = maximized ?
							this.imaginaryWidth :
							Math.min(screenAvailWidth, this.imaginaryWidth * this.expandFactor) ;
			let deltaX = Math.round((baseWidth - this.imaginaryWidth) / 2);
			width = Math.round(baseWidth * this.newMemberFactor);
			height = this.imaginaryHeight;
			if (aPosition == this.POSITION_LEFT) {
				x = this.imaginaryX - (deltaX * 2);
				base.deltaX = width - (deltaX * 2);
			}
			else {
				x = this.imaginaryX + baseWidth - width;
			}
			base.deltaWidth = -width + (deltaX * 2);

			if (currentScreen) {
				let left = Math.min(x, root.x + base.deltaX);
				let right = Math.max(x + width, root.x + root.width + base.deltaWidth + base.deltaX);
				let minX = screenAvailLeft;
				let maxX = screenAvailLeft + screenAvailWidth;
				if (aPosition == this.POSITION_LEFT) {
					if (left < minX) base.deltaX += minX - left;
				}
				else {
					if (right > maxX) base.deltaX -= right - maxX;
				}
			}
			let wholeWidth = root.width + base.deltaWidth + (aSimulate ? width : 0 );
			if (wholeWidth > screenAvailWidth) width -= wholeWidth - screenAvailWidth;
		}
		else {
			x = this.imaginaryX;
			width = this.imaginaryWidth;
			let baseHeight = maximized ?
							this.imaginaryHeight :
							Math.min(screenAvailHeight, this.imaginaryHeight * this.expandFactor) ;
			let deltaY = Math.round((baseHeight - this.imaginaryHeight) / 2);
			height = Math.round(baseHeight * this.newMemberFactor);
			if (aPosition == this.POSITION_TOP) {
				y = this.imaginaryY - (deltaY * 2);
				base.deltaY = height - (deltaY * 2);
			}
			else {
				y = this.imaginaryY + baseHeight - height;
			}
			base.deltaHeight = -height + (deltaY * 2);

			if (currentScreen) {
				let top = Math.min(y, root.y + base.deltaY);
				let bottom = Math.max(y + height, root.y + root.height + base.deltaHeight + base.deltaY);
				let minY = screenAvailTop;
				let maxY = screenAvailTop + screenAvailHeight;
				if (aPosition == this.POSITION_TOP) {
					if (top < minY) base.deltaY += minY - top;
				}
				else {
					if (bottom > maxY) base.deltaY -= bottom - maxY;
				}
			}
			let wholeHeight = root.height + base.deltaHeight + (aSimulate ? height : 0 );
			if (wholeHeight > screenAvailHeight) height -= wholeHeight - screenAvailHeight;
		}
		return {
			x      : x,
			y      : y,
			width  : width,
			height : height,
			base   : base
		};
	},

	_lookUpBindTarget : function FSB_lookUpBindTarget(aEvent, aPosition)
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

		return this.parent._lookUpBindTarget(aEvent, aPosition);
	},

	_lookDownBindTarget : function FSB_lookDownBindTarget(aEvent, aPosition)
	{
		if (!this.isGroup)
			return null;

		var windows = (this.root || this).allWindows;
		var found = null;
		windows.some(function(aWindow) {
			if (aEvent.screenX >= aWindow.imaginaryX &&
				aEvent.screenY >= aWindow.imaginaryY &&
				aEvent.screenX <= aWindow.imaginaryX + aWindow.imaginaryWidth &&
				aEvent.screenY <= aWindow.imaginaryY + aWindow.imaginaryHeight)
				return found = aWindow;
			else
				return false;
		}, this);

		return found ? found._lookUpBindTarget(aEvent, aPosition) : null ;
	},

	unbind : function FSB_unbind(aSilent) /* PUBLIC API */
	{
		log('FSB_unbind: aSilent = '+aSilent);
		if (!this.parent) {
			log('FSB_unbind: no parent');
			return;
		}

		if (!this.isGroup && this.stretched) {
			let self = this;
			log('FSB_unbind: try shrink');
			return this.shrink().then(function() {
					log('FSB_unbind: retry');
					self.unbind(aSilent);
				});
		}

		var sibling = this.sibling;

		if (!aSilent) {
			log('FSB_unbind: try expanding sibling');
			this._expandSibling();
		}

		let lastMainWindow = this.root.mainWindow;

		log('FSB_unbind: unregister self');
		this.parent.unregister(this);

		log('FSB_unbind: update grouped appearance');
		this.updateGroupedAppearance();
		if (!this.isGroup) {
			log('FSB_unbind: [non-group]');
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
			return Promise.resolve();

		var promise;
		if (sibling.position & this.POSITION_HORIZONTAL) {
			let totalWidth = this.parent.width;
			let deltaX = this.maximized ? 0 : Math.round(totalWidth - (totalWidth / this.expandFactor)) ;
			if (sibling.position == this.POSITION_RIGHT) {
				// if this is a member of a nested groups, we should not move whole groups right.
				let deltaXToMove = sibling.parent.parent ? 0 : deltaX ;
				sibling.moveBy(-this.width + deltaXToMove, 0);
			}
			promise = sibling.resizeBy(this.width - deltaX, 0);
		}
		else {
			let totalHeight = this.parent.height;
			let deltaY = this.maximized ? 0 : Math.round(totalHeight - (totalHeight / this.expandFactor)) ;
			if (sibling.position == this.POSITION_BOTTOM) {
				// if this is a member of a nested groups, we should not move whole groups bottom.
				let deltaYToMove = sibling.parent.parent ? 0 : deltaY ;
				sibling.moveBy(0, -this.height + deltaYToMove);
			}
			promise = sibling.resizeBy(0, this.height - deltaY);
		}

		let parent = sibling.parent.parent;
		if (parent) {
			(promise || Promise.resolve())
				.then(function() {
					return parent.resetPositionAndSize(sibling);
				});
		}
	},


	// commands to create new pane

	_openWindow : function FSB_openWindow(aURIOrTab, aPositionAndSize)
	{
		log('FSB_openWindow', aURIOrTab, aPositionAndSize);
		var options = [
				'chrome,dialog=no,all',
				'screenX='+aPositionAndSize.x,
				'screenY='+aPositionAndSize.y,
				'outerWidth='+aPositionAndSize.width - this.offsetWidth,
				'outerHeight='+aPositionAndSize.height - this.offsetHeight
			].join(',');

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

		return new Promise((function(aResolve, aReject) {
			log('FSB_openWindow: open window');
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
			window.addEventListener('DOMContentLoaded', function onDOMContentLoaded(aEvent) {
				log('FSB_openWindow: DOMContentLoaded handled');
				window.removeEventListener(aEvent.type, onDOMContentLoaded, false);
				var root = window.document.documentElement;
				root.setAttribute('screenX', aPositionAndSize.x);
				root.setAttribute('screenY', aPositionAndSize.y);
				root.setAttribute('width', aPositionAndSize.width);
				root.setAttribute('height', aPositionAndSize.height);
			}, false);

			window.addEventListener(this.EVENT_TYPE_READY, function onReady(aEvent) {
				log('FSB_openWindow: ' + aEvent.type + ' handled');
				if (window) {
					window.removeEventListener(aEvent.type, onReady, false);
					aResolve(window);
					window = undefined;
				}
				else {
					aReject(new Error(aEvent.type+' event is handled twice.'));
				}
			}, false);
		}).bind(this))
			.then(function(aWindow) {
				log('FSB_openWindow: post process');
				var sv = aWindow.FoxSplitter;

				if (sv.x != aPositionAndSize.x || sv.y != aPositionAndSize.y) {
					log('FSB_openWindow: try move');
					sv.moveTo(aPositionAndSize.x, aPositionAndSize.y);
				}

				if (sv.width != aPositionAndSize.width || sv.height != aPositionAndSize.height) {
					log('FSB_openWindow: try resize');
					return sv.resizeTo(aPositionAndSize.width, aPositionAndSize.height)
							.then(function() {
								log('FSB_openWindow: resized');
								return aWindow;
							});
				}

				return aWindow;
			})
			.catch(this.defaultHandleError);
	},

	openLinksAt : function FSB_openLinksAt(aURIs, aPosition, aOptions) /* PUBLIC API */
	{
		log('FSB_openLinksAs', aURIs, aPosition, aOptions);
		aURIs = aURIs.slice(0);
		var first = aURIs.shift(); // only the first element can be tab

		var self = this;
		var maximized = !this.parent && !this.isGroup && this.maximized;
		var lastMainWindow = (this.parent && this.root.mainWindow) || this;
		var stretchedMember = this.parent && this.root.stretchedMember;
		return next(function() {
					log('FSB_openLinksAs: try shrink');
					if (stretchedMember)
						return stretchedMember.shrink();
				})
				.then(function() {
					log('FSB_openLinksAs: try unmaximize');
					if (maximized)
						return self.restore();
				})
				.then(function() {
					log('FSB_openLinksAs: try open window');
					var positionAndSize = self.calculatePositionAndSizeFor(aPosition, true);
					return self._openWindow(first, positionAndSize)
				})
				.then(function(aWindow) {
					log('FSB_openLinksAs: window opened, try bind');
					return aWindow.FoxSplitter.bindTo(self, {
								position   : aPosition,
								mainWindow : lastMainWindow
							})
								.then(function() {
									log('FSB_openLinksAs: window bound');
									return aWindow;
								});
				})
				.then(function(aWindow) {
					log('FSB_openLinksAs: try open URIs');
					aURIs.forEach(function(aURI) {
						aWindow.gBrowser.addTab(aURI);
					});

					if (!maximized)
						return aWindow;

					log('FSB_openLinksAs: try maximize');
					self.root.readyToMaximize();
					var waitMaximized = self._waitDOMEvent(self.window, self.EVENT_TYPE_WINDOW_STATE_CHANGED)
							.then(function() {
								log('FSB_openLinksAs: maximized');
								waitMaximized = null;
								return aWindow;
							});
					self.maximize();
					return waitMaximized || aWindow;
				})
				.then(function(aWindow) {
					log('FSB_openLinksAs: successfully opened');
					/*
					if (stretchedMember)
						return stretchedMember.stretch()
								.then(function() { return aWindow; });
					*/

					return aWindow;
				})
				.catch(this.defaultHandleError);
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
				.then(function(aWindow) {
					var firstTab = aWindow.gBrowser.selectedTab;
					var tabs = aWindow.FoxSplitter.duplicateTabs(aTabs);
					aWindow.gBrowser.removeTab(firstTab);
					if (aOptions.scrollToSplitPosition)
						self._scrollTabsToSplitPosition(aTabs, tabs, aPosition);
					return aWindow;
				})
				.catch(this.defaultHandleError);
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
			aNewTab.addEventListener('SSTabRestored', function onSSTabRestored() {
				aNewTab.removeEventListener('SSTabRestored', onSSTabRestored, false);
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
				.then(function(aWindow) {
					var firstTab = aWindow.gBrowser.selectedTab;
					aWindow.FoxSplitter.importTabs(aTabs);
					aWindow.gBrowser.removeTab(firstTab);
					return aWindow;
				})
				.catch(this.defaultHandleError);
	},
	moveTabTo : function FSB_moveTabTo(aTab, aPosition, aOptions) /* PUBLIC API */
	{
		return this.moveTabsTo([aTab], aPosition, aOptions);
	},

	moveWindowTo : function FSB_moveWindowTo(aDOMWindow, aPosition, aOptions) /* PUBLIC API */
	{
		if (aDOMWindow.FoxSplitter != this) {
			let lastMainWindow = this.mainWindow || this;
			return aDOMWindow.FoxSplitter.bindTo(this, {
						position   : aPosition,
						mainWindow : lastMainWindow
					})
					.then(function() {
						return aDOMWindow;
					});
		}

		return Promise.resolve(aDOMWindow);
	},

	splitTabsTo : function FSB_splitTabsTo(aTabs, aPosition, aOptions) /* PUBLIC API */
	{
		aOptions = aOptions || {};

		// for backward compatibility
		if (aOptions &&
			aOptions.view &&
			typeof aOptions.view.Event == 'function' &&
			aOptions instanceof aOptions.view.Event)
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
		this._reservedMoveBy = next(function() {
			self.moveBy(self._reservedMoveDeltaX, self._reservedMoveDeltaY);
			delete self._reservedMoveDeltaX;
			delete self._reservedMoveDeltaY
			delete self._reservedMoveBy;
		});
		this._reservedMoveBy.catch(this.defaultHandleError);
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
		this._reservedResizeBy = next(function() {
			self.resizeBy(self._reservedResizeDeltaWidth, self._reservedResizeDeltaHeight);
			delete self._reservedResizeDeltaWidth;
			delete self._reservedResizeDeltaHeight
			delete self._reservedResizeBy;
		});
		this._reservedResizeBy.catch(this.defaultHandleError);
	},

	onResizeTop : function FSB_onResizeTop(aDelta)
	{
		if (!aDelta) return;
		var splitterResizing = false;
		var sibling = this.sibling;
		if (sibling) {
			if (sibling.position == this.POSITION_TOP) {
				splitterResizing = true;
				sibling.resizeBy(0, -aDelta);
			}
			else if (sibling.position == this.POSITION_BOTTOM) {
				let resizeDelta = this.shouldKeepSizeRatioOnResize ? Math.round(aDelta / 2) : 0 ;
				if (resizeDelta) {
					this.reserveResizeBy(0, -resizeDelta);
					sibling.reserveResizeBy(0, aDelta - resizeDelta);
					sibling.reserveMoveBy(0, -resizeDelta);
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
				sibling.resizeBy(-aDelta, 0);
			}
			else if (sibling.position == this.POSITION_LEFT) {
				let resizeDelta = this.shouldKeepSizeRatioOnResize ? Math.round(aDelta / 2) : 0 ;
				if (resizeDelta) {
					// resize before move, to prevent unexpected resizing fired by window move
					this.reserveResizeBy(-(aDelta - resizeDelta), 0);
					this.reserveMoveBy(resizeDelta, 0);
					sibling.reserveResizeBy(resizeDelta, 0);
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
				sibling.resizeBy(0, -aDelta);
			}
			else if (sibling.position == this.POSITION_TOP) {
				let resizeDelta = this.shouldKeepSizeRatioOnResize ? Math.round(aDelta / 2) : 0 ;
				if (resizeDelta) {
					// resize before move, to prevent unexpected resizing fired by window move
					this.reserveResizeBy(0, -(aDelta - resizeDelta));
					this.reserveMoveBy(0, resizeDelta);
					sibling.reserveResizeBy(0, resizeDelta);
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
				sibling.resizeBy(-aDelta, 0);
			}
			else if (sibling.position == this.POSITION_RIGHT) {
				let resizeDelta = this.shouldKeepSizeRatioOnResize ? Math.round(aDelta / 2) : 0 ;
				if (resizeDelta) {
					this.reserveResizeBy(-resizeDelta, 0);
					sibling.reserveMoveBy(-resizeDelta, 0);
					sibling.reserveResizeBy(aDelta - resizeDelta, 0);
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
		return aEvent && (this.OS == 'Darwin' ? aEvent.metaKey : aEvent.ctrlKey );
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

	_waitDOMEvent : function FSB_waitDOMEvent(aTarget, ...aArgs)
	{
		return new Promise(function(aResolve, aReject) {
		var eventTypes = aArgs;

		var handleEvent = function(aEvent) {
				eventTypes.forEach(function(aType) {
					aTarget.removeEventListener(aType, handleEvent, true);
				});
				if (timer) timer.cancel();
				aResolve();
			};

		eventTypes.forEach(function(aType) {
			aTarget.addEventListener(aType, handleEvent, true);
		});

		// timeout (for safety)
		let timer = wait(500);
		timer
			.then(function() {
				timer = null;
				handleEvent();
			})
			.catch(this.defaultHandleError);

		});
	},


	defaultHandleError : function FSB_defaultHandleError(aError)
	{
		log(aError+'\n'+aError.stack.replace(/^/gm, '  '));
		throw aError;
	},

	dumpError : function FSB_dumpError(aError, aMessage)
	{
		var message = aMessage ? aMessage+'\n' : '' ;
		log(message+aError+'\n'+aError.stack.replace(/^/gm, '  '));
	},

	debug : true,
	log : function FSB_log(aMessage)
	{

		var now = new Date();
		var timestamp = now.getHours()+':'+now.getMinutes()+':'+now.getSeconds()+' '+('00' + now.getMilliseconds().toString()).slice(-3);
		aMessage = timestamp+' '+aMessage;
		if (!/\n$/.test(aMessage))
			aMessage += '\n';

		if (!this.debug) return;

		if (this.isGroup) {
			log(aMessage);
		}
		else {
			if (!this._log) this._log = '';
			this._log += aMessage;

			let self = this;
			this.window.setTimeout(function() {
				var header = 'data:text/plain;charset=UTF-8,'+encodeURIComponent('[logger]\n');
				var b = self.window.gBrowser;
				var logger = self._loggerTab;
				if (!logger || !logger.parentNode) {
					b.selectedTab = self._loggerTab = logger = b.addTab();
					logger.style.backgroundColor = 'red';
				}
				Array.forEach(b.tabContainer.childNodes, function(aTab) {
					if (aTab.linkedBrowser &&
						aTab.linkedBrowser.currentURI.spec.indexOf(header) == 0)
						b.removeTab(aTab);
				});
				try {
					logger.linkedBrowser.stop();
					logger.linkedBrowser.loadURI(header+encodeURIComponent(self._log));
				}
				catch(e) {
					log(aMessage);
				}
			}, 500);
		}
	}
});

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
		return Promise.resolve({
			x : self.offsetX,
			y : self.offsetY,
			width : self.offsetWidth,
			heigh : self.offsetHeight
		});

	return new Promise(function(aResolve, aReject) {

	prefs.setPref(domain+'platformOffset.needToBeUpdated', false);
	var window = WindowWatcher.openWindow(
			null,
			'chrome://browser/content/browser.xul',
			'_blank',
			'chrome,dialog=no,all,screenX=100,screenY=100,outerWidth=100,outerHeight=100',
			null
		);
	window.addEventListener('load', function onLoad() {
		window.removeEventListener('load', onLoad, false);
		// on some environments, just on this timing the window is not shown yet, so we fail to calculate offsets.
		// to avoid this problem, (for safety,) wait until the window is completely shown.
		wait(500).then(function() {
			prefs.setPref(domain+'platformOffset.x', self.offsetX = window.screenX - 100);
			prefs.setPref(domain+'platformOffset.y', self.offsetY = window.screenY - 100);
			var width = window.screen.availWidth;
			var height = window.screen.availHeight;
			window.moveTo(0, 0);
			window.resizeTo(width, height);
			next(function() {
				prefs.setPref(domain+'platformOffset.width', self.offsetWidth = width - window.outerWidth);
				prefs.setPref(domain+'platformOffset.height', self.offsetHeight = height - window.outerHeight);
				window.close();
				aResolve({
					x : self.offsetX,
					y : self.offsetY,
					width : self.offsetWidth,
					heigh : self.offsetHeight
				});
			});
		});
	}, false);
	});
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
