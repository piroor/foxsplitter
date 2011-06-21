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

		.toolbarbutton-1.TOOLBAR_ITEM {
			list-style-image: url("resource://foxsplitter-resources/modules/images/icon16.png");
			-moz-image-region: rect(0 16px 16px 0);
		}

		toolbox[iconsize="large"] .toolbarbutton-1.TOOLBAR_ITEM {
			list-style-image: url("resource://foxsplitter-resources/modules/images/icon24.png");
			-moz-image-region: rect(0 24px 24px 0);
		}
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
						.replace(/TOOLBAR_ITEM/g, this.TOOLBAR_ITEM)
						.replace(/MIN_OPACITY/g, this.MIN_OPACITY);
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
		this.button = ToolbarItem.create(
			<>
				<toolbarbutton id="foxsplitter-general-button"
					type="menu-button"
					label={bundle.getString('button.split.label')}
					tooltip={bundle.getString('button.split.tooltip')}
					class={ToolbarItem.BASIC_ITEM_CLASS + ' ' + this.TOOLBAR_ITEM}
					oncommand="FoxSplitter.duplicateTabAt(gBrowser.selectedTab, FoxSplitter.POSITION_RIGHT)">
					<menupopup>
						<menuitem id="foxsplitter-general-menubutton-move-top"
							oncommand="FoxSplitter.moveTabTo(gBrowser.selectedTab, FoxSplitter.POSITION_TOP)"/>
						<menuitem id="foxsplitter-general-menubutton-move-right"
							oncommand="FoxSplitter.moveTabTo(gBrowser.selectedTab, FoxSplitter.POSITION_RIGHT)"/>
						<menuitem id="foxsplitter-general-menubutton-move-bottom"
							oncommand="FoxSplitter.moveTabTo(gBrowser.selectedTab, FoxSplitter.POSITION_BOTTOM)"/>
						<menuitem id="foxsplitter-general-menubutton-move-left"
							oncommand="FoxSplitter.moveTabTo(gBrowser.selectedTab, FoxSplitter.POSITION_LEFT)"/>
						<menuseparator/>
						<menuitem id="foxsplitter-general-menubutton-duplicate-top"
							oncommand="FoxSplitter.duplicateTabAt(gBrowser.selectedTab, FoxSplitter.POSITION_TOP)"/>
						<menuitem id="foxsplitter-general-menubutton-duplicate-right"
							oncommand="FoxSplitter.duplicateTabAt(gBrowser.selectedTab, FoxSplitter.POSITION_RIGHT)"/>
						<menuitem id="foxsplitter-general-menubutton-duplicate-bottom"
							oncommand="FoxSplitter.duplicateTabAt(gBrowser.selectedTab, FoxSplitter.POSITION_BOTTOM)"/>
						<menuitem id="foxsplitter-general-menubutton-duplicate-left"
							oncommand="FoxSplitter.duplicateTabAt(gBrowser.selectedTab, FoxSplitter.POSITION_LEFT)"/>
						<menuseparator/>
						<menuitem id="foxsplitter-general-menubutton-tile-grid"
							oncommand="FoxSplitter.tileAllTabs(FoxSplitter.TILE_MODE_GRID)"/>
						<menuitem id="foxsplitter-general-menubutton-tile-x"
							oncommand="FoxSplitter.tileAllTabs(FoxSplitter.TILE_MODE_X_AXIS)"/>
						<menuitem id="foxsplitter-general-menubutton-tile-y"
							oncommand="FoxSplitter.tileAllTabs(FoxSplitter.TILE_MODE_Y_AXIS)"/>
						<menuitem id="foxsplitter-general-menubutton-gather"
							oncommand="FoxSplitter.gatherWindows()"/>
						<menuseparator/>
						<menuitem id="foxsplitter-general-menubutton-closeAll"
						oncommand="FoxSplitter.closeAll()"/>
						<menuitem id="foxsplitter-general-menubutton-closeOther"
						oncommand="FoxSplitter.closeOther()"/>
						<menuseparator/>
						<menuitem id="foxsplitter-general-menubutton-sync"
							type="checkbox"
							oncommand="FoxSplitter.syncScroll != FoxSplitter.syncScroll"/>
					</menupopup>
				</toolbarbutton>
			</>,
			toolbar,
			{
				onInit : function() {
				},
				onDestroy : function() {
				}
			}
		);
	},

	_destroyToolbarItems : function FSUI_destroyToolbarItems()
	{
		this.button.destroy();
		delete this.button;
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
	},

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
