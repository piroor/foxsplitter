load('lib/jsdeferred');
load('lib/prefs');
load('lib/ToolbarItem');
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

	BASE_STYLESHEET : <![CDATA[
/*
		:root[ACTIVE="false"] toolbox,
		:root[ACTIVE="false"] .treestyletab-tabbar,
		:root[ACTIVE="false"] .treestyletab-tabbar-ready {
			visibility: collapse !important;
		}
*/
		.DROP_INDICATOR {
			background: rgba(0, 0, 0, 0.75);
			border: 0 solid rgba(255, 255, 255, 0.75);
			border-radius: 0;
			line-height: 0;
			margin: 0;
			opacity: MIN_OPACITY;
			padding: 0;
			-moz-appearance: none;
			-moz-border-radius: 0;
			-moz-box-align: center;
			-moz-box-pack: center;
			-moz-transition: opacity 0.25s ease-in;
		}

		.DROP_INDICATOR.top {
			border-top-width: 1px;
		}
		.DROP_INDICATOR.right {
			border-right-width: 1px;
		}
		.DROP_INDICATOR.bottom {
			border-bottom-width: 1px;
		}
		.DROP_INDICATOR.left {
			border-left-width: 1px;
		}

		.DROP_INDICATOR label {
			color: white;
			line-height: 0;
			margin: 0;
			min-height: 0;
			min-width: 0;
			padding: 0;
		}

		.toolbarbutton-1.TOOLBAR_ITEM,
		#foxsplitter-syncScroll-button {
			list-style-image: url("resource://foxsplitter-resources/modules/images/icon16.png");
			-moz-image-region: rect(0 16px 16px 0);
		}

		toolbox[iconsize="large"] .toolbarbutton-1.TOOLBAR_ITEM {
			list-style-image: url("resource://foxsplitter-resources/modules/images/icon24.png");
			-moz-image-region: rect(0 24px 24px 0);
		}

		.MENU_ITEM.menuitem-iconic {
			list-style-image: url("resource://foxsplitter-resources/modules/images/icon16.png");
			-moz-image-region: rect(0 16px 16px 0);
		}
		.MENU_ITEM.closeAll                      { -moz-image-region: rect(0 32px 16px 16px); }
		.MENU_ITEM.closeAll[disabled="true"]     { -moz-image-region: rect(16px 32px 32px 16px); }
		.MENU_ITEM.gather                        { -moz-image-region: rect(0 48px 16px 32px); }
		.MENU_ITEM.gather[disabled="true"]       { -moz-image-region: rect(16px 48px 32px 32px); }
		.MENU_ITEM.tile-grid                     { -moz-image-region: rect(0 64px 16px 48px); }
		.MENU_ITEM.tile-grid[disabled="true"]    { -moz-image-region: rect(16px 64px 32px 48px); }
		.MENU_ITEM.tile-x                        { -moz-image-region: rect(0 80px 16px 64px); }
		.MENU_ITEM.tile-x[disabled="true"]       { -moz-image-region: rect(16px 80px 32px 64px); }
		.MENU_ITEM.tile-y                        { -moz-image-region: rect(0 96px 16px 80px); }
		.MENU_ITEM.tile-y[disabled="true"]       { -moz-image-region: rect(16px 96px 32px 80px); }
		.MENU_ITEM.split-top                     { -moz-image-region: rect(0 144px 16px 128px); }
		.MENU_ITEM.split-top[disabled="true"]    { -moz-image-region: rect(16px 144px 32px 128px); }
		.MENU_ITEM.split-right                   { -moz-image-region: rect(0 160px 16px 144px); }
		.MENU_ITEM.split-right[disabled="true"]  { -moz-image-region: rect(16px 160px 32px 144px); }
		.MENU_ITEM.split-bottom                  { -moz-image-region: rect(0 176px 16px 160px); }
		.MENU_ITEM.split-bottom[disabled="true"] { -moz-image-region: rect(16px 176px 32px 160px); }
		.MENU_ITEM.split-left                    { -moz-image-region: rect(0 192px 16px 176px); }
		.MENU_ITEM.split-left[disabled="true"]   { -moz-image-region: rect(16px 192px 32px 176px); }

		:root:not([MEMBER="true"]) toolbox:not([customizing="true"]) #foxsplitter-syncScroll-button {
			visibility: collapse;
		}
		#foxsplitter-syncScroll-button                 { -moz-image-region: rect(0 112px 16px 96px); }
		#foxsplitter-syncScroll-button[checked="true"] { -moz-image-region: rect(0 128px 16px 112px); }
	]]>.toString(),

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

		FoxSplitterUI.instances.push(this);

		this._installStyleSheet();
		this._initToolbarItems();
	},

	destroy : function FSUI_destroy(aOnQuit)
	{
		this.clearGroupedAppearance(aOnQuit);
		this._destroyToolbarItems();
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
		var styles = this.BASE_STYLESHEET
						.replace(/ACTIVE/g, this.ACTIVE)
						.replace(/DROP_INDICATOR/g, this.DROP_INDICATOR)
						.replace(/MEMBER/g, this.MEMBER)
						.replace(/MENU_ITEM/g, this.MENU_ITEM)
						.replace(/MIN_OPACITY/g, this.MIN_OPACITY)
						.replace(/TOOLBAR_ITEM/g, this.TOOLBAR_ITEM);
		this._styleSheet = this.document.createProcessingInstruction('xml-stylesheet',
			'type="text/css" href="data:text/css,'+encodeURIComponent(styles)+'"');
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
					tooltip={bundle.getString('ui.split.long')}
					class={ToolbarItem.BASIC_ITEM_CLASS + ' ' + this.TOOLBAR_ITEM}
					oncommand="FoxSplitter.ui.onCommand(event);">
					<menupopup id="foxsplitter-general-button-popup"
						onpopupshowing="FoxSplitter.ui.onPopupShowing(event);">
						<menuitem id="foxsplitter-general-menubutton-split-top"
							class={iconicClass+'split-top'}
							label={bundle.getString('ui.split.top.long')}
							accesskey={bundle.getString('ui.split.top.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-split-right"
							class={iconicClass+'split-right'}
							label={bundle.getString('ui.split.right.long')}
							accesskey={bundle.getString('ui.split.right.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-split-bottom"
							class={iconicClass+'split-bottom'}
							label={bundle.getString('ui.split.bottom.long')}
							accesskey={bundle.getString('ui.split.bottom.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-split-left"
							class={iconicClass+'split-left'}
							label={bundle.getString('ui.split.left.long')}
							accesskey={bundle.getString('ui.split.left.accesskey')}/>
						<menuseparator/>
						<menuitem id="foxsplitter-general-menubutton-tile-grid"
							class={iconicClass+'tile-grid tabs'}
							label={bundle.getString('ui.grid.long')}
							accesskey={bundle.getString('ui.grid.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-tile-x"
							class={iconicClass+'tile-x tabs'}
							label={bundle.getString('ui.x.long')}
							accesskey={bundle.getString('ui.x.accesskey')}/>
						<menuitem id="foxsplitter-general-menubutton-tile-y"
							class={iconicClass+'tile-y tabs'}
							label={bundle.getString('ui.y.long')}
							accesskey={bundle.getString('ui.y.accesskey')}/>
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
					tooltip={bundle.getString('ui.syncScroll.long')}
					class={ToolbarItem.BASIC_ITEM_CLASS + ' ' + this.TOOLBAR_ITEM}
					oncommand="FoxSplitter.ui.onCommand(event);"/>
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


	onCommand : function FSUI_onCommand(aEvent)
	{
		var owner = this.owner;
		var b = this.browser;
		var tabs = owner.selectedTabs;
		var selected = tabs.length;
		if (!tabs.length) {
			tabs.push(b.selectedTab);
		}

		switch (aEvent.target.id)
		{
			case 'foxsplitter-general-menubutton-split-top':
				return owner.splitTabsTo(tabs, this.POSITION_TOP);
			case 'foxsplitter-general-button':
			case 'foxsplitter-general-menubutton-split-right':
				return owner.splitTabsTo(tabs, this.POSITION_RIGHT);
			case 'foxsplitter-general-menubutton-split-bottom':
				return owner.splitTabsTo(tabs, this.POSITION_BOTTOM);
			case 'foxsplitter-general-menubutton-split-left':
				return owner.splitTabsTo(tabs, this.POSITION_LEFT);

			case 'foxsplitter-general-menubutton-tile-grid':
				return selected ?
						owner.tileSelectedTabs(this.TILE_MODE_GRID) :
						owner.tileAllTabs(this.TILE_MODE_GRID) ;
			case 'foxsplitter-general-menubutton-tile-x':
				return selected ?
						owner.tileSelectedTabs(this.TILE_MODE_X_AXIS) :
						owner.tileAllTabs(this.TILE_MODE_X_AXIS) ;
			case 'foxsplitter-general-menubutton-tile-y':
				return selected ?
						owner.tileSelectedTabs(this.TILE_MODE_Y_AXIS) :
						owner.tileAllTabs(this.TILE_MODE_Y_AXIS) ;

			case 'foxsplitter-general-menubutton-gather':
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


	updateChromeHidden : function FSUI_updateChromeHidden(aForceRestore)
	{
		var hiddenItems = [];
		if (this.hiddenUIInInactiveWindow & this.HIDE_MENUBAR)
			hiddenItems.push('menubar');
		if (this.hiddenUIInInactiveWindow & this.HIDE_TOOLBAR)
			hiddenItems.push('toolbar');
		if (this.hiddenUIInInactiveWindow & this.HIDE_BOOKMARKS)
			hiddenItems.push('directories');
		if (this.hiddenUIInInactiveWindow & this.HIDE_STATUS)
			hiddenItems.push('status');
		if (this.hiddenUIInInactiveWindow & this.HIDE_EXTRA)
			hiddenItems.push('extrachrome');
//		'location',
		hiddenItems = hiddenItems.join(' ');

		if (this._originalChromeHidden === undefined)
			this._originalChromeHidden = this.documentElement.getAttribute('chromehidden');

		if (this.owner.active || !this.owner.parent)
			this.documentElement.setAttribute('chromehidden', this._originalChromeHidden);
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


	// called by the parent group
	clearGroupedAppearance : function FSUI_clearGroupedAppearance(aForce)
	{
		if (!this._window)
			return;

		this.updateChromeHidden();

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
			if (prefName in FoxSplitterUI)
				FoxSplitterUI[prefName] = prefs.getPref(aData);
		}
	};

prefs.addPrefListener(prefListener);

function shutdown()
{
	prefs.removePrefListener(prefListener);
	prefs = undefined;
	FoxSplitterConst = undefined;
}
