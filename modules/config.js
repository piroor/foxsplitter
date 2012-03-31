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
			<preference id="shouldDuplicateOnSplit"
				name={domain+'shouldDuplicateOnSplit'}
				type="bool"/>
			<preference id="generalButton.split.position"
				name={domain+'generalButton.split.position'}
				type="int"/>
			<preference id="appMenu.split.position"
				name={domain+'appMenu.split.position'}
				type="int"/>
			<preference id="importTabsFromClosedSibling"
				name={domain+'importTabsFromClosedSibling'}
				type="int"/>
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
			<preference id="acceptDropDelay"
				name={domain+'acceptDropDelay'}
				type="int"/>
			<preference id="handleDragWithShiftKey"
				name={domain+'handleDragWithShiftKey'}
				type="bool"/>
			<preference id="draggableAppButton"
				name={domain+'draggableAppButton'}
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
		<hbox align="center">
			<label value={bundle.getString('dropZoneSize.before')}
				control="dropZoneSize-textbox"/>
			<textbox id="dropZoneSize-textbox"
				preference="dropZoneSize"
				type="number"
				size="3"
				min="0"
				increment="1"/>
			<label value={bundle.getString('dropZoneSize.after')}
				control="dropZoneSize-textbox"/>
		</hbox>
		<hbox align="center">
			<label value={bundle.getString('acceptDropDelay.before')}
				control="acceptDropDelay-textbox"/>
			<textbox id="acceptDropDelay-textbox"
				preference="acceptDropDelay"
				type="number"
				size="3"
				min="0"
				increment="1"/>
			<label value={bundle.getString('acceptDropDelay.after')}
				control="acceptDropDelay-textbox"/>
		</hbox>
		<checkbox label={bundle.getString('handleDragWithShiftKey')}
			preference="handleDragWithShiftKey"/>
		<checkbox label={bundle.getString('draggableAppButton')}
			preference="draggableAppButton"/>
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
					<checkbox label={bundle.getString('hiddenUIInInactiveWindow.extra-toolbars')}
						value={FoxSplitterConst.HIDE_EXTRA_TOOLBARS}/>
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
			<preference id="selection.splitToTop"
				name={domain+'selection.splitToTop'}
				type="bool"/>
			<preference id="selection.splitToRight"
				name={domain+'selection.splitToRight'}
				type="bool"/>
			<preference id="selection.splitToBottom"
				name={domain+'selection.splitToBottom'}
				type="bool"/>
			<preference id="selection.splitToLeft"
				name={domain+'selection.splitToLeft'}
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
				<checkbox label={bundle.getString('ui.split.right.short')}
					preference="selection.splitToRight"/>
				<checkbox label={bundle.getString('ui.split.left.short')}
					preference="selection.splitToLeft"/>
				<checkbox label={bundle.getString('ui.split.top.short')}
					preference="selection.splitToTop"/>
				<checkbox label={bundle.getString('ui.split.bottom.short')}
					preference="selection.splitToBottom"/>
			</hbox>
			<hbox>
				<checkbox label={bundle.getString('ui.layout.grid.selection')}
					preference="selection.grid"/>
				<checkbox label={bundle.getString('ui.layout.x.selection')}
					preference="selection.x"/>
				<checkbox label={bundle.getString('ui.layout.y.selection')}
					preference="selection.y"/>
			</hbox>
		</groupbox>
	</prefpane>

	<prefpane id="prefpane-shortcut"
		label={bundle.getString('tab.shortcut')}>
		<preferences>
			<preference id="shortcut.splitTabToTop"
				name={domain+'shortcut.splitTabToTop'}
				type="string"/>
			<preference id="shortcut.splitTabToRight"
				name={domain+'shortcut.splitTabToRight'}
				type="string"/>
			<preference id="shortcut.splitTabToBottom"
				name={domain+'shortcut.splitTabToBottom'}
				type="string"/>
			<preference id="shortcut.splitTabToLeft"
				name={domain+'shortcut.splitTabToLeft'}
				type="string"/>
			<preference id="shortcut.layoutGrid"
				name={domain+'shortcut.layoutGrid'}
				type="string"/>
			<preference id="shortcut.layoutX"
				name={domain+'shortcut.layoutX'}
				type="string"/>
			<preference id="shortcut.layoutY"
				name={domain+'shortcut.layoutY'}
				type="string"/>
			<preference id="shortcut.gather"
				name={domain+'shortcut.gather'}
				type="string"/>
		</preferences>
		<grid>
			<columns>
				<column/>
				<column/>
				<column/>
				<column/>
			</columns>
			<rows>
				<row align="center">
					<label value={bundle.getString('ui.split.right.long')}
						control="shortcut.splitTabToRight-textbox"/>
					<textbox id="shortcut.splitTabToRight-textbox"
						preference="shortcut.splitTabToRight"
						onkeydown="updateShortcut(event)"
						size="12"/>
					<button label={bundle.getString('shortcut.clear')}
						oncommand="clearPref(this.previousSibling);"
						style="min-width:0"/>
					<button label={bundle.getString('shortcut.reset')}
						oncommand="resetPref(this.previousSibling.previousSibling);"
						style="min-width:0"/>
				</row>
				<row align="center">
					<label value={bundle.getString('ui.split.left.long')}
						control="shortcut.splitTabToLeft-textbox"/>
					<textbox id="shortcut.splitTabToLeft-textbox"
						preference="shortcut.splitTabToLeft"
						onkeydown="updateShortcut(event)"
						size="12"/>
					<button label={bundle.getString('shortcut.clear')}
						oncommand="clearPref(this.previousSibling);"
						style="min-width:0"/>
					<button label={bundle.getString('shortcut.reset')}
						oncommand="resetPref(this.previousSibling.previousSibling);"
						style="min-width:0"/>
				</row>
				<row align="center">
					<label value={bundle.getString('ui.split.top.long')}
						control="shortcut.splitTabToTop-textbox"/>
					<textbox id="shortcut.splitTabToTop-textbox"
						preference="shortcut.splitTabToTop"
						onkeydown="updateShortcut(event)"
						size="12"/>
					<button label={bundle.getString('shortcut.clear')}
						oncommand="clearPref(this.previousSibling);"
						style="min-width:0"/>
					<button label={bundle.getString('shortcut.reset')}
						oncommand="resetPref(this.previousSibling.previousSibling);"
						style="min-width:0"/>
				</row>
				<row align="center">
					<label value={bundle.getString('ui.split.bottom.long')}
						control="shortcut.splitTabToBottom-textbox"/>
					<textbox id="shortcut.splitTabToBottom-textbox"
						preference="shortcut.splitTabToBottom"
						onkeydown="updateShortcut(event)"
						size="12"/>
					<button label={bundle.getString('shortcut.clear')}
						oncommand="clearPref(this.previousSibling);"
						style="min-width:0"/>
					<button label={bundle.getString('shortcut.reset')}
						oncommand="resetPref(this.previousSibling.previousSibling);"
						style="min-width:0"/>
				</row>
				<row align="center">
					<label value={bundle.getString('ui.layout.grid.long')}
						control="shortcut.layoutGrid-textbox"/>
					<textbox id="shortcut.layoutGrid-textbox"
						preference="shortcut.layoutGrid"
						onkeydown="updateShortcut(event)"
						size="12"/>
					<button label={bundle.getString('shortcut.clear')}
						oncommand="clearPref(this.previousSibling);"
						style="min-width:0"/>
					<button label={bundle.getString('shortcut.reset')}
						oncommand="resetPref(this.previousSibling.previousSibling);"
						style="min-width:0"/>
				</row>
				<row align="center">
					<label value={bundle.getString('ui.layout.x.long')}
						control="shortcut.layoutX-textbox"/>
					<textbox id="shortcut.layoutX-textbox"
						preference="shortcut.layoutX"
						onkeydown="updateShortcut(event)"
						size="12"/>
					<button label={bundle.getString('shortcut.clear')}
						oncommand="clearPref(this.previousSibling);"
						style="min-width:0"/>
					<button label={bundle.getString('shortcut.reset')}
						oncommand="resetPref(this.previousSibling.previousSibling);"
						style="min-width:0"/>
				</row>
				<row align="center">
					<label value={bundle.getString('ui.layout.y.long')}
						control="shortcut.layoutY-textbox"/>
					<textbox id="shortcut.layoutY-textbox"
						preference="shortcut.layoutY"
						onkeydown="updateShortcut(event)"
						size="12"/>
					<button label={bundle.getString('shortcut.clear')}
						oncommand="clearPref(this.previousSibling);"
						style="min-width:0"/>
					<button label={bundle.getString('shortcut.reset')}
						oncommand="resetPref(this.previousSibling.previousSibling);"
						style="min-width:0"/>
				</row>
				<row align="center">
					<label value={bundle.getString('ui.gather.long')}
						control="shortcut.gather-textbox"/>
					<textbox id="shortcut.gather-textbox"
						preference="shortcut.gather"
						onkeydown="updateShortcut(event)"
						size="12"/>
					<button label={bundle.getString('shortcut.clear')}
						oncommand="clearPref(this.previousSibling);"
						style="min-width:0"/>
					<button label={bundle.getString('shortcut.reset')}
						oncommand="resetPref(this.previousSibling.previousSibling);"
						style="min-width:0"/>
				</row>
			</rows>
		</grid>
	</prefpane>

	<prefpane id="prefpane-advanced"
		label={bundle.getString('tab.advanced')}
		flex="1">
		<preferences>
			<preference id="syncScrollX"
				name={domain+'syncScrollX'}
				type="bool"/>
			<preference id="shouldScrollToSplitPosition"
				name={domain+'shouldScrollToSplitPosition'}
				type="bool"/>
			<preference id="shouldKeepSizeRatioOnResize"
				name={domain+'shouldKeepSizeRatioOnResize'}
				type="bool"/>
			<preference id="platformOffset.needToBeUpdated"
				name={domain+'platformOffset.needToBeUpdated'}
				type="bool"
				instantApply="true"/>
			<preference id="platformOffset.x"
				name={domain+'platformOffset.x'}
				type="int"
				instantApply="true"/>
			<preference id="platformOffset.y"
				name={domain+'platformOffset.y'}
				type="int"
				instantApply="true"/>
			<preference id="platformOffset.width"
				name={domain+'platformOffset.width'}
				type="int"
				instantApply="true"/>
			<preference id="platformOffset.height"
				name={domain+'platformOffset.height'}
				type="int"
				instantApply="true"/>
		</preferences>
		<checkbox label={bundle.getString('syncScrollX')}
			preference="syncScrollX"/>
		<checkbox label={bundle.getString('shouldScrollToSplitPosition')}
			preference="shouldScrollToSplitPosition"/>
		<checkbox label={bundle.getString('shouldKeepSizeRatioOnResize')}
			preference="shouldKeepSizeRatioOnResize"/>
		<groupbox orient="vertical">
			<caption label={bundle.getString('platformOffset.needToBeUpdated')}/>
			<hbox style="max-width:40em">
				<description flex="1">{bundle.getString('platformOffset.description')}</description>
			</hbox>
			<hbox align="center">
				<spacer flex="1"/>
				<button label={bundle.getString('platformOffset.forceUpdate')}
					oncommand="document.getElementById('platformOffset.needToBeUpdated').value=true;"/>
				<spacer flex="1"/>
			</hbox>
			<hbox align="center">
				<label value={bundle.getString('platformOffset.x')}
					control="platformOffset.x-textbox"/>
				<textbox id="platformOffset.x-textbox"
					preference="platformOffset.x"
					type="number"
					increment="1"
					size="5"/>
				<label value={bundle.getString('platformOffset.y')}
					control="platformOffset.y-textbox"/>
				<textbox id="platformOffset.y-textbox"
					preference="platformOffset.y"
					type="number"
					increment="1"
					size="5"/>
				<label value={bundle.getString('platformOffset.width')}
					control="platformOffset.width-textbox"/>
				<textbox id="platformOffset.width-textbox"
					preference="platformOffset.width"
					type="number"
					increment="1"
					size="5"/>
				<label value={bundle.getString('platformOffset.height')}
					control="platformOffset.height-textbox"/>
				<textbox id="platformOffset.height-textbox"
					preference="platformOffset.height"
					type="number"
					increment="1"
					size="5"/>
			</hbox>
		</groupbox>
	</prefpane>
</prefwindow>

</>,
(function() {
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
	function updateShortcut(aEvent) {
		var field = aEvent.target;
		var shortcut = KeyboardShortcut.toKeyboardShortcut(aEvent);
		if (shortcut) {
			field.value = shortcut;
			document.getElementById(field.getAttribute('preference')).value = shortcut;
			aEvent.stopPropagation()
			aEvent.preventDefault();
		}
	}
	function clearPref(aField) {
		document.getElementById(aField.getAttribute('preference')).value = '';
		aField.value = '';
	}
	function resetPref(aField) {
		var pref = document.getElementById(aField.getAttribute('preference'));
		pref.value = pref.defaultValue;
		aField.value = pref.defaultValue;
	}

	var Cc = Components.classes;
	var Ci = Components.interfaces;
	Components.classes['@mozilla.org/moz/jssubscript-loader;1']
		.getService(Components.interfaces.mozIJSSubScriptLoader)
		.loadSubScript('resource://foxsplitter-resources/modules/lib/KeyboardShortcut.js', window);
}).toSource().replace(/^\(?function\s*\(\)\s*\{|\}\)?$/g, '')
);
