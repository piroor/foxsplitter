var config = require('lib/config');
var bundle = require('lib/locale')
				.get(resolve('locale/label.properties'));

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

var script = (function() {
		var hiddenUIInInactiveWindow;
		var updateHiddenUIInInactiveWindowGroupbox;
		function initHiddenUIInInactiveWindowChecks() {
			hiddenUIInInactiveWindow = document.getElementById('hiddenUIInInactiveWindow');
			updateHiddenUIInInactiveWindowGroupbox = document.getElementById('updateHiddenUIInInactiveWindow-groupbox');
			var prefValue = parseInt(hiddenUIInInactiveWindow.value);
			Array.forEach(updateHiddenUIInInactiveWindowGroupbox.querySelectorAll('checkbox[value]'), function(aCheckbox) {
				var value = parseInt(aCheckbox.getAttribute('value'));
				aCheckbox.checked = !(prefValue & value);
			});
		}
		function onChangeHiddenUIInInactiveWindow() {
			var pref = hiddenUIInInactiveWindow;
			var prefValue = parseInt(pref.value);
			Array.forEach(updateHiddenUIInInactiveWindowGroupbox.querySelectorAll('checkbox[value]'), function(aCheckbox) {
				var value = parseInt(aCheckbox.getAttribute('value'));
				if (prefValue & value) prefValue ^= value;
				if (!aCheckbox.checked)
					prefValue |= value;
			});
			pref.value = prefValue;
		}
	}).toSource().replace(/^\(?function\s*\(\)\s*\{|\}\)?$/g, '');

