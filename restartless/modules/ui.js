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
	get toolbars()
	{
		return !this._window ? [] : Array.slice(this.document.querySelectorAll('toolbar, toolbox')) ;
	},

	get shouldMinimalizeUI() { return FoxSplitterUI.shouldMinimalizeUI; },
	set shouldMinimalizeUI(aValue) { return FoxSplitterUI.shouldMinimalizeUI = aValue; },
	get shouldAutoHideTabs() { return FoxSplitterUI.shouldAutoHideTabs; },
	set shouldAutoHideTabs(aValue) { return FoxSplitterUI.shouldAutoHideTabs = aValue; },
	get hiddenUIInInactiveWindow() { return FoxSplitterUI.hiddenUIInInactiveWindow; },
	set hiddenUIInInactiveWindow(aValue) { return FoxSplitterUI.hiddenUIInInactiveWindow = aValue; },


	init : function FSUI_init(aFSWindow)
	{
		this.owner = aFSWindow;
		this.shortcuts = {};

		FoxSplitterUI.instances.push(this);

		this._installStyleSheet();
		this._initToolbarItems();
		this._initKeyboardShortcuts();
		this._initMenuItems();
	},

	destroy : function FSUI_destroy(aOnQuit)
	{
		this.clearGroupedAppearance(aOnQuit);
		this._destroyToolbarItems();
		this._destroyMenuItems();
		this._destroyKeyboardShortcuts();
		this._uninstallStyleSheet();

		FoxSplitterUI.instances = FoxSplitterUI.instances.filter(function(aUI) {
			return aUI != this;
		}, this);

		delete this.owner;
	},

	_installStyleSheet : function FSUI_installStyleSheet()
	{
		if (this._styleSheet)
			return;
		this._styleSheet = this.document.createProcessingInstruction('xml-stylesheet',
			'type="text/css" href="data:text/css,'+encodeURIComponent(this.STYLESHEET)+'"');
		this.document.insertBefore(this._styleSheet, this.documentElement);
	},

	_uninstallStyleSheet : function FSUI_uninstallStyleSheet()
	{
		if (!this._styleSheet)
			return;
		this.document.removeChild(this._styleSheet);
		delete this._styleSheet;
	},


	_initToolbarItems : function FSUI_initToolbarItems()
	{
		var toolbar = this.document.getElementById('nav-bar');
		var self = this;
		var iconicClass = 'menuitem-iconic ' + this.MENU_ITEM+' ';

		this.generalButton = ToolbarItem.create(
			<>
				<toolbarbutton id="foxsplitter-general-button"
					type="menu-button"
					label={bundle.getString('ui.split.short')}
					tooltiptext={bundle.getString('ui.split.long')}
					class={ToolbarItem.BASIC_ITEM_CLASS + ' ' + this.TOOLBAR_ITEM}
					oncommand="FoxSplitter.ui.handleEvent(event);"
					onclick="FoxSplitter.ui.handleEvent(event);"
					foxsplitter-acceptmiddleclick="true">
					<menupopup id="foxsplitter-general-button-popup"
						onpopupshowing="FoxSplitter.ui.onPopupShowing(event);">
						<menuitem id="foxsplitter-general-menubutton-split-right"
							class={iconicClass+'split-right'}
							label={bundle.getString('ui.split.right.long')}
							accesskey={bundle.getString('ui.split.right.accesskey')}
							foxsplitter-acceptmiddleclick="true"/>
						<menuitem id="foxsplitter-general-menubutton-split-left"
							class={iconicClass+'split-left'}
							label={bundle.getString('ui.split.left.long')}
							accesskey={bundle.getString('ui.split.left.accesskey')}
							foxsplitter-acceptmiddleclick="true"/>
						<menuitem id="foxsplitter-general-menubutton-split-top"
							class={iconicClass+'split-top'}
							label={bundle.getString('ui.split.top.long')}
							accesskey={bundle.getString('ui.split.top.accesskey')}
							foxsplitter-acceptmiddleclick="true"/>
						<menuitem id="foxsplitter-general-menubutton-split-bottom"
							class={iconicClass+'split-bottom'}
							label={bundle.getString('ui.split.bottom.long')}
							accesskey={bundle.getString('ui.split.bottom.accesskey')}
							foxsplitter-acceptmiddleclick="true"/>
						<menuseparator/>
						<menuitem id="foxsplitter-general-menubutton-tile-grid"
							class={iconicClass+'tile-grid tabs'}
							label={bundle.getString('ui.layout.grid.long')}
							accesskey={bundle.getString('ui.layout.grid.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-tile-x"
							class={iconicClass+'tile-x tabs'}
							label={bundle.getString('ui.layout.x.long')}
							accesskey={bundle.getString('ui.layout.x.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-tile-y"
							class={iconicClass+'tile-y tabs'}
							label={bundle.getString('ui.layout.y.long')}
							accesskey={bundle.getString('ui.layout.y.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-gather"
							class={iconicClass+'gather grouped'}
							label={bundle.getString('ui.gather.long')}
							accesskey={bundle.getString('ui.gather.accesskey')}/>
						<menuseparator/>
						<menuitem id="foxsplitter-general-menubutton-closeAll"
							class={iconicClass+'closeAll grouped'}
							label={bundle.getString('ui.closeAll.long')}
							accesskey={bundle.getString('ui.closeAll.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-closeOther"
							class={this.MENU_ITEM+' closeOther grouped'}
							label={bundle.getString('ui.closeOther.long')}
							accesskey={bundle.getString('ui.closeOther.accesskey')}/>
						<menuseparator id="foxsplitter-general-menubutton-syncScroll-separator"/>
						<menuitem id="foxsplitter-general-menubutton-syncScroll"
							type="checkbox"
							autoCheck="false"
							label={bundle.getString('ui.syncScroll.long')}
							accesskey={bundle.getString('ui.syncScroll.accesskey')}/>
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
						<menupopup oncommand="FoxSplitter.ui.handleEvent(event);">
							<menuitem id="foxsplitter-app-split-right"
								class={iconicClass+'split-right'}
								label={bundle.getString('ui.split.right.short')}
								accesskey={bundle.getString('ui.split.right.accesskey')}
								key="foxsplitter-key-splitTabToRight"/>
							<menuitem id="foxsplitter-app-split-left"
								class={iconicClass+'split-left'}
								label={bundle.getString('ui.split.left.short')}
								accesskey={bundle.getString('ui.split.left.accesskey')}
								key="foxsplitter-key-splitTabToLeft"/>
							<menuitem id="foxsplitter-app-split-top"
								class={iconicClass+'split-top'}
								label={bundle.getString('ui.split.top.short')}
								accesskey={bundle.getString('ui.split.top.accesskey')}
								key="foxsplitter-key-splitTabToTop"/>
							<menuitem id="foxsplitter-app-split-bottom"
								class={iconicClass+'split-bottom'}
								label={bundle.getString('ui.split.bottom.short')}
								accesskey={bundle.getString('ui.split.bottom.accesskey')}
								key="foxsplitter-key-splitTabToBottom"/>
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
						accesskey={bundle.getString('ui.split.view.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);">
						<menupopup>
							<menuitem id="foxsplitter-view-split-right"
								class={iconicClass+'split-right'}
								label={bundle.getString('ui.split.right.short')}
								accesskey={bundle.getString('ui.split.right.accesskey')}
								key="foxsplitter-key-splitTabToRight"/>
							<menuitem id="foxsplitter-view-split-left"
								class={iconicClass+'split-left'}
								label={bundle.getString('ui.split.left.short')}
								accesskey={bundle.getString('ui.split.left.accesskey')}
								key="foxsplitter-key-splitTabToLeft"/>
							<menuitem id="foxsplitter-view-split-top"
								class={iconicClass+'split-top'}
								label={bundle.getString('ui.split.top.short')}
								accesskey={bundle.getString('ui.split.top.accesskey')}
								key="foxsplitter-key-splitTabToTop"/>
							<menuitem id="foxsplitter-view-split-bottom"
								class={iconicClass+'split-bottom'}
								label={bundle.getString('ui.split.bottom.short')}
								accesskey={bundle.getString('ui.split.bottom.accesskey')}
								key="foxsplitter-key-splitTabToBottom"/>
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
						accesskey={bundle.getString('ui.split.link.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);"
						onclick="FoxSplitter.ui.handleEvent(event);">
						<menupopup>
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
						accesskey={bundle.getString('ui.split.frame.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);"
						onclick="FoxSplitter.ui.handleEvent(event);">
						<menupopup>
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
		if (tabContextPopup && prefs.getPref(this.domain+'context.splitFromTab.move')) {
			this.tabContextMoveItem = ToolbarItem.toDOMDocumentFragment(<>
					<menu id="foxsplitter-context-tab-split-move"
						class={'menu-iconic split '+this.MENU_ITEM}
						label={bundle.getString('ui.split.tab.move.label')}
						accesskey={bundle.getString('ui.split.tab.move.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);">
						<menupopup>
							<menuitem id="foxsplitter-context-tab-split-move-right"
								class={iconicClass+'split-right'}
								label={bundle.getString('ui.split.right.short')}
								accesskey={bundle.getString('ui.split.right.accesskey')}/>
							<menuitem id="foxsplitter-context-tab-split-move-left"
								class={iconicClass+'split-left'}
								label={bundle.getString('ui.split.left.short')}
								accesskey={bundle.getString('ui.split.left.accesskey')}/>
							<menuitem id="foxsplitter-context-tab-split-move-top"
								class={iconicClass+'split-top'}
								label={bundle.getString('ui.split.top.short')}
								accesskey={bundle.getString('ui.split.top.accesskey')}/>
							<menuitem id="foxsplitter-context-tab-split-move-bottom"
								class={iconicClass+'split-bottom'}
								label={bundle.getString('ui.split.bottom.short')}
								accesskey={bundle.getString('ui.split.bottom.accesskey')}/>
							<menuseparator/>
							<menuitem id="foxsplitter-context-tab-tile-grid"
								class={iconicClass+'tile-grid tabs'}
								label={bundle.getString('ui.layout.grid.long')}
								accesskey={bundle.getString('ui.layout.grid.accesskey')}/>
							<menuitem id="foxsplitter-context-tab-tile-x"
								class={iconicClass+'tile-x tabs'}
								label={bundle.getString('ui.layout.x.long')}
								accesskey={bundle.getString('ui.layout.x.accesskey')}/>
							<menuitem id="foxsplitter-context-tab-tile-y"
								class={iconicClass+'tile-y tabs'}
								label={bundle.getString('ui.layout.y.long')}
								accesskey={bundle.getString('ui.layout.y.accesskey')}/>
						</menupopup>
					</menu>
				</>, tabContextPopup).querySelector('*');
			tabContextPopup.insertBefore(this.tabContextMoveItem, this.document.getElementById('context_openTabInWindow').nextSibling);
		}
		if (tabContextPopup && prefs.getPref(this.domain+'context.splitFromTab.duplicate')) {
			let popup = this.document.querySelector('#tabContextMenu');
			this.tabContextDuplicateItem = ToolbarItem.toDOMDocumentFragment(<>
					<menu id="foxsplitter-context-tab-split-duplicate"
						class={this.tabContextMoveItem ? '' : 'menu-iconic split '+this.MENU_ITEM }
						label={bundle.getString('ui.split.tab.duplicate.label')}
						accesskey={bundle.getString('ui.split.tab.duplicate.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);">
						<menupopup>
							<menuitem id="foxsplitter-context-tab-split-duplicate-right"
								class={iconicClass+'split-right'}
								label={bundle.getString('ui.split.right.short')}
								accesskey={bundle.getString('ui.split.right.accesskey')}/>
							<menuitem id="foxsplitter-context-tab-split-duplicate-left"
								class={iconicClass+'split-left'}
								label={bundle.getString('ui.split.left.short')}
								accesskey={bundle.getString('ui.split.left.accesskey')}/>
							<menuitem id="foxsplitter-context-tab-split-duplicate-top"
								class={iconicClass+'split-top'}
								label={bundle.getString('ui.split.top.short')}
								accesskey={bundle.getString('ui.split.top.accesskey')}/>
							<menuitem id="foxsplitter-context-tab-split-duplicate-bottom"
								class={iconicClass+'split-bottom'}
								label={bundle.getString('ui.split.bottom.short')}
								accesskey={bundle.getString('ui.split.bottom.accesskey')}/>
						</menupopup>
					</menu>
				</>, tabContextPopup).querySelector('*');
			tabContextPopup.insertBefore(this.tabContextDuplicateItem, (this.tabContextMoveItem || this.document.getElementById('context_openTabInWindow')).nextSibling);
		}
		if (tabContextPopup && prefs.getPref(this.domain+'context.gatherWindows')) {
			let popup = this.document.querySelector('#tabContextMenu');
			this.tabContextGatherItem = ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-context-tab-gather"
						class={iconicClass+'gather grouped'}
						label={bundle.getString('ui.gather.long')}
						accesskey={bundle.getString('ui.gather.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, tabContextPopup).querySelector('*');
			tabContextPopup.insertBefore(this.tabContextGatherItem, this.document.getElementById('context_bookmarkAllTabs').nextSibling);
		}
		if (this.tabContextMoveItem || this.tabContextDuplicateItem || this.tabContextGatherItem)
			tabContextPopup.addEventListener('popupshowing', this, false);

		var selectionPopup = this.document.getElementById('multipletab-selection-menu');
		if (selectionPopup && prefs.getPref(this.domain+'selection.grid')) {
			this.tabSelectionTileGridItem = ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-tile-grid"
						class={iconicClass+'tile-grid'}
						label={bundle.getString('ui.layout.grid.selection')}
						accesskey={bundle.getString('ui.layout.grid.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*');
			selectionPopup.appendChild(this.tabSelectionTileGridItem);
		}
		if (selectionPopup && prefs.getPref(this.domain+'selection.x')) {
			this.tabSelectionTileXItem = ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-tile-x"
						class={iconicClass+'tile-x grouped'}
						label={bundle.getString('ui.layout.x.selection')}
						accesskey={bundle.getString('ui.layout.x.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*');
			selectionPopup.appendChild(this.tabSelectionTileXItem);
		}
		if (selectionPopup && prefs.getPref(this.domain+'selection.y')) {
			this.tabSelectionTileYItem = ToolbarItem.toDOMDocumentFragment(<>
					<menuitem id="foxsplitter-selection-tile-y"
						class={iconicClass+'tile-y grouped'}
						label={bundle.getString('ui.layout.y.selection')}
						accesskey={bundle.getString('ui.layout.y.accesskey')}
						oncommand="FoxSplitter.ui.handleEvent(event);"/>
				</>, selectionPopup).querySelector('*');
			selectionPopup.appendChild(this.tabSelectionTileYItem);
		}
		if (this.tabSelectionTileGridItem || this.tabSelectionTileXItem || this.tabSelectionTileYItem) {
			this.tabSelectionSeparator = this.document.createElement('menuseparator');
			selectionPopup.insertBefore(this.tabSelectionSeparator, this.tabSelectionTileGridItem || this.tabSelectionTileXItem || this.tabSelectionTileYItem);
		}
	},

	_destroyMenuItems : function FSUI_destroyMenuItems()
	{
		if (this.contextFrameItem) {
			let popup = this.document.getElementById('contentAreaContextMenu');
			popup.removeEventListener('popupshowing', this, false);
		}

		if (this.tabContextMoveItem || this.tabContextDuplicateItem || this.tabContextGatherItem) {
			let popup = this.document.querySelector('#tabContextMenu') ||
						this.document.getAnonymousElementByAttribute(this.browser, 'anonid', 'tabContextMenu'); // Firefox 3.6
			popup.removeEventListener('popupshowing', this, false);
		}

		<![CDATA[
			appMenuItem
			viewMenuItem
			contextLinkItem
			contextFrameItem
			tabContextMoveItem
			tabContextDuplicateItem
			tabContextGatherItem
			tabSelectionTileGridItem
			tabSelectionTileXItem
			tabSelectionTileYItem
			tabSelectionSeparator
		]]>.toString().replace(/^\s+|\s+$/g, '').split(/\s+/)
			.forEach(function(aItem) {
				var item = this[aItem];
				if (item) {
					if (item.parentNode)
						item.parentNode.removeChild(item);
					delete this[aItem];
				}
			}, this);
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
				splitTabToTop    : 'FoxSplitter.splitCurrentTabTo(FoxSplitter.POSITION_TOP);',
				splitTabToRight  : 'FoxSplitter.splitCurrentTabTo(FoxSplitter.POSITION_RIGHT);',
				splitTabToBottom : 'FoxSplitter.splitCurrentTabTo(FoxSplitter.POSITION_BOTTOM);',
				splitTabToLeft   : 'FoxSplitter.splitCurrentTabTo(FoxSplitter.POSITION_LEFT);'
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
				return this.onPopupShowing(aEvent);
			case this.EVENT_TYPE_KEY_COMBINATION_COMMAND+'splitTabToTop':
			case this.EVENT_TYPE_KEY_COMBINATION_COMMAND+'splitTabToRight':
			case this.EVENT_TYPE_KEY_COMBINATION_COMMAND+'splitTabToBottom':
			case this.EVENT_TYPE_KEY_COMBINATION_COMMAND+'splitTabToLeft':
				return this.onKeyboardShortcutCommand(aEvent);
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

			case 'foxsplitter-general-menubutton-split-top':
				return owner.splitTabsTo(tabs, this.POSITION_TOP, aEvent);
			case 'foxsplitter-general-menubutton-split-right':
				return owner.splitTabsTo(tabs, this.POSITION_RIGHT, aEvent);
			case 'foxsplitter-general-menubutton-split-bottom':
				return owner.splitTabsTo(tabs, this.POSITION_BOTTOM, aEvent);
			case 'foxsplitter-general-menubutton-split-left':
				return owner.splitTabsTo(tabs, this.POSITION_LEFT, aEvent);

			case 'foxsplitter-context-tab-split-move-top':
				return owner.moveTabsTo(tabs, this.POSITION_TOP);
			case 'foxsplitter-context-tab-split-move-right':
				return owner.moveTabsTo(tabs, this.POSITION_RIGHT);
			case 'foxsplitter-context-tab-split-move-bottom':
				return owner.moveTabsTo(tabs, this.POSITION_BOTTOM);
			case 'foxsplitter-context-tab-split-move-left':
				return owner.moveTabsTo(tabs, this.POSITION_LEFT);

			case 'foxsplitter-app-split':
				return this.splitTabsFromAppMenuItem(tabs);

			case 'foxsplitter-app-split-top':
			case 'foxsplitter-view-split-top':
			case 'foxsplitter-context-tab-split-duplicate-top':
				return owner.duplicateTabsAt(tabs, this.POSITION_TOP);
			case 'foxsplitter-app-split-right':
			case 'foxsplitter-view-split-right':
			case 'foxsplitter-context-tab-split-duplicate-right':
				return owner.duplicateTabsAt(tabs, this.POSITION_RIGHT);
			case 'foxsplitter-app-split-bottom':
			case 'foxsplitter-view-split-bottom':
			case 'foxsplitter-context-tab-split-duplicate-bottom':
				return owner.duplicateTabsAt(tabs, this.POSITION_BOTTOM);
			case 'foxsplitter-app-split-left':
			case 'foxsplitter-view-split-left':
			case 'foxsplitter-context-tab-split-duplicate-left':
				return owner.duplicateTabsAt(tabs, this.POSITION_LEFT);

			case 'foxsplitter-context-link-split-top':
				return owner.openContextLinkAt(this.POSITION_TOP);
			case 'foxsplitter-context-link-split-right':
				return owner.openContextLinkAt(this.POSITION_RIGHT);
			case 'foxsplitter-context-link-split-bottom':
				return owner.openContextLinkAt(this.POSITION_BOTTOM);
			case 'foxsplitter-context-link-split-left':
				return owner.openContextLinkAt(this.POSITION_LEFT);

			case 'foxsplitter-context-frame-split-top':
				return owner.openContextFrameAt(this.POSITION_TOP);
			case 'foxsplitter-context-frame-split-right':
				return owner.openContextFrameAt(this.POSITION_RIGHT);
			case 'foxsplitter-context-frame-split-bottom':
				return owner.openContextFrameAt(this.POSITION_BOTTOM);
			case 'foxsplitter-context-frame-split-left':
				return owner.openContextFrameAt(this.POSITION_LEFT);

			case 'foxsplitter-general-menubutton-tile-grid':
			case 'foxsplitter-context-tab-tile-grid':
			case 'foxsplitter-selection-tile-grid':
				return selected ?
						owner.tileSelectedTabs(this.TILE_MODE_GRID) :
						owner.tileAllTabs(this.TILE_MODE_GRID) ;
			case 'foxsplitter-general-menubutton-tile-x':
			case 'foxsplitter-context-tab-tile-x':
			case 'foxsplitter-selection-tile-x':
				return selected ?
						owner.tileSelectedTabs(this.TILE_MODE_X_AXIS) :
						owner.tileAllTabs(this.TILE_MODE_X_AXIS) ;
			case 'foxsplitter-general-menubutton-tile-y':
			case 'foxsplitter-context-tab-tile-y':
			case 'foxsplitter-selection-tile-y':
				return selected ?
						owner.tileSelectedTabs(this.TILE_MODE_Y_AXIS) :
						owner.tileAllTabs(this.TILE_MODE_Y_AXIS) ;

			case 'foxsplitter-general-menubutton-gather':
			case 'foxsplitter-context-tab-gather':
				return owner.gatherWindows();

			case 'foxsplitter-general-menubutton-closeAll':
				return owner.closeAll();
			case 'foxsplitter-general-menubutton-closeOther':
				return owner.closeOther();

			case 'foxsplitter-general-menubutton-syncScroll':
			case 'foxsplitter-syncScroll-button':
				return owner.syncScroll = !owner.syncScroll;
		}
	},

	onPopupShowing : function FSUI_onPopupShowing(aEvent)
	{
		switch (aEvent.target.id)
		{
			case 'foxsplitter-general-button-popup':
				return this._updateGeneralPopup();

			case 'contentAreaContextMenu':
				return this._updatePageContextPopup();

			case 'tabContextMenu':
				return this._updateTabContextPopup();
		}
	},
	_updateGeneralPopup : function FSUI_updateGeneralPopup()
	{
		var tabsItems = this.generalButton.node.querySelectorAll('.'+this.MENU_ITEM+'.tabs');
		var multipleTabs = this.owner.visibleTabs.length > 1;
		Array.forEach(tabsItems, function(aItem) {
			if (multipleTabs)
				aItem.removeAttribute('disabled');
			else
				aItem.setAttribute('disabled', true);
		}, this);

		var groupedItems = this.generalButton.node.querySelectorAll('.'+this.MENU_ITEM+'.grouped');
		Array.forEach(groupedItems, function(aItem) {
			if (this.owner.parent)
				aItem.removeAttribute('disabled');
			else
				aItem.setAttribute('disabled', true);
		}, this);

		var separator = this.generalButton.node.querySelector('#foxsplitter-general-menubutton-syncScroll-separator');
		var syncScrollItem = this.generalButton.node.querySelector('#foxsplitter-general-menubutton-syncScroll');
		if (this.syncScrollButton.inserted &&
			this.syncScrollButton.node.boxObject.width) {
			if (separator) separator.setAttribute('hidden', true);
			if (syncScrollItem) syncScrollItem.setAttribute('hidden', true);
		}
		else {
			if (separator) separator.removeAttribute('hidden');
			if (syncScrollItem) syncScrollItem.removeAttribute('hidden');
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

	onKeyboardShortcutCommand : function FSUI_onKeyboardShortcutCommand(aEvent)
	{
		var owner = this.owner;
		var tabs = owner.selectedTabs;
		var selected = tabs.length;
		if (!selected)
			tabs.push(this.browser.selectedTab);

		switch (aEvent.type.replace(this.EVENT_TYPE_KEY_COMBINATION_COMMAND, ''))
		{
			case 'splitTabToTop':
				return owner.splitTabsTo(tabs, this.POSITION_TOP);
			case 'splitTabToRight':
				return owner.splitTabsTo(tabs, this.POSITION_RIGHT);
			case 'splitTabToBottom':
				return owner.splitTabsTo(tabs, this.POSITION_BOTTOM);
			case 'splitTabToLeft':
				return owner.splitTabsTo(tabs, this.POSITION_LEFT);
		}
	},


	splitTabsFromToolbarButton : function FSUI_splitTabsFromToolbarButton(aTabs, aEvent)
	{
		return this.owner.splitTabsTo(aTabs, prefs.getPref(this.domain+'generalButton.split.position'), aEvent);
	},

	splitTabsFromAppMenuItem : function FSUI_splitTabsFromAppMenuItem(aTabs)
	{
		return this.owner.duplicateTabsAt(aTabs, prefs.getPref(this.domain+'appMenu.split.position'));
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

		// extra hidden items controled by Fox Splitter
		if (this.hiddenUIInInactiveWindow & this.HIDE_NON_NAVIGATION_ITEMS)
			hiddenItems.push('toolbar-non-navigation-items');

		hiddenItems = hiddenItems.join(' ');

		if (this._originalChromeHidden === undefined)
			this._originalChromeHidden = this.documentElement.getAttribute('chromehidden');

		if (this.owner.active || !this.owner.parent || aForceRestore) {
			if (this._originalChromeHidden)
				this.documentElement.setAttribute('chromehidden', this._originalChromeHidden);
			else
				this.documentElement.removeAttribute('chromehidden');

			delete this._originalChromeHidden;
		}
		else
			this.documentElement.setAttribute('chromehidden', hiddenItems);
	},
	_originalChromeHidden : undefined,


	setGroupedAppearance : function FSUI_setGroupedAppearance()
	{
		if (!this._window)
			return;

		this.updateChromeHidden();

		this._initToolbarState();

		if (
			this.shouldAutoHideTabs &&
			this.browser &&
			this._autoHideWasEnabled === undefined
			) {
			let treeStyleTab = this.browser.treeStyleTab;
			if (treeStyleTab && treeStyleTab.autoHide && treeStyleTab.toggleAutoHide) {
				let enabled = treeStyleTab.autoHide.mode != treeStyleTab.autoHide.kMODE_DISABLED;
				this._autoHideWasEnabled = enabled;
				if (treeStyleTab.toggleAutoHide && !enabled) {
					treeStyleTab.toggleAutoHide();
				}
			}
		}
	},
	get _autoHideWasEnabled()
	{
		return FoxSplitterUI._autoHideWasEnabled;
	},
	set _autoHideWasEnabled(aValue)
	{
		return FoxSplitterUI._autoHideWasEnabled = aValue;
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


	clearGroupedAppearance : function FSUI_clearGroupedAppearance(aForce)
	{
		if (!this._window)
			return;

		this.updateChromeHidden(aForce);

		this._restoreToolbarState(aForce);

		if (
			this.shouldAutoHideTabs &&
			this.browser &&
			this._autoHideWasEnabled !== undefined &&
			(
				aForce ||
				(
					!this.owner.parent &&
					FoxSplitterBase.prototype.memberClass.instances.length == 1
				)
			)
			) {
			let treeStyleTab = this.browser.treeStyleTab;
			if (treeStyleTab && treeStyleTab.autoHide && treeStyleTab.toggleAutoHide) {
				let enabled = treeStyleTab.autoHide.mode != treeStyleTab.autoHide.kMODE_DISABLED;
				if (treeStyleTab.toggleAutoHide && enabled != this._autoHideWasEnabled)
					treeStyleTab.toggleAutoHide();
			}
			this._autoHideWasEnabled = undefined;
		}
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
	}

};

FoxSplitterUI.instances = [];

FoxSplitterUI.shouldMinimalizeUI = prefs.getPref(domain+'shouldMinimalizeUI');
FoxSplitterUI.shouldAutoHideTabs = prefs.getPref(domain+'shouldAutoHideTabs');
FoxSplitterUI.hiddenUIInInactiveWindow = prefs.getPref(domain+'hiddenUIInInactiveWindow');

var prefListener = {
		domain : domain,
		observe : function FSUIPL_observe(aSubject, aTopic, aData) {
			if (aTopic != 'nsPref:changed')
				return;

			var prefName = aData.replace(domain, '');
			if (prefName in FoxSplitterUI) {
				FoxSplitterUI[prefName] = prefs.getPref(aData);
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
						FoxSplitterUI.instances.forEach(function(aUI) {
							aUI.resetKeyboardShortcuts();
							aUI.resetMenuItems();
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
