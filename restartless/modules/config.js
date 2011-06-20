var config = require('lib/config');
var bundle = require('lib/locale')
				.get(resolve('locale/label.properties'));

var FoxSplitterConst = require('const');
var domain = FoxSplitterConst.domain;

config.register('about:blank?foxsplitter-config', <>

<prefwindow id="foxsplitter-config"
	xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
	title={bundle.getString('title')}>

	<prefpane id="prefpane-general"
		label={bundle.getString('tab.general')}>
		<preferences>
			<preference id="dropZoneSize"
				name={domain+'dropZoneSize'}
				type="int"/>
			<preference id="handleDragWithShiftKey"
				name={domain+'handleDragWithShiftKey'}
				type="bool"/>
			<preference id="importTabsFromClosedSibling"
				name={domain+'importTabsFromClosedSibling'}
				type="int"/>
			<preference id="syncScrollX"
				name={domain+'syncScrollX'}
				type="bool"/>
		</preferences>

		<hbox align="center">
			<label value={bundle.getString('dropZoneSize.before')}
				control="dropZoneSize-textbox"/>
			<textbox id="dropZoneSize-textbox"
				preference="dropZoneSize"
				type="number"
				size="4"
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

	<prefpane id="prefpane-appearance"
		label={bundle.getString('tab.appearance')}
		onpaneload="initHiddenUIInInactiveWindowChecks()">
		<preferences>
			<preference id="shouldMinimalizeUI"
				name={domain+'shouldMinimalizeUI'}
				type="bool"/>
			<preference id="shouldAutoHideTabs"
				name={domain+'shouldAutoHideTabs'}
				type="bool"/>
			<preference id="updateHiddenUIInInactiveWindow"
				name={domain+'updateHiddenUIInInactiveWindow'}
				type="int"/>
		</preferences>

		<checkbox label={bundle.getString('shouldMinimalizeUI')}
			preference="shouldMinimalizeUI"/>
		<checkbox label={bundle.getString('shouldAutoHideTabs')}
			preference="shouldAutoHideTabs"/>
		<groupbox id="updateHiddenUIInInactiveWindow-groupbox"
			orient="horizontal" oncommand="onChangeHiddenUIInInactiveWindow()">
			<caption label={bundle.getString('hiddenUIInInactiveWindow')}/>
			<vbox>
				<checkbox label={bundle.getString('hiddenUIInInactiveWindow.menubar')}
					value={FoxSplitterConst.HIDE_MENUBAR}/>
				<checkbox label={bundle.getString('hiddenUIInInactiveWindow.toolbar')}
					value={FoxSplitterConst.HIDE_TOOLBAR}/>
			</vbox>
			<vbox>
				<checkbox label={bundle.getString('hiddenUIInInactiveWindow.bookmarks')}
					value={FoxSplitterConst.HIDE_BOOKMARKS}/>
				<checkbox label={bundle.getString('hiddenUIInInactiveWindow.addonbar')}
					value={FoxSplitterConst.HIDE_ADDONBAR}/>
			</vbox>
		</groupbox>
	</prefpane>

	<script type="application/javascript"><![CDATA[
		var hiddenUIInInactiveWindow;
		var updateHiddenUIInInactiveWindowGroupbox;
		function initHiddenUIInInactiveWindowChecks() {
			hiddenUIInInactiveWindow = document.getElementById('hiddenUIInInactiveWindow');
			updateHiddenUIInInactiveWindowGroupbox = document.getElementById('updateHiddenUIInInactiveWindow-groupbox');
			var prefValue = parseInt(hiddenUIInInactiveWindow.value);
			Array.forEach(updateHiddenUIInInactiveWindowGroupbox.querySelectAll('checkbox[value]'), function(aCheckbox) {
				var value = parseInt(aCheckbox.getAttribute('value'));
				aCheckbox.checked = !!(prefValue & value);
			});
		}
		function onChangeHiddenUIInInactiveWindow() {
			var pref = hiddenUIInInactiveWindow;
			var prefValue = parseInt(pref.value);
			Array.forEach(updateHiddenUIInInactiveWindowGroupbox.querySelectAll('checkbox[value]'), function(aCheckbox) {
				var value = parseInt(aCheckbox.getAttribute('value'));
				if (prefValue & value) prefValue ^= value;
				if (aCheckbox.checked)
					prefValue |= value;
			});
			pref.value = prefValue;
		}
	]]></script>
</prefwindow>

</>);
