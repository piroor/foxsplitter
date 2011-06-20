var config = require('lib/config');
var bundle = require('lib/locale')
				.get(resolve('locale/label.properties'));

load('base');

const base = 'extensions.foxsplitter@piro.sakura.ne.jp.';

config.register('about:blank?foxsplitter-config', <>

<prefwindow id="foxsplitter-config"
	xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
	title={bundle.getString('title')}>

	<prefpane id="prefpane-general"
		label={bundle.getString('tab.general')}>
		<preferences>
			<preference id="dropZoneSize"
				name={base+'dropZoneSize'}
				type="int"/>
			<preference id="handleDragWithShiftKey"
				name={base+'handleDragWithShiftKey'}
				type="bool"/>
			<preference id="importTabsFromClosedSibling"
				name={base+'importTabsFromClosedSibling'}
				type="int"/>
			<preference id="syncScrollX"
				name={base+'syncScrollX'}
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
				<radio value={FoxSplitterBase.prototype.IMPORT_NOTHING}
					label={bundle.getString('importTabsFromClosedSibling.nothing')}/>
				<radio value={FoxSplitterBase.prototype.IMPORT_ONLY_HIDDEN}
					label={bundle.getString('importTabsFromClosedSibling.hidden')}/>
				<radio value={FoxSplitterBase.prototype.IMPORT_ALL}
					label={bundle.getString('importTabsFromClosedSibling.all')}/>
			</radiogroup>
		</groupbox>
		<checkbox label={bundle.getString('syncScrollX')}
			preference="syncScrollX"/>
	</prefpane>

	<prefpane id="prefpane-appearance"
		label={bundle.getString('tab.appearance')}>
		<preferences>
			<preference id="shouldMinimalizeUI"
				name={base+'shouldMinimalizeUI'}
				type="bool"/>
			<preference id="shouldAutoHideTabs"
				name={base+'shouldAutoHideTabs'}
				type="bool"/>
		</preferences>

		<checkbox label={bundle.getString('shouldMinimalizeUI')}
			preference="shouldMinimalizeUI"/>
		<checkbox label={bundle.getString('shouldAutoHideTabs')}
			preference="shouldAutoHideTabs"/>
	</prefpane>

</prefwindow>

</>);
