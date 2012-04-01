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
load('lib/ToolbarItem');
load('lib/KeyboardShortcut');
load('base');

var bundle = require('lib/locale')
				.get(resolve('locale/label.properties'));

var EXPORTED_SYMBOLS = ['FoxSplitterUI'];

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

function FoxSplitterUI(aFSWindow) 
{
	this.init(aFSWindow);
}
FoxSplitterUI.prototype = {
	__proto__ : FoxSplitterConst,

	get _window()
	{
		return this.owner._window;
	},
	get window()
	{
		return this.owner.window;
	},
	get document()
	{
		return this.owner.document;
	},
	get documentElement()
	{
		return this.owner.documentElement;
	},
	get browser()
	{
		return this.owner.browser;
	},
	get toolbox()
	{
		return !this._window ? null : this.document.querySelector('toolbox') ;
	},
	get toolbars()
	{
		return !this._window ? [] : Array.slice(this.document.querySelectorAll('toolbar, toolbox')) ;
	},
	get appButton()
	{
		return this.document.getElementById('appmenu-button');
	},

	get shouldHaveFullUI()
	{
		return (
			(this.shouldFixActiveWindow ? this.owner.main : this.owner.active ) ||
			!this.owner.parent
		);
	},

	get shouldMinimalizeUI() { return FoxSplitterUI.shouldMinimalizeUI; },
	set shouldMinimalizeUI(aValue) { return FoxSplitterUI.shouldMinimalizeUI = aValue; },
	get shouldAutoHideToolbox() { return FoxSplitterUI.shouldAutoHideToolbox; },
	set shouldAutoHideToolbox(aValue) { return FoxSplitterUI.shouldAutoHideToolbox = aValue; },
	get shouldAutoHideTabs() { return FoxSplitterUI.shouldAutoHideTabs; },
	set shouldAutoHideTabs(aValue) { return FoxSplitterUI.shouldAutoHideTabs = aValue; },
	get shouldFixActiveWindow() { return FoxSplitterUI.shouldFixActiveWindow; },
	set shouldFixActiveWindow(aValue) { return FoxSplitterUI.shouldFixActiveWindow = aValue; },
	get hiddenUIInInactiveWindow() { return FoxSplitterUI.hiddenUIInInactiveWindow; },
	set hiddenUIInInactiveWindow(aValue) { return FoxSplitterUI.hiddenUIInInactiveWindow = aValue; },
	get shouldScrollToSplitPosition() { return FoxSplitterUI.shouldScrollToSplitPosition; },
	set shouldScrollToSplitPosition(aValue) { return FoxSplitterUI.shouldScrollToSplitPosition = aValue; },


	init : function FSUI_init(aFSWindow)
	{
		this.owner = aFSWindow;
		this.shortcuts = {};
		this._styleSheets = {};

		FoxSplitterUI.instances.push(this);

		this.window.addEventListener('TabSelect', this, false);
		this.toolbox.addEventListener('MozMouseHittest', this, true);

		this._installStyleSheet(this.STYLESHEET);
		this._initToolbarItems();
		this._initKeyboardShortcuts();
		this._initMenuItems();
		this._makeAppButtonDraggable();
	},

	destroy : function FSUI_destroy(aOnQuit)
	{
		this.window.removeEventListener('TabSelect', this, false);
		this.toolbox.removeEventListener('MozMouseHittest', this, true);

		this.clearGroupedAppearance(aOnQuit);
		this._makeAppButtonUndraggable();
		this._destroyToolbarItems();
		this._destroyMenuItems();
		this._destroyKeyboardShortcuts();

		for (let styleSheet in this._styleSheets)
		{
			this._uninstallStyleSheet(styleSheet);
		}
		delete this._styleSheets;

		FoxSplitterUI.instances = FoxSplitterUI.instances.filter(function(aUI) {
			return aUI != this;
		}, this);

		delete this.owner;
	},

	_installStyleSheet : function FSUI_installStyleSheet(aStyleSheet)
	{
		if (this._styleSheets[aStyleSheet])
			return;
		var styleSheet = this.document.createProcessingInstruction('xml-stylesheet',
			'type="text/css" href="data:text/css,'+encodeURIComponent(aStyleSheet)+'"');
		this._styleSheets[aStyleSheet] = styleSheet;
		this.document.insertBefore(styleSheet, this.documentElement);
	},

	_uninstallStyleSheet : function FSUI_uninstallStyleSheet(aStyleSheet)
	{
		var styleSheet = this._styleSheets[aStyleSheet];
		if (!styleSheet)
			return;
		this.document.removeChild(styleSheet);
		delete this._styleSheets[aStyleSheet];
	},


	_initToolbarItems : function FSUI_initToolbarItems()
	{
		var toolbar = this.document.getElementById('nav-bar');
		var self = this;

		this.generalButton = ToolbarItem.create(
			<>
				<toolbarbutton id="foxsplitter-general-button"
					type="menu-button"
					label={bundle.getString('ui.split.short')}
					tooltiptext={bundle.getString('ui.split.long')}
					class={ToolbarItem.BASIC_ITEM_CLASS + ' ' + this.TOOLBAR_ITEM}
					oncommand="FoxSplitter.ui.handleEvent(event);"
					onclick="FoxSplitter.ui.handleEvent(event);"
					ondragstart="FoxSplitter.ui.handleEvent(event);"
					ondragend="FoxSplitter.ui.handleEvent(event);"
					foxsplitter-acceptmiddleclick="true">
					<menupopup id="foxsplitter-general-button-popup"
						onpopupshowing="FoxSplitter.ui.handleEvent(event);">
						{this._createSplitItems({ short : false, key : false })}
						{this._createOtherCommandItems({ key : false })}
					</menupopup>
				</toolbarbutton>
			</>,
			toolbar,
			{
				onInit : function() {
					self.onSyncScrollStateChange();
				},
				onDestroy : function() {
				}
			}
		);

		this.syncScrollButton = ToolbarItem.create(
			<>
				<toolbarbutton id="foxsplitter-syncScroll-button"
					type="checkbox"
					autoCheck="false"
					label={bundle.getString('ui.syncScroll.short')}
					tooltiptext={bundle.getString('ui.syncScroll.long')}
					class={ToolbarItem.BASIC_ITEM_CLASS + ' ' + this.TOOLBAR_ITEM}
					foxsplitter-command="syncScroll"
					oncommand="FoxSplitter.ui.handleEvent(event);"/>
			</>,
			toolbar,
			{
				onInit : function() {
					self.onSyncScrollStateChange();
				},
				onDestroy : function() {
				}
			}
		);
	},

	_createSplitItems : function FSUI_createSplitItems(aOptions)
	{
		aOptions = aOptions || {};
		var iconicClass = 'menuitem-iconic ' + this.MENU_ITEM + ' ';
		var short = aOptions.short;
		var key = aOptions.key;
		return <>
			<menuitem class={iconicClass+'split-right'}
				label={bundle.getString(short ? 'ui.split.right.short' : 'ui.split.right.long' )}
				accesskey={bundle.getString('ui.split.right.accesskey')}
				foxsplitter-command="split-right"
				foxsplitter-acceptmiddleclick="true"
				key={key ? 'foxsplitter-key-splitTabToRight' : '' }/>
			<menuitem class={iconicClass+'split-left'}
				label={bundle.getString(short ? 'ui.split.left.short' : 'ui.split.left.long' )}
				accesskey={bundle.getString('ui.split.left.accesskey')}
				foxsplitter-command="split-left"
				foxsplitter-acceptmiddleclick="true"
				key={key ? 'foxsplitter-key-splitTabToLeft' : '' }/>
			<menuitem class={iconicClass+'split-top'}
				label={bundle.getString(short ? 'ui.split.top.short' : 'ui.split.top.long' )}
				accesskey={bundle.getString('ui.split.top.accesskey')}
				foxsplitter-command="split-top"
				foxsplitter-acceptmiddleclick="true"
				key={key ? 'foxsplitter-key-splitTabToTop' : '' }/>
			<menuitem class={iconicClass+'split-bottom'}
				label={bundle.getString(short ? 'ui.split.bottom.short' : 'ui.split.bottom.long' )}
				accesskey={bundle.getString('ui.split.bottom.accesskey')}
				foxsplitter-command="split-bottom"
				foxsplitter-acceptmiddleclick="true"
				key={key ? 'foxsplitter-key-splitTabToBottom' : '' }/>
		</>;
	},

	_createOtherCommandItems : function FSUI_createOtherCommandItems()
	{
		var iconicClass = 'menuitem-iconic ' + this.MENU_ITEM + ' ';
		return <>
			<menuseparator/>
			<menuitem class={iconicClass+'tile-grid tabs'}
				label={bundle.getString('ui.layout.grid.long')}
				accesskey={bundle.getString('ui.layout.grid.accesskey')}
				foxsplitter-command="tile-grid"/>
			<menuitem class={iconicClass+'tile-x tabs'}
				label={bundle.getString('ui.layout.x.long')}
				accesskey={bundle.getString('ui.layout.x.accesskey')}
				foxsplitter-command="tile-x"/>
			<menuitem class={iconicClass+'tile-y tabs'}
				label={bundle.getString('ui.layout.y.long')}
				accesskey={bundle.getString('ui.layout.y.accesskey')}
				foxsplitter-command="tile-y"/>
			<menuitem class={iconicClass+'gather grouped'}
				label={bundle.getString('ui.gather.long')}
				accesskey={bundle.getString('ui.gather.accesskey')}
				foxsplitter-command="gather"/>
			<menuseparator/>
			<menuitem class={iconicClass+'closeAll grouped'}
				label={bundle.getString('ui.closeAll.long')}
				accesskey={bundle.getString('ui.closeAll.accesskey')}
				foxsplitter-command="closeAll"/>
			<menuitem class={this.MENU_ITEM+' closeOther grouped'}
				label={bundle.getString('ui.closeOther.long')}
				accesskey={bundle.getString('ui.closeOther.accesskey')}
				foxsplitter-command="closeOther"/>
			<menuseparator/>
			<menuitem class={this.MENU_ITEM+' unbind grouped'}
				label={bundle.getString('ui.unbind.long')}
				accesskey={bundle.getString('ui.unbind.accesskey')}
				foxsplitter-command="unbind"/>
			<menuseparator class={this.MENU_ITEM+' setAsMainWindowSeparator'}/>
			<menuitem class={this.MENU_ITEM+' setAsMainWindow'}
				type="radio"
				autoCheck="false"
				label={bundle.getString('ui.setAsMainWindow.long')}
				accesskey={bundle.getString('ui.setAsMainWindow.accesskey')}
				foxsplitter-command="setAsMainWindow"/>
			<menuseparator class={this.MENU_ITEM+' syncScrollSeparator'}/>
			<menuitem class={this.MENU_ITEM+' syncScroll'}
				type="checkbox"
				autoCheck="false"
				label={bundle.getString('ui.syncScroll.long')}
				accesskey={bundle.getString('ui.syncScroll.accesskey')}
				foxsplitter-command="syncScroll"/>
		</>;
	},

	_destroyToolbarItems : function FSUI_destroyToolbarItems()
	{
		this.generalButton.destroy();
		delete this.generalButton;
		this.syncScrollButton.destroy();
		delete this.syncScrollButton;
	},


	_initMenuItems : function FSUI_initMenuItems()
	{
		var iconicClass = 'menuitem-iconic ' + this.MENU_ITEM+' ';

		var appMenuPopup = this.document.getElementById('appmenu-popup');
		if (prefs.getPref(this.domain+'appMenu.split') && appMenuPopup) {
			this.appMenuItem = ToolbarItem.toDOMDocumentFragment(<>
					<splitmenu id="foxsplitter-app-split"
						iconic="true"
						class={'split '+this.MENU_ITEM}
						label={bundle.getString('ui.split.app.label')}
						accesskey={bundle.getString('ui.split.app.accesskey')}
						oncommand="FoxSplitter.ui.onCommand(event, 'foxsplitter-app-split'); event.stopPropagation();">
						<menupopup id="foxsplitter-app-popup"
							oncommand="FoxSplitter.ui.handleEvent(event);"
							onpopupshowing="FoxSplitter.ui.handleEvent(event);">
							{this._createSplitItems({ short : true, key : true })}
							{this._createOtherCommandItems({ key : false })}
						</menupopup>
					</splitmenu>
				</>, appMenuPopup).querySelector('*');
			let appMenuPrimaryPane = this.document.getElementById('appmenuPrimaryPane');
			appMenuPrimaryPane.insertBefore(this.appMenuItem, this.document.getElementById('appmenu_fullScreen'));
		}

		if (prefs.getPref(this.domain+'viewMenu.split')) {
			let popup = this.document.getElementById('menu_viewPopup');
			this.viewMenuItem = ToolbarItem.toDOMDocumentFragment(<>
					<menu id="foxsplitter-view-split"
						class={'menu-iconic split '+this.MENU_ITEM}
						label={bundle.getString('ui.split.view.label')}
						accesskey={bundle.getString('ui.split.view.accesskey')}>
						<menupopup id="foxsplitter-view-popup"
							oncommand="FoxSplitter.ui.handleEvent(event);"
							onpopupshowing="FoxSplitter.ui.handleEvent(event);">
							{this._createSplitItems({ short : true, key : true })}
							{this._createOtherCommandItems({ key : false })}
						</menupopup>
					</menu>
				</>, popup).querySelector('*');
			popup.insertBefore(this.viewMenuItem, this.document.getElementById('fullScreenItem'));
		}

		if (prefs.getPref(this.domain+'context.splitFromLink')) {
			let popup = this.document.getElementById('contentAreaContextMenu');
			this.contextLinkItem = ToolbarItem.toDOMDocumentFragment(<>
					<menu id="foxsplitter-context-link-split"
						class={'menu-iconic split '+this.MENU_ITEM}
						label={bundle.getString('ui.split.link.label')}
						accesskey={bundle.getString('ui.split.link.accesskey')}>
						<menupopup
							oncommand="FoxSplitter.ui.handleEvent(event);"
							onclick="FoxSplitter.ui.handleEvent(event);">
							<menuitem id="foxsplitter-context-link-split-right"
								class={iconicClass+'split-right'}
								label={bundle.getString('ui.split.right.short')}
								accesskey={bundle.getString('ui.split.right.accesskey')}/>
							<menuitem id="foxsplitter-context-link-split-left"
								class={iconicClass+'split-left'}
								label={bundle.getString('ui.split.left.short')}
								accesskey={bundle.getString('ui.split.left.accesskey')}/>
							<menuitem id="foxsplitter-context-link-split-top"
								class={iconicClass+'split-top'}
								label={bundle.getString('ui.split.top.short')}
								accesskey={bundle.getString('ui.split.top.accesskey')}/>
							<menuitem id="foxsplitter-context-link-split-bottom"
								class={iconicClass+'split-bottom'}
								label={bundle.getString('ui.split.bottom.short')}
								accesskey={bundle.getString('ui.split.bottom.accesskey')}/>
						</menupopup>
					</menu>
				</>, popup).querySelector('*');
			popup.insertBefore(this.contextLinkItem, this.document.getElementById('context-openlink').nextSibling);
			popup.addEventListener('popupshowing', this, false);
		}

		if (prefs.getPref(this.domain+'context.splitFromFrame')) {
			let popup = this.document.querySelector('#frame menupopup');
			this.contextFrameItem = ToolbarItem.toDOMDocumentFragment(<>
					<menu id="foxsplitter-context-frame-split"
						class={'menu-iconic split '+this.MENU_ITEM}
						label={bundle.getString('ui.split.frame.label')}
						accesskey={bundle.getString('ui.split.frame.accesskey')}>
						<menupopup
							oncommand="FoxSplitter.ui.handleEvent(event);"
							onclick="FoxSplitter.ui.handleEvent(event);">
							<menuitem id="foxsplitter-context-frame-split-right"
								class={iconicClass+'split-right'}
								label={bundle.getString('ui.split.right.short')}
								accesskey={bundle.getString('ui.split.right.accesskey')}/>
							<menuitem id="foxsplitter-context-frame-split-left"
								class={iconicClass+'split-left'}
								label={bundle.getString('ui.split.left.short')}
								accesskey={bundle.getString('ui.split.left.accesskey')}/>
							<menuitem id="foxsplitter-context-frame-split-top"
								class={iconicClass+'split-top'}
								label={bundle.getString('ui.split.top.short')}
								accesskey={bundle.getString('ui.split.top.accesskey')}/>
							<menuitem id="foxsplitter-context-frame-split-bottom"
								class={iconicClass+'split-bottom'}
								label={bundle.getString('ui.split.bottom.short')}
								accesskey={bundle.getString('ui.split.bottom.accesskey')}/>
						</menupopup>
					</menu>
				</>, popup).querySelector('*');
			popup.insertBefore(this.contextFrameItem, this.document.getElementById('context-openframe').nextSibling);
		}

		let tabContextPopup = this.document.querySelector('#tabContextMenu') ||
								this.document.getAnonymousElementByAttribute(this.browser, 'anonid', 'tabContextMenu'); // Firefox 3.6
		this.tabContextItems = [];
		if (tabContextPopup) {
			if (prefs.getPref(this.domain+'context.splitFromTab.move')) {
				let item = ToolbarItem.toDOMDocumentFragment(<>
					<menu id="foxsplitter-context-tab-split-move"
						class={'menu-iconic split '+this.MENU_ITEM}
						label={bundle.getString('ui.split.tab.move.label')}
						accesskey={bundle.getString('ui.split.tab.move.accesskey')}>
						<menupopup
							oncommand="FoxSplitter.ui.handleEvent(event);">
							<menuitem class={iconicClass+'split-right'}
								label={bundle.getString('ui.split.right.short')}
								accesskey={bundle.getString('ui.split.right.accesskey')}
								foxsplitter-command="move-right"/>
							<menuitem class={iconicClass+'split-left'}
								label={bundle.getString('ui.split.left.short')}
								accesskey={bundle.getString('ui.split.left.accesskey')}
								foxsplitter-command="move-left"/>
							<menuitem class={iconicClass+'split-top'}
								label={bundle.getString('ui.split.top.short')}
								accesskey={bundle.getString('ui.split.top.accesskey')}
								foxsplitter-command="move-top"/>
							<menuitem class={iconicClass+'split-bottom'}
								label={bundle.getString('ui.split.bottom.short')}
								accesskey={bundle.getString('ui.split.bottom.accesskey')}
								foxsplitter-command="move-bottom"/>
							<menuseparator/>
							<menuitem class={iconicClass+'tile-grid tabs'}
								label={bundle.getString('ui.layout.grid.long')}
								accesskey={bundle.getString('ui.layout.grid.accesskey')}
								foxsplitter-command="tile-grid"/>
							<menuitem class={iconicClass+'tile-x tabs'}
								label={bundle.getString('ui.layout.x.long')}
								accesskey={bundle.getString('ui.layout.x.accesskey')}
								foxsplitter-command="tile-x"/>
							<menuitem class={iconicClass+'tile-y tabs'}
								label={bundle.getString('ui.layout.y.long')}
								accesskey={bundle.getString('ui.layout.y.accesskey')}
								foxsplitter-command="tile-y"/>
						</menupopup>
					</menu>
				</>, tabContextPopup).querySelector('*');
				tabContextPopup.insertBefore(item, this.document.getElementById('context_openTabInWindow').nextSibling);
				this.tabContextItems.push(item);
				this.tabContextMoveItem = item;
			}
			if (prefs.getPref(this.domain+'context.splitFromTab.duplicate')) {
				let item = ToolbarItem.toDOMDocumentFragment(<>
					<menu id="foxsplitter-context-tab-split-duplicate"
						class={this.tabContextItems.length ? '' : 'menu-iconic split '+this.MENU_ITEM }
						label={bundle.getString('ui.split.tab.duplicate.label')}
						accesskey={bundle.getString('ui.split.tab.duplicate.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);">
						<menupopup>
							<menuitem class={iconicClass+'split-right'}
								label={bundle.getString('ui.split.right.short')}
								accesskey={bundle.getString('ui.split.right.accesskey')}
								foxsplitter-command="duplicate-right"/>
							<menuitem class={iconicClass+'split-left'}
								label={bundle.getString('ui.split.left.short')}
								accesskey={bundle.getString('ui.split.left.accesskey')}
								foxsplitter-command="duplicate-left"/>
							<menuitem class={iconicClass+'split-top'}
								label={bundle.getString('ui.split.top.short')}
								accesskey={bundle.getString('ui.split.top.accesskey')}
								foxsplitter-command="duplicate-top"/>
							<menuitem class={iconicClass+'split-bottom'}
								label={bundle.getString('ui.split.bottom.short')}
								accesskey={bundle.getString('ui.split.bottom.accesskey')}
								foxsplitter-command="duplicate-bottom"/>
						</menupopup>
					</menu>
				</>, tabContextPopup).querySelector('*');
				tabContextPopup.insertBefore(item, (this.tabContextItems.length && this.tabContextItems[0] || this.document.getElementById('context_openTabInWindow')).nextSibling);
				this.tabContextItems.push(item);
				this.tabContextDuplicateItem = item;
			
			}
			if (prefs.getPref(this.domain+'context.gatherWindows')) {
				let item = ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-context-tab-gather"
						class={iconicClass+'gather grouped'}
						label={bundle.getString('ui.gather.long')}
						accesskey={bundle.getString('ui.gather.accesskey')}
						foxsplitter-command="gather"
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, tabContextPopup).querySelector('*');
				tabContextPopup.insertBefore(item, this.document.getElementById('context_bookmarkAllTabs').nextSibling);
				this.tabContextItems.push(item);
				this.tabContextGatherItem = item;
			}
			if (this.tabContextItems.length)
				tabContextPopup.addEventListener('popupshowing', this, false);
		}

		var selectionPopup = this.document.getElementById('multipletab-selection-menu');
		this.selectionPopupItems = [];
		if (selectionPopup) {
			let splitItems = [];
			if (prefs.getPref(this.domain+'selection.splitToRight')) {
				splitItems.push(ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-split-right"
						class={iconicClass+'split-right'}
						label={bundle.getString('ui.split.right.short')}
						accesskey={bundle.getString('ui.split.right.accesskey')}
						foxsplitter-command="split-right"
						foxsplitter-acceptmiddleclick="true"
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*'));
			}
			if (prefs.getPref(this.domain+'selection.splitToLeft')) {
				splitItems.push(ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-split-left"
						class={iconicClass+'split-left'}
						label={bundle.getString('ui.split.left.short')}
						accesskey={bundle.getString('ui.split.left.accesskey')}
						foxsplitter-command="split-left"
						foxsplitter-acceptmiddleclick="true"
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*'));
			}
			if (prefs.getPref(this.domain+'selection.splitToTop')) {
				splitItems.push(ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-split-top"
						class={iconicClass+'split-top'}
						label={bundle.getString('ui.split.top.short')}
						accesskey={bundle.getString('ui.split.top.accesskey')}
						foxsplitter-command="split-top"
						foxsplitter-acceptmiddleclick="true"
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*'));
			}
			if (prefs.getPref(this.domain+'selection.splitToBottom')) {
				splitItems.push(ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-split-bottom"
						class={iconicClass+'split-bottom'}
						label={bundle.getString('ui.split.bottom.short')}
						accesskey={bundle.getString('ui.split.bottom.accesskey')}
						foxsplitter-command="split-bottom"
						foxsplitter-acceptmiddleclick="true"
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*'));
			}
			if (splitItems.length)
				splitItems.unshift(this.document.createElement('menuseparator'));

			let layoutItems = [];
			if (prefs.getPref(this.domain+'selection.grid')) {
				layoutItems.push(ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-tile-grid"
						class={iconicClass+'tile-grid'}
						label={bundle.getString('ui.layout.grid.selection')}
						accesskey={bundle.getString('ui.layout.grid.accesskey')}
						foxsplitter-command="tile-grid"
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*'));
			}
			if (prefs.getPref(this.domain+'selection.x')) {
				layoutItems.push(ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-tile-x"
						class={iconicClass+'tile-x grouped'}
						label={bundle.getString('ui.layout.x.selection')}
						accesskey={bundle.getString('ui.layout.x.accesskey')}
						foxsplitter-command="tile-x"
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*'));
			}
			if (prefs.getPref(this.domain+'selection.y')) {
				layoutItems.push(ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-tile-y"
						class={iconicClass+'tile-y grouped'}
						label={bundle.getString('ui.layout.y.selection')}
						accesskey={bundle.getString('ui.layout.y.accesskey')}
						foxsplitter-command="tile-y"
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*'));
			}
			if (layoutItems.length)
				layoutItems.unshift(this.document.createElement('menuseparator'));

			this.selectionPopupItems = splitItems.concat(layoutItems);
			if (this.selectionPopupItems.length) {
				let fragment = this.document.createDocumentFragment();
				this.selectionPopupItems.forEach(function(aItem) {
					fragment.appendChild(aItem);
				});
				selectionPopup.appendChild(fragment);
			}
		}
	},

	_destroyMenuItems : function FSUI_destroyMenuItems()
	{
		if (this.contextFrameItem) {
			let popup = this.document.getElementById('contentAreaContextMenu');
			popup.removeEventListener('popupshowing', this, false);
		}

		if (this.tabContextItems.length) {
			let popup = this.document.querySelector('#tabContextMenu') ||
						this.document.getAnonymousElementByAttribute(this.browser, 'anonid', 'tabContextMenu'); // Firefox 3.6
			popup.removeEventListener('popupshowing', this, false);
		}

		<![CDATA[
			appMenuItem
			viewMenuItem
			contextLinkItem
			contextFrameItem
		]]>.toString().replace(/^\s+|\s+$/g, '').split(/\s+/)
			.concat(this.tabContextItems)
			.concat(this.selectionPopupItems)
			.forEach(function(aItem) {
				var item = typeof aItem == 'string' ? this[aItem] : aItem ;
				if (item) {
					if (item.parentNode)
						item.parentNode.removeChild(item);
					if (typeof aItem == 'string')
						delete this[aItem];
				}
			}, this);

		this.tabContextItems = [];
		this.tabContextMoveItem = null;
		this.tabContextDuplicateItem = null;
		this.tabContextGatherItem = null;
		this.selectionPopupItems = [];
	},

	resetMenuItems : function FSUI_resetMenuItems()
	{
		if (this._deferredResetMenuItems)
			return;

		var self = this;
		this._deferredResetMenuItems = Deferred.next(function() {
			delete self._deferredResetMenuItems;
			self._destroyMenuItems();
			self._initMenuItems();
		});
	},


	_initKeyboardShortcuts : function FSUI_initKeyboardShortcuts()
	{
		var keyset = this.document.getElementById('mainKeyset');

		var commands = {
				splitTabToTop    : 'FoxSplitter.ui.splitTabFromKeyboardTo(FoxSplitter.POSITION_TOP);',
				splitTabToRight  : 'FoxSplitter.ui.splitTabFromKeyboardTo(FoxSplitter.POSITION_RIGHT);',
				splitTabToBottom : 'FoxSplitter.ui.splitTabFromKeyboardTo(FoxSplitter.POSITION_BOTTOM);',
				splitTabToLeft   : 'FoxSplitter.ui.splitTabFromKeyboardTo(FoxSplitter.POSITION_LEFT);',
				layoutGrid       : 'FoxSplitter.ui.tileTabsFromKeyboard(FoxSplitter.TILE_MODE_GRID);',
				layoutX          : 'FoxSplitter.ui.tileTabsFromKeyboard(FoxSplitter.TILE_MODE_X_AXIS);',
				layoutY          : 'FoxSplitter.ui.tileTabsFromKeyboard(FoxSplitter.TILE_MODE_Y_AXIS);',
				gather           : 'FoxSplitter.gatherWindows();'
			};
		for (let command in commands)
		{
			if (!commands.hasOwnProperty(command)) continue;
			let pref = prefs.getPref(domain+'shortcut.'+command);
			if (!pref) continue;

			this.shortcuts[command] = KeyboardShortcut.create({
				id        : 'foxsplitter-key-'+command,
				oncommand : commands[command],
				shortcut  : pref
			}, keyset);
		}
	},

	_destroyKeyboardShortcuts : function FSUI_destroyKeyboardShortcuts()
	{
		for (let command in this.shortcuts)
		{
			if (!this.shortcuts.hasOwnProperty(command)) continue;

			this.shortcuts[command].destroy();
		}
		this.shortcuts = {};
	},

	resetKeyboardShortcuts : function FSUI_resetKeyboardShortcuts()
	{
		if (this._deferredKeyboardShortcuts)
			return;

		var self = this;
		this._deferredKeyboardShortcuts = Deferred.next(function() {
			delete self._deferredKeyboardShortcuts;
			self._destroyKeyboardShortcuts();
			self._initKeyboardShortcuts();
		});
	},

	_makeAppButtonDraggable : function FSUI_makeAppButtonDraggable()
	{
		if (
			!this.appButton ||
			this._appButtonDraggable ||
			!prefs.getPref(domain+'draggableAppButton')
			)
			return;

		this.appButton.addEventListener('dragstart', this, false);
		this.appButton.addEventListener('dragend', this, false);
		this._appButtonDraggable = true;
	},
	_appButtonDraggable : false,

	_makeAppButtonUndraggable : function FSUI_makeAppButtonUndraggable()
	{
		if (
			!this.appButton ||
			!this._appButtonDraggable
			)
			return;

		this.appButton.removeEventListener('dragstart', this, false);
		this.appButton.removeEventListener('dragend', this, false);
		this._appButtonDraggable = false;
	},

	resetDraggableAppButton : function FSUI_resetDraggableAppButton()
	{
		this._makeAppButtonUndraggable();
		this._makeAppButtonDraggable();
	},


	updateChromeMargin : function FSUI_updateChromeMargin()
	{
		if (this._chromeMarginUpdating || !this.owner.parent)
			return;

		if (typeof this._originalChromeMargin == 'undefined')
			this._originalChromeMargin = this.documentElement.getAttribute('chromemargin');

		var margin = (this._originalChromeMargin || '-1,-1,-1,-1').split(/\s*,\s*/);
		if (this.owner.topSibling) margin[0] = 0;
		if (this.owner.rightSibling) margin[1] = 0;
		if (this.owner.bottomSibling) margin[2] = 0;
		if (this.owner.leftSibling) margin[3] = 0;

		this._chromeMarginUpdating = true;
		try {
			this.documentElement.setAttribute('chromemargin', margin.join(','));
		}
		finally {
			this._chromeMarginUpdating = false;
		}
	},
	_chromeMarginUpdating : false,
	_originalChromeMargin : undefined,

	onChromeMarginChange : function FSUI_onChromeMarginChange(aEvent)
	{
		if (this._chromeMarginUpdating)
			return;

		this._originalChromeMargin = aEvent.newValue;
		this.updateChromeMargin();
	},


	handleEvent : function FSUI_handleEvent(aEvent)
	{
		switch (aEvent.type)
		{
			case 'command':
				return this.onCommand(aEvent);
			case 'click':
				if (aEvent.target.getAttribute('foxsplitter-acceptmiddleclick') == 'true' &&
					this.owner.isMiddleClick(aEvent)) {
					aEvent.stopPropagation();
					aEvent.preventDefault();
					this.onCommand(aEvent);
					this._closePopup(aEvent);
				}
				return;
			case 'popupshowing':
				return this._onPopupShowing(aEvent);
			case this.EVENT_TYPE_KEY_COMBINATION_COMMAND+'splitTabToTop':
			case this.EVENT_TYPE_KEY_COMBINATION_COMMAND+'splitTabToRight':
			case this.EVENT_TYPE_KEY_COMBINATION_COMMAND+'splitTabToBottom':
			case this.EVENT_TYPE_KEY_COMBINATION_COMMAND+'splitTabToLeft':
				return this._onKeyboardShortcutCommand(aEvent);
			case 'dragstart':
				return this._onDragStart(aEvent);
			case 'dragend':
				return this._onDragEnd(aEvent);
/* DOMAttrModified is handled by FoxSplitterWindow
			case 'DOMAttrModifined':
				switch (aEvent.attrName)
				{
					case 'chromemargin':
						return this._onChromeMarginChange(aEvent);
				}
				return;
*/
			case 'TabSelect':
				return this.onTabSelect(aEvent);
			case 'MozMouseHittest':
				return this.onMozMouseHittest(aEvent);
			default:
				return;
		}
	},
	_closePopup : function FSUI_closePopup(aEvent)
	{
		var popups = this.document.evaluate(
				'ancestor-or-self::*[local-name()="menupopup" or local-name()="popup"]',
				aEvent.target,
				null,
				Ci.nsIDOMXPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null
			);
		for (let i = popups.snapshotLength; i > -1; i--)
		{
			popups.snapshotItem(i).hidePopup();
		}
	},

	onCommand : function FSUI_onCommand(aEvent, aTargetId)
	{
		var owner = this.owner;
		var tabs = owner.selectedTabs;
		var selected = tabs.length;
		if (!selected)
			tabs.push(this.browser.selectedTab);

		switch (aTargetId || aEvent.target.id)
		{
			case 'foxsplitter-general-button':
				return this.splitTabsFromToolbarButton(tabs, aEvent);

			case 'foxsplitter-app-split':
				return this.splitTabsFromAppMenuItem(tabs);

			case 'foxsplitter-context-link-split-top':
				return this.openContextLinkAt(this.POSITION_TOP);
			case 'foxsplitter-context-link-split-right':
				return this.openContextLinkAt(this.POSITION_RIGHT);
			case 'foxsplitter-context-link-split-bottom':
				return this.openContextLinkAt(this.POSITION_BOTTOM);
			case 'foxsplitter-context-link-split-left':
				return this.openContextLinkAt(this.POSITION_LEFT);

			case 'foxsplitter-context-frame-split-top':
				return this.openContextFrameAt(this.POSITION_TOP);
			case 'foxsplitter-context-frame-split-right':
				return this.openContextFrameAt(this.POSITION_RIGHT);
			case 'foxsplitter-context-frame-split-bottom':
				return this.openContextFrameAt(this.POSITION_BOTTOM);
			case 'foxsplitter-context-frame-split-left':
				return this.openContextFrameAt(this.POSITION_LEFT);

			default:
				switch (aEvent.target.getAttribute('foxsplitter-command'))
				{
					case 'split-top':
						return owner.splitTabsTo(tabs, this.POSITION_TOP, {
							triggerEvent          : aEvent,
							scrollToSplitPosition : this.shouldScrollToSplitPosition
						});
					case 'split-right':
						return owner.splitTabsTo(tabs, this.POSITION_RIGHT, {
							triggerEvent          : aEvent,
							scrollToSplitPosition : this.shouldScrollToSplitPosition
						});
					case 'split-bottom':
						return owner.splitTabsTo(tabs, this.POSITION_BOTTOM, {
							triggerEvent          : aEvent,
							scrollToSplitPosition : this.shouldScrollToSplitPosition
						});
					case 'split-left':
						return owner.splitTabsTo(tabs, this.POSITION_LEFT, {
							triggerEvent          : aEvent,
							scrollToSplitPosition : this.shouldScrollToSplitPosition
						});

					case 'move-top':
						return owner.moveTabsTo(tabs, this.POSITION_TOP);
					case 'move-right':
						return owner.moveTabsTo(tabs, this.POSITION_RIGHT);
					case 'move-bottom':
						return owner.moveTabsTo(tabs, this.POSITION_BOTTOM);
					case 'move-left':
						return owner.moveTabsTo(tabs, this.POSITION_LEFT);

					case 'duplicate-top':
						return owner.duplicateTabsAt(tabs, this.POSITION_TOP);
					case 'duplicate-right':
						return owner.duplicateTabsAt(tabs, this.POSITION_RIGHT);
					case 'duplicate-bottom':
						return owner.duplicateTabsAt(tabs, this.POSITION_BOTTOM);
					case 'duplicate-left':
						return owner.duplicateTabsAt(tabs, this.POSITION_LEFT);

					case 'tile-grid':
						return selected ?
								owner.tileSelectedTabs(this.TILE_MODE_GRID) :
								owner.tileAllTabs(this.TILE_MODE_GRID) ;
					case 'tile-x':
						return selected ?
								owner.tileSelectedTabs(this.TILE_MODE_X_AXIS) :
								owner.tileAllTabs(this.TILE_MODE_X_AXIS) ;
					case 'tile-y':
						return selected ?
								owner.tileSelectedTabs(this.TILE_MODE_Y_AXIS) :
								owner.tileAllTabs(this.TILE_MODE_Y_AXIS) ;
					case 'gather':
						return owner.gatherWindows();

					case 'unbind':
						return owner.unbindAsIndependent();

					case 'closeAll':
						return owner.closeAll();
					case 'closeOther':
						return owner.closeOther();

					case 'setAsMainWindow':
						return owner.main = true;

					case 'syncScroll':
						return owner.syncScroll = !owner.syncScroll;
				}
				return;
		}
	},

	_onPopupShowing : function FSUI_onPopupShowing(aEvent)
	{
		switch (aEvent.target.id)
		{
			case 'foxsplitter-general-button-popup':
			case 'foxsplitter-app-popup':
			case 'foxsplitter-view-popup':
				return this._updateGeneralPopup(aEvent.target);

			case 'contentAreaContextMenu':
				return this._updatePageContextPopup();

			case 'tabContextMenu':
				return this._updateTabContextPopup();
		}
	},
	_updateGeneralPopup : function FSUI_updateGeneralPopup(aPopup)
	{
		var tabsItems = aPopup.querySelectorAll('.'+this.MENU_ITEM+'.tabs');
		var multipleTabs = this.owner.visibleTabs.length > 1;
		Array.forEach(tabsItems, function(aItem) {
			if (multipleTabs)
				aItem.removeAttribute('disabled');
			else
				aItem.setAttribute('disabled', true);
		}, this);

		var groupedItems = aPopup.querySelectorAll('.'+this.MENU_ITEM+'.grouped');
		Array.forEach(groupedItems, function(aItem) {
			if (this.owner.parent)
				aItem.removeAttribute('disabled');
			else
				aItem.setAttribute('disabled', true);
		}, this);

		var setAsMainWindowItem = aPopup.querySelector('.'+this.MENU_ITEM+'.setAsMainWindow');
		if (setAsMainWindowItem) {
			if (this.owner.main)
				setAsMainWindowItem.setAttribute('checked', true);
			else
				setAsMainWindowItem.removeAttribute('checked');

			if (!this.owner.parent)
				setAsMainWindowItem.setAttribute('disabled', true);
			else
				setAsMainWindowItem.removeAttribute('disabled');
		}

		var separator = aPopup.querySelector('.'+this.MENU_ITEM+'.syncScrollSeparator');
		var syncScrollItem = aPopup.querySelector('.'+this.MENU_ITEM+'.syncScroll');
		if (this.syncScrollButton.inserted &&
			this.syncScrollButton.node.boxObject.width) {
			if (separator) separator.setAttribute('hidden', true);
			if (syncScrollItem) syncScrollItem.setAttribute('hidden', true);
		}
		else {
			if (separator) separator.removeAttribute('hidden');
			if (syncScrollItem) syncScrollItem.removeAttribute('hidden');
		}

		if (syncScrollItem) {
			if (this.owner.syncScroll)
				syncScrollItem.setAttribute('checked', true);
			else
				syncScrollItem.removeAttribute('checked');

			if (!this.owner.parent)
				syncScrollItem.setAttribute('disabled', true);
			else
				syncScrollItem.removeAttribute('disabled');
		}
	},
	_updatePageContextPopup : function FSUI_updatePageContextPopup()
	{
		if (this.contextLinkItem) {
			if (this.window.gContextMenu.onLink)
				this.contextLinkItem.removeAttribute('hidden');
			else
				this.contextLinkItem.setAttribute('hidden', true);
		}
	},
	_updateTabContextPopup : function FSUI_updateTabContextPopup()
	{
		if (this.tabContextMoveItem) {
			if (this.window.TabContextMenu.contextTab)
				this.tabContextMoveItem.removeAttribute('hidden');
			else
				this.tabContextMoveItem.setAttribute('hidden', true);

			if (this.owner.visibleTabs.length > 1)
				this.tabContextMoveItem.removeAttribute('disabled');
			else
				this.tabContextMoveItem.setAttribute('disabled', true);
		}

		if (this.tabContextDuplicateItem) {
			if (this.window.TabContextMenu.contextTab)
				this.tabContextDuplicateItem.removeAttribute('hidden');
			else
				this.tabContextDuplicateItem.setAttribute('hidden', true);
		}

		if (this.tabContextGatherItem) {
			if (this.owner.parent)
				this.tabContextGatherItem.removeAttribute('disabled');
			else
				this.tabContextGatherItem.setAttribute('disabled', true);
		}
	},

	onSyncScrollStateChange : function FSUI_onSyncScrollStateChange()
	{
		var menuitem = this.document.getElementById('foxsplitter-general-menubutton-syncScroll');
		var button = this.document.getElementById('foxsplitter-syncScroll-button');
		if (this.owner.syncScroll) {
			if (menuitem) menuitem.setAttribute('checked', true);
			if (button) button.setAttribute('checked', true);
		}
		else {
			if (menuitem) menuitem.removeAttribute('checked');
			if (button) button.removeAttribute('checked');
		}
	},

	_onKeyboardShortcutCommand : function FSUI_onKeyboardShortcutCommand(aEvent)
	{
		var owner = this.owner;
		var tabs = owner.selectedTabs;
		var selected = tabs.length;
		if (!selected)
			tabs.push(this.browser.selectedTab);

		switch (aEvent.type.replace(this.EVENT_TYPE_KEY_COMBINATION_COMMAND, ''))
		{
			case 'splitTabToTop':
				return owner.splitTabsTo(tabs, this.POSITION_TOP, {
							scrollToSplitPosition : this.shouldScrollToSplitPosition
						});
			case 'splitTabToRight':
				return owner.splitTabsTo(tabs, this.POSITION_RIGHT, {
							scrollToSplitPosition : this.shouldScrollToSplitPosition
						});
			case 'splitTabToBottom':
				return owner.splitTabsTo(tabs, this.POSITION_BOTTOM, {
							scrollToSplitPosition : this.shouldScrollToSplitPosition
						});
			case 'splitTabToLeft':
				return owner.splitTabsTo(tabs, this.POSITION_LEFT, {
							scrollToSplitPosition : this.shouldScrollToSplitPosition
						});
		}
	},

	_onDragStart : function FSUI_onDragStart(aEvent)
	{
		if (
			aEvent.target != this.generalButton.node &&
			aEvent.target != this.appButton
			)
			return;

		var dt = aEvent.dataTransfer;
		dt.setDragImage(this.documentElement, 0, 0);
		dt.mozSetDataAt(this.WINDOW_DROP_TYPE, this.window, 0);

		var tabs = this.owner.visibleTabs;
		tabs.forEach(function(aTab, aIndex) {
			dt.mozSetDataAt(this.TAB_DROP_TYPE, aTab, aIndex);
		}, this);

		// On Firefox 3.6 or older versions on Windows, drag feedback
		// image isn't shown if there are multiple drag data...
		if (tabs.length <= 1 ||
			'mozSourceNode' in dt ||
			Cc['@mozilla.org/xre/app-info;1']
				.getService(Ci.nsIXULAppInfo)
				.QueryInterface(Ci.nsIXULRuntime).OS != 'WINNT')
			dt.mozCursor = 'default';

		aEvent.stopPropagation();
	},

	_onDragEnd : function FSUI_onDragEnd(aEvent)
	{
		var dragInfo = this.owner.getDragInfo(aEvent);
		if (!dragInfo.canDrop && dragInfo.allTabs)
			this.owner.unbindAsIndependent(aEvent.screenX, aEvent.screenY);
	},

	onTabSelect : function FSUI_onTabSelect(aEvent)
	{
		if (!this.owner.parent)
			return;

		var chromeDisabled = this.documentElement.hasAttribute('disablechrome');
		if (chromeDisabled == this._lastChromeDisabled)
			return;

		this._lastChromeDisabled = chromeDisabled;
		this.updateToolboxAutoHide();
	},

	onMozMouseHittest : function FSUI_onMozMouseHittest(aEvent)
	{
		if (
			this.owner.parent &&
			!this.owner.main &&
			aEvent.originalTarget.ownerDocument == this.document &&
			this.toolbox.boxObject.height != this._originalToolboxHeight &&
			this.document.evaluate(
				'ancestor-or-self::*[local-name()="toolbox"]',
				aEvent.originalTarget,
				null,
				Ci.nsIDOMXPathResult.BOOLEAN_TYPE,
				null
			).booleanValue
			) {
			// stopPropagation() disables WindowDraggingUtils.jsm
			aEvent.stopPropagation();
			// but don't prevent default action, because it is required to accept mouse events!
			// aEvent.preventDefault();
		}
	},


	splitTabsFromToolbarButton : function FSUI_splitTabsFromToolbarButton(aTabs, aEvent)
	{
		var position = prefs.getPref(this.domain+'generalButton.split.position');
		if (this.owner.parent) {
			if (this.owner.position & this.POSITION_HORIZONTAL)
				position = (position & this.POSITION_BEFORE) ?
							this.POSITION_TOP :
							this.POSITION_BOTTOM ;
			else
				position = (position & this.POSITION_BEFORE) ?
							this.POSITION_LEFT :
							this.POSITION_RIGHT ;
		}
		return this.owner.splitTabsTo(aTabs, position, {
			triggerEvent          : aEvent,
			scrollToSplitPosition : this.shouldScrollToSplitPosition
		});
	},

	splitTabsFromAppMenuItem : function FSUI_splitTabsFromAppMenuItem(aTabs)
	{
		return this.owner.duplicateTabsAt(aTabs, prefs.getPref(this.domain+'appMenu.split.position'));
	},

	openContextLinkAt : function FSUI_openContextLinkAt(aPosition)
	{
		var gContextMenu = this.window.gContextMenu;
		if (!gContextMenu)
			return Deferred.next(function() {});

		return this.owner.openLinkAt(gContextMenu.linkURL, aPosition);
	},

	openContextFrameAt : function FSUI_openContextFrameAt(aPosition)
	{
		var gContextMenu = this.window.gContextMenu;
		if (!gContextMenu)
			return Deferred.next(function() {});

		var uri = gContextMenu.target.ownerDocument.defaultView.location.href;
		return this.owner.openLinkAt(uri, aPosition);
	},

	splitTabFromKeyboardTo : function FSUI_splitTabFromKeyboardTo(aPosition)
	{
		var tabs = this.owner.selectedTabs;
		if (!tabs.length)
			tabs = [this.browser.selectedTab];

		return this.owner.splitTabsTo(tabs, aPosition);
	},

	tileTabsFromKeyboard : function FSUI_tileTabsFromKeyboard(aMode)
	{
		var tabs = this.owner.selectedTabs;
		if (!tabs.length)
			tabs = this.owner.visibleTabs;

		return this.owner.tileTabs(tabs, aMode);
	},


	updateChromeHidden : function FSUI_updateChromeHidden(aForceRestore)
	{
		var hiddenItems = [];

		if (this.hiddenUIInInactiveWindow & this.HIDE_MENUBAR)
			hiddenItems.push('menubar');
		if (this.hiddenUIInInactiveWindow & this.HIDE_TOOLBAR)
			hiddenItems.push('toolbar');
		if (this.hiddenUIInInactiveWindow & this.HIDE_LOCATION)
			hiddenItems.push('location');
		if (this.hiddenUIInInactiveWindow & this.HIDE_BOOKMARKS)
			hiddenItems.push('directories');
		if (this.hiddenUIInInactiveWindow & this.HIDE_STATUS)
			hiddenItems.push('status');
		if (this.hiddenUIInInactiveWindow & this.HIDE_EXTRA)
			hiddenItems.push('extrachrome');
		if (this.hiddenUIInInactiveWindow & this.HIDE_EXTRA_TOOLBARS)
			hiddenItems.push('extra-toolbars');

		// extra hidden items controled by Fox Splitter
		if (this.hiddenUIInInactiveWindow & this.HIDE_NON_NAVIGATION_ITEMS)
			hiddenItems.push('toolbar-non-navigation-items');

		hiddenItems = hiddenItems.join(' ');

		if (this.shouldHaveFullUI || aForceRestore)
			this.documentElement.removeAttribute(this.CHROMEHIDDEN);
		else
			this.documentElement.setAttribute(this.CHROMEHIDDEN, hiddenItems);
	},


	setGroupedAppearance : function FSUI_setGroupedAppearance(aForce)
	{
		if (!this._window)
			return;

		if (this._deferredGroupAppearance) {
			this._deferredGroupAppearance.cancel();
			this._deferredGroupAppearance = null;
		}
		if (this._deferredGroupAppearanceUpdate) {
			this._deferredGroupAppearanceUpdate.cancel();
			this._deferredGroupAppearanceUpdate = null;
		}

		if (aForce)
			return this._setGroupedAppearanceInternal(aForce);

		var self = this;
		this._deferredGroupAppearance = Deferred.next(function() {
			delete self._deferredGroupAppearance;
			self._setGroupedAppearanceInternal();
		});
	},
	_setGroupedAppearanceInternal : function FSUI_setGroupedAppearanceInternal(aForce)
	{
		if (!this._window)
			return;

		this._initToolbarState();
		this.startAutoHideTabs();
		this._updateGroupedAppearanceInternal();
	},
	get _autoHideTabsWasEnabled()
	{
		return FoxSplitterUI._autoHideTabsWasEnabled;
	},
	set _autoHideTabsWasEnabled(aValue)
	{
		return FoxSplitterUI._autoHideTabsWasEnabled = aValue;
	},
	_initToolbarState : function FSUI_initToolbarState()
	{
		if (
			!this._window ||
			!this.shouldMinimalizeUI ||
			this._originalToolbarState
			)
			return;

		var state = {};
		this.toolbars.forEach(function(aToolbar, aIndex) {
			let key = aToolbar.id ? 'id:'+aToolbar.id : 'index:'+aIndex;
			state[key] = {
				mode     : aToolbar.getAttribute('mode'),
				iconsize : aToolbar.getAttribute('iconsize')
			};
			aToolbar.setAttribute('mode', 'icons');
			aToolbar.setAttribute('iconsize', 'small');
		}, this);
		this._originalToolbarState = state;
	},


	updateGroupedAppearance : function FSUI_updateGroupedAppearance()
	{
		if (!this._window)
			return;

		if (this._deferredGroupAppearanceUpdate)
			this._deferredGroupAppearanceUpdate.cancel();

		var self = this;
		this._deferredGroupAppearanceUpdate = Deferred.next(function() {
			delete self._deferredGroupAppearanceUpdate;
			self._updateGroupedAppearanceInternal();
		});
	},
	_updateGroupedAppearanceInternal : function FSUI_updateGroupedAppearanceInternal()
	{
		if (!this._window)
			return;

		this.updateChromeHidden();
		this.updateChromeMargin();
		this.updateToolboxAutoHide();
	},


	clearGroupedAppearance : function FSUI_clearGroupedAppearance(aForce)
	{
		if (!this._window)
			return;

		if (this._deferredGroupAppearance) {
			this._deferredGroupAppearance.cancel();
			this._deferredGroupAppearance = null;
		}
		if (this._deferredGroupAppearanceUpdate) {
			this._deferredGroupAppearanceUpdate.cancel();
			this._deferredGroupAppearanceUpdate = null;
		}

		if (aForce)
			return this._clearGroupedAppearanceInternal();

		var self = this;
		this._deferredGroupAppearance = Deferred.next(function() {
			delete self._deferredGroupAppearance;
			self._clearGroupedAppearanceInternal();
		});
	},
	_clearGroupedAppearanceInternal : function FSUI_clearGroupedAppearanceInternal(aForce)
	{
		if (!this._window)
			return;

		this.updateChromeHidden(aForce);

		if (typeof this._originalChromeMargin != 'undefined') {
			if (this._originalChromeMargin)
				this.documentElement.setAttribute('chromemargin', this._originalChromeMargin);
			else
				this.documentElement.removeAttribute('chromemargin');
			delete this._originalChromeMargin;
		}

		this._restoreToolbarState(aForce);

		this.clearToolboxAutoHide();

		this.endAutoHideTabs(aForce);
	},
	_restoreToolbarState : function FSUI_restoreToolbarState(aForce)
	{
		if (!this._window || !this.shouldMinimalizeUI)
			return;

		var state = this._originalToolbarState;
		delete this._originalToolbarState;
		if (state && this._window) {
			this.toolbars.forEach(function(aToolbar, aIndex) {
				let key = aToolbar.id ? 'id:'+aToolbar.id : 'index:'+aIndex;

				if (state[key].mode)
					aToolbar.setAttribute('mode', state[key].mode);
				else
					aToolbar.removeAttribute('mode');

				if (state[key].iconsize)
					aToolbar.setAttribute('iconsize', state[key].iconsize);
				else
					aToolbar.removeAttribute('iconsize');
			}, this);
		}
	},

	updateToolboxAutoHide : function FSUI_updateToolboxAutoHide()
	{
		this.clearToolboxAutoHide();

		var toolbox = this.toolbox;
		if (!toolbox || !this.shouldAutoHideToolbox)
			return;

		var toolboxHeight = toolbox.boxObject.height;
		var collapsedHeight = prefs.getPref(domain+'shouldAutoHideToolbox.collapsedHeight');
		var duration = prefs.getPref(domain+'shouldAutoHideToolbox.animation.duration');
		var delay = prefs.getPref(domain+'shouldAutoHideToolbox.animation.delay');
		this._autoHideToolboxStyleSheet = this.resolveSymbols(<![CDATA[
			:root[%MEMBER%="true"]:not([%MAIN%="true"]) #navigator-toolbox {
				margin-bottom: -%MARGIN_BOTTOM%px;
				max-height: %HEIGHT%px;
				overflow: hidden;
				position: relative;
				transition: margin-bottom ease %DURATION%s %DELAY%s,
				            max-height ease %DURATION%s %DELAY%s;
				-moz-transition: margin-bottom ease %DURATION%s %DELAY%s,
				                 max-height ease %DURATION%s %DELAY%s;
			}
			:root[%MEMBER%="true"]:not([%MAIN%="true"]) #navigator-toolbox:not(:hover) {
				margin-bottom: 0 !important;
				max-height: %COLLAPSED_HEIGHT%px;
			}
		]]>.toString(), {
			HEIGHT           : toolboxHeight,
			MARGIN_BOTTOM    : toolboxHeight - collapsedHeight,
			COLLAPSED_HEIGHT : collapsedHeight,
			DURATION         : duration ? duration / 1000 : 0,
			DELAY            : delay ? delay / 1000 : 0
		});

		this._installStyleSheet(this._autoHideToolboxStyleSheet);

		this._lastChromeDisabled = this.documentElement.hasAttribute('disablechrome');
		this._originalToolboxHeight = toolboxHeight;
	},

	clearToolboxAutoHide : function FSUI_clearToolboxAutoHide()
	{
		if (this._autoHideToolboxStyleSheet) {
			this._uninstallStyleSheet(this._autoHideToolboxStyleSheet);
			delete this._autoHideToolboxStyleSheet;
			delete this._originalToolboxHeight;
		}
	},

	startAutoHideTabs : function FSUI_startAutoHideTabs()
	{
		if (
			!this.shouldAutoHideTabs ||
			!this.browser ||
			typeof this._autoHideTabsWasEnabled != 'undefined'
			)
			return;

		let treeStyleTab = this.browser.treeStyleTab;
		if (treeStyleTab && treeStyleTab.autoHide && treeStyleTab.toggleAutoHide) {
			let enabled = treeStyleTab.autoHide.mode != treeStyleTab.autoHide.kMODE_DISABLED;
			this._autoHideTabsWasEnabled = enabled;

			if (treeStyleTab.toggleAutoHide &&
				treeStyleTab.browser &&
				!enabled) {
				treeStyleTab.toggleAutoHide();
			}
		}
	},

	endAutoHideTabs : function FSUI_endAutoHideTabs(aForce)
	{
		if (
			!this.shouldAutoHideTabs ||
			!this.browser ||
			typeof this._autoHideTabsWasEnabled == 'undefined' ||
			(
				!aForce &&
				FoxSplitterBase.prototype.groupClass.instances.length
			)
			)
			return;

		let treeStyleTab = this.browser.treeStyleTab;
		if (treeStyleTab && treeStyleTab.autoHide && treeStyleTab.toggleAutoHide) {
			let enabled = treeStyleTab.autoHide.mode != treeStyleTab.autoHide.kMODE_DISABLED;
			if (treeStyleTab.toggleAutoHide &&
				treeStyleTab.browser &&
				enabled != this._autoHideTabsWasEnabled) {
				treeStyleTab.toggleAutoHide();
			}
		}
		this._autoHideTabsWasEnabled = undefined;
	}

};

FoxSplitterUI.instances = [];

FoxSplitterUI.shouldMinimalizeUI = prefs.getPref(domain+'shouldMinimalizeUI');
FoxSplitterUI.shouldAutoHideToolbox = prefs.getPref(domain+'shouldAutoHideToolbox');
FoxSplitterUI.shouldAutoHideTabs = prefs.getPref(domain+'shouldAutoHideTabs');
FoxSplitterUI.shouldFixActiveWindow = prefs.getPref(domain+'shouldFixActiveWindow');
FoxSplitterUI.hiddenUIInInactiveWindow = prefs.getPref(domain+'hiddenUIInInactiveWindow');
FoxSplitterUI.shouldScrollToSplitPosition = prefs.getPref(domain+'shouldScrollToSplitPosition');

var prefListener = {
		domain : domain,
		observe : function FSUIPL_observe(aSubject, aTopic, aData) {
			if (aTopic != 'nsPref:changed')
				return;

			var prefName = aData.replace(domain, '');
			if (prefName in FoxSplitterUI) {
				FoxSplitterUI[prefName] = prefs.getPref(aData);
				switch (prefName)
				{
					/*
					case 'shouldMinimalizeUI':
					case 'shouldAutoHideTabs':
					*/
					case 'shouldFixActiveWindow':
					case 'hiddenUIInInactiveWindow':
						FoxSplitterUI.instances.forEach(function(aUI) {
							aUI.updateGroupedAppearance();
						});
						break;
				}
			}
			else {
				switch (prefName)
				{
					case 'appMenu.split':
					case 'viewMenu.split':
					case 'context.splitFromLink':
					case 'context.splitFromFrame':
					case 'context.splitFromTab.move':
					case 'context.splitFromTab.duplicate':
					case 'context.gatherWindows':
					case 'selection.splitToTop':
					case 'selection.splitToRight':
					case 'selection.splitToBottom':
					case 'selection.splitToLeft':
					case 'selection.grid':
					case 'selection.x':
					case 'selection.y':
						FoxSplitterUI.instances.forEach(function(aUI) {
							aUI.resetMenuItems();
						});
						break;

					case 'shortcut.splitTabToTop':
					case 'shortcut.splitTabToRight':
					case 'shortcut.splitTabToBottom':
					case 'shortcut.splitTabToLeft':
					case 'shortcut.grid':
					case 'shortcut.x':
					case 'shortcut.y':
					case 'shortcut.gather':
						FoxSplitterUI.instances.forEach(function(aUI) {
							aUI.resetKeyboardShortcuts();
							aUI.resetMenuItems();
						});
						break;

					case 'draggableAppButton':
						FoxSplitterUI.instances.forEach(function(aUI) {
							aUI.resetDraggableAppButton();
						});
						break;

					case 'shouldAutoHideToolbox.animation.duration':
					case 'shouldAutoHideToolbox.animation.delay':
					case 'shouldAutoHideToolbox.collapsedHeight':
						FoxSplitterUI.instances.forEach(function(aUI) {
							aUI.updateToolboxAutoHide();
						});
						break;
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