config.register('about:blank?foxsplitter-config', <>

<prefwindow id="foxsplitter-config"
	xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
	title={bundle.getString('title')}>

	<prefpane id="prefpane-general"
		label={bundle.getString('tab.general')}>
		<preferences>
			<preference id="shouldDuplicateOnSplit"
				name={domain+'shouldDuplicateOnSplit'}
				type="bool"/>
			<preference id="generalButton.split.position"
				name={domain+'generalButton.split.position'}
				type="bool"/>
			<preference id="appMenu.split.position"
				name={domain+'appMenu.split.position'}
				type="bool"/>
			<preference id="importTabsFromClosedSibling"
				name={domain+'importTabsFromClosedSibling'}
				type="int"/>
			<preference id="syncScrollX"
				name={domain+'syncScrollX'}
				type="bool"/>
		</preferences>

		<groupbox>
			<caption label={bundle.getString('shouldDuplicateOnSplit')}/>
			<radiogroup orient="vertical"
				preference="shouldDuplicateOnSplit">
				<radio value="false" label={bundle.getString('shouldDuplicateOnSplit.false')}/>
				<radio value="true" label={bundle.getString('shouldDuplicateOnSplit.true')}/>
			</radiogroup>
		</groupbox>
		<groupbox>
			<caption label={bundle.getString('generalButton.split.position')}/>
			<radiogroup orient="horizontal"
				preference="generalButton.split.position">
				<radio value={FoxSplitterConst.POSITION_TOP}
					label={bundle.getString('ui.split.top.short')}/>
				<radio value={FoxSplitterConst.POSITION_BOTTOM}
					label={bundle.getString('ui.split.bottom.short')}/>
				<radio value={FoxSplitterConst.POSITION_RIGHT}
					label={bundle.getString('ui.split.right.short')}/>
				<radio value={FoxSplitterConst.POSITION_LEFT}
					label={bundle.getString('ui.split.left.short')}/>
			</radiogroup>
		</groupbox>
		<groupbox>
			<caption label={bundle.getString('appMenu.split.position')}/>
			<radiogroup orient="horizontal"
				preference="appMenu.split.position">
				<radio value={FoxSplitterConst.POSITION_TOP}
					label={bundle.getString('ui.split.top.short')}/>
				<radio value={FoxSplitterConst.POSITION_BOTTOM}
					label={bundle.getString('ui.split.bottom.short')}/>
				<radio value={FoxSplitterConst.POSITION_RIGHT}
					label={bundle.getString('ui.split.right.short')}/>
				<radio value={FoxSplitterConst.POSITION_LEFT}
					label={bundle.getString('ui.split.left.short')}/>
			</radiogroup>
		</groupbox>
		<groupbox>
			<caption label={bundle.getString('importTabsFromClosedSibling')}/>
			<radiogroup orient="vertical"
				preference="importTabsFromClosedSibling">
				<radio value={FoxSplitterConst.IMPORT_NOTHING}
					label={bundle.getString('importTabsFromClosedSibling.nothing')}/>
				<radio value={FoxSplitterConst.IMPORT_ONLY_HIDDEN}
					label={bundle.getString('importTabsFromClosedSibling.hidden')}/>
				<radio value={FoxSplitterConst.IMPORT_ALL}
					label={bundle.getString('importTabsFromClosedSibling.all')}/>
			</radiogroup>
		</groupbox>
		<checkbox label={bundle.getString('syncScrollX')}
			preference="syncScrollX"/>
	</prefpane>

	<prefpane id="prefpane-drag"
		label={bundle.getString('tab.drag')}>
		<preferences>
			<preference id="shouldDuplicateOnDrop"
				name={domain+'shouldDuplicateOnDrop'}
				type="bool"/>
			<preference id="dropZoneSize"
				name={domain+'dropZoneSize'}
				type="int"/>
			<preference id="handleDragWithShiftKey"
				name={domain+'handleDragWithShiftKey'}
				type="bool"/>
		</preferences>
		<groupbox>
			<caption label={bundle.getString('shouldDuplicateOnDrop')}/>
			<radiogroup orient="vertical"
				preference="shouldDuplicateOnDrop">
				<radio value="false" label={bundle.getString('shouldDuplicateOnDrop.false')}/>
				<radio value="true" label={bundle.getString('shouldDuplicateOnDrop.true')}/>
			</radiogroup>
		</groupbox>
		<label value={bundle.getString('dropZoneSize.before')}
			control="dropZoneSize-textbox"/>
		<hbox align="center">
			<spacer style="width:2em;"/>
			<textbox id="dropZoneSize-textbox"
				preference="dropZoneSize"
				type="number"
				size="3"
				min="0"
				increment="1"/>
			<label value={bundle.getString('dropZoneSize.after')}
				control="dropZoneSize-textbox"/>
		</hbox>
		<groupbox>
			<caption label={bundle.getString('handleDragWithShiftKey')}/>
			<radiogroup orient="vertical"
				preference="handleDragWithShiftKey">
				<radio value="false" label={bundle.getString('handleDragWithShiftKey.false')}/>
				<radio value="true" label={bundle.getString('handleDragWithShiftKey.true')}/>
			</radiogroup>
		</groupbox>
	</prefpane>

	<prefpane id="prefpane-appearance"
		label={bundle.getString('tab.appearance')}
		onpaneload="initHiddenUIInInactiveWindowChecks();">
		<preferences>
			<preference id="shouldMinimalizeUI"
				name={domain+'shouldMinimalizeUI'}
				type="bool"/>
			<preference id="shouldAutoHideTabs"
				name={domain+'shouldAutoHideTabs'}
				type="bool"/>
			<preference id="hiddenUIInInactiveWindow"
				name={domain+'hiddenUIInInactiveWindow'}
				type="int"/>
		</preferences>

		<checkbox label={bundle.getString('shouldMinimalizeUI')}
			preference="shouldMinimalizeUI"/>
		<checkbox label={bundle.getString('shouldAutoHideTabs')}
			id="shouldAutoHideTabs-checkbox"
			preference="shouldAutoHideTabs"/>
		<hbox>
			<spacer style="width:2em;"/>
			<label value={bundle.getString('shouldAutoHideTabs.note')}
				control="shouldAutoHideTabs-checkbox"/>
		</hbox>
		<groupbox id="updateHiddenUIInInactiveWindow-groupbox"
			orient="vertical"
			oncommand="onChangeHiddenUIInInactiveWindow()">
			<caption label={bundle.getString('hiddenUIInInactiveWindow')}/>
			<description value={bundle.getString('hiddenUIInInactiveWindow.note')}/>
			<hbox>
				<vbox>
					<checkbox label={bundle.getString('hiddenUIInInactiveWindow.menubar')}
						value={FoxSplitterConst.HIDE_MENUBAR}/>
					<checkbox label={bundle.getString('hiddenUIInInactiveWindow.toolbar')}
						value={FoxSplitterConst.HIDE_TOOLBAR}/>
					<checkbox label={bundle.getString('hiddenUIInInactiveWindow.location')}
						value={FoxSplitterConst.HIDE_LOCATION}/>
					<checkbox label={bundle.getString('hiddenUIInInactiveWindow.non-navigation')}
						value={FoxSplitterConst.HIDE_NON_NAVIGATION_ITEMS}/>
				</vbox>
				<vbox>
					<checkbox label={bundle.getString('hiddenUIInInactiveWindow.bookmarks')}
						value={FoxSplitterConst.HIDE_BOOKMARKS}/>
					<checkbox label={bundle.getString('hiddenUIInInactiveWindow.status')}
						value={FoxSplitterConst.HIDE_STATUS}/>
					<checkbox label={bundle.getString('hiddenUIInInactiveWindow.extra')}
						value={FoxSplitterConst.HIDE_EXTRA}/>
				</vbox>
			</hbox>
		</groupbox>
	</prefpane>

	<prefpane id="prefpane-menu"
		label={bundle.getString('tab.menu')}>
		<preferences>
			<preference id="appMenu.split"
				name={domain+'appMenu.split'}
				type="bool"/>
			<preference id="viewMenu.split"
				name={domain+'viewMenu.split'}
				type="bool"/>
			<preference id="context.splitFromLink"
				name={domain+'context.splitFromLink'}
				type="bool"/>
			<preference id="context.splitFromFrame"
				name={domain+'context.splitFromFrame'}
				type="bool"/>
			<preference id="context.splitFromTab.move"
				name={domain+'context.splitFromTab.move'}
				type="bool"/>
			<preference id="context.splitFromTab.duplicate"
				name={domain+'context.splitFromTab.duplicate'}
				type="bool"/>
			<preference id="context.gatherWindows"
				name={domain+'context.gatherWindows'}
				type="bool"/>
			<preference id="selection.grid"
				name={domain+'selection.grid'}
				type="bool"/>
			<preference id="selection.x"
				name={domain+'selection.x'}
				type="bool"/>
			<preference id="selection.y"
				name={domain+'selection.y'}
				type="bool"/>
		</preferences>

		<checkbox label={bundle.getFormattedString('appMenu.split', [bundle.getString('ui.split.app.label')])}
			preference="appMenu.split"/>
		<checkbox label={bundle.getFormattedString('viewMenu.split', [bundle.getString('ui.split.view.label')])}
			preference="viewMenu.split"/>
		<checkbox label={bundle.getFormattedString('context.splitFromLink', [bundle.getString('ui.split.link.label')])}
			preference="context.splitFromLink"/>
		<checkbox label={bundle.getFormattedString('context.splitFromFrame', [bundle.getString('ui.split.frame.label')])}
			preference="context.splitFromFrame"/>
		<groupbox orient="horizontal">
			<caption label={bundle.getString('tabContextMenu')}/>
			<vbox>
				<checkbox label={bundle.getString('ui.split.tab.move.label')}
					preference="context.splitFromTab.move"/>
				<checkbox label={bundle.getString('ui.split.tab.duplicate.label')}
					preference="context.splitFromTab.duplicate"/>
			</vbox>
			<vbox>
				<checkbox label={bundle.getString('ui.gather.long')}
					preference="context.gatherWindows"/>
			</vbox>
		</groupbox>
		<groupbox orient="vertical">
			<caption label={bundle.getString('tabSelectionMenu')}/>
			<description value={bundle.getString('tabSelectionMenu.note')}/>
			<hbox>
				<vbox>
					<checkbox label={bundle.getString('ui.grid.selection')}
						preference="selection.grid"/>
					<checkbox label={bundle.getString('ui.x.selection')}
						preference="selection.x"/>
				</vbox>
				<vbox>
					<checkbox label={bundle.getString('ui.y.selection')}
						preference="selection.y"/>
				</vbox>
			</hbox>
		</groupbox>
	</prefpane>

	<!-- This must be created as an XHTML script element, not XUL one, because
	     XUL script elements are not evaluated when they are dynamically inserted. -->
	<script type="application/javascript"
		xmlns="http://www.w3.org/1999/xhtml">{script}</script>
</prefwindow>

</>);
