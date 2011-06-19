var config = require('lib/config');
var bundle = require('lib/locale')
				.get(resolve('locale/label.properties'));

config.register('about:blank?foxsplitter-config', <>

<prefwindow id="foxsplitter-config"
	xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
	title={bundle.getString('title')}>

	<prefpane id="prefpane-general" label={bundle.getString('config.general')}>
		<preferences>
			<preference id="testBoolean"
				name="extensions.restartless@piro.sakura.ne.jp.testBoolean"
				type="bool"/>
		</preferences>


		<checkbox id="testBoolean-checkbox"
			label={bundle.getString('config.testBoolean')}
			preference="testBoolean"/>

	</prefpane>

	<prefpane id="prefpane-appearance" label={bundle.getString('config.appearance')}>
		<preferences>
			<preference id="testInteger"
				name="extensions.restartless@piro.sakura.ne.jp.testInteger"
				type="int"/>
		</preferences>


		<hbox align="center">
			<label id="testInteger-label"
				control="testInteger-textbox"
				value={bundle.getString('config.testInteger')}/>
			<textbox id="testInteger-textbox"
				type="number"
				preference="testInteger"/>
		</hbox>

	</prefpane>

</prefwindow>

</>);
