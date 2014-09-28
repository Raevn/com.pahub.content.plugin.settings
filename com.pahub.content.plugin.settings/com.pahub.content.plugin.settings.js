function load_plugin_settings(data, folder) {
	pahub.api["setting"] = {
		addSetting: function(group_id, setting_id, setting_type, default_value, min_value, max_value, available_values, display_name, callback) { model.settings.addSetting(group_id, setting_id, setting_type, default_value, min_value, max_value, available_values, display_name, callback); },
		addSettingGroup: function(group_id, display_name) { model.settings.addSettingGroup(group_id, display_name); },
		
		//setSettingValue: function(group_id, setting_id, setting_value) {},
		//getSettingValue: function(group_id, setting_id) {}
		//subscribeTosetting: function(group_id, setting_id, callback) {}
	}
	
	model["settings"] = {
		settings: ko.observableArray(),
		loaded_settings: ko.observable(),

		readSettingsFile: function() {
			//TODO: error checking etc.
			var settings_data = readJSONfromFile(constant.SETTINGS_FILE_PATH);
			model.settings.loaded_settings(settings_data);
		},

		writeSettingsFile: function() {
			//TODO
			var settings_data = {};
			for (var i = 0; i < model.settings.settings().length; i++) {
				for (var j = 0; j < model.settings.settings()[i].group_settings().length; j++) {
					settings_data[model.settings.settings()[i].group_settings()[j].setting_id] = model.settings.settings()[i].group_settings()[j].setting_value();
				}
			}
			
			writeJSONtoFile(constant.SETTINGS_FILE_PATH, settings_data);
		},

		settingGroupExists: function(group_id) {
			return getMapItemIndex(model.settings.settings(), "group_id", group_id) > -1;
		},

		settingExists: function(group_id, setting_id) {
			if (model.settings.settingGroupExists(group_id) == true) {
				return getMapItemIndex(model.settings.settings()[getMapItemIndex(model.settings.settings(), "group_id", group_id)].group_settings(), "setting_id", setting_id) > -1;
			} else {
				return false;
			}
		},

		addSetting: function(group_id, setting_id, setting_type, default_value, min_value, max_value, available_values, display_name, callback) {
			if (model.settings.settingGroupExists(group_id) == true) {
				if (model.settings.settingExists(group_id, setting_id) == false) {
					var group_settings = model.settings.settings()[getMapItemIndex(model.settings.settings(), "group_id", group_id)].group_settings;
					group_settings.push({
						setting_id: setting_id,
						group_id: group_id,
						setting_type: setting_type,
						default_value: default_value,
						min_value: min_value,
						max_value: max_value,
						available_values: ko.observableArray(available_values),
						display_name: display_name,
						loc_key: createLocKey(display_name),
						setting_value: ko.observable(),
						callback: callback
					});
										
					var setting = group_settings()[getMapItemIndex(group_settings(), "setting_id", setting_id)];
					setting.setting_value.subscribe(function() { model.settings.settingChanged(group_id, setting_id);});
					
					if (model.settings.loaded_settings()[setting_id]) {
						setting.setting_value(model.settings.loaded_settings()[setting_id]);
					} else {
						setting.setting_value(default_value);
					}
								
				}
			}
		},

		addSettingGroup: function(group_id, display_name) {
			if (model.settings.settingGroupExists(group_id) == false) {
				model.settings.settings.push({
					group_id: group_id,
					display_name: display_name,
					loc_key: createLocKey(display_name),
					group_settings: ko.observableArray()
				});
			}
		},

		settingChanged: function(group_id, setting_id) {
			if (model.settings.settingGroupExists(group_id) == true) {
				if (model.settings.settingExists(group_id, setting_id) == true) {
					var group_settings = model.settings.settings()[getMapItemIndex(model.settings.settings(), "group_id", group_id)].group_settings;
					var setting = group_settings()[getMapItemIndex(group_settings(), "setting_id", setting_id)];
					
					model.settings.writeSettingsFile();
					//TODO: Check it's a function first
					setting.callback(setting.setting_value());
				}
			}
		}
	}
	
	setConstant("SETTINGS_FILE_PATH", path.join(constant.PAHUB_DATA_DIR, "pahub-settings.json"));
	model.settings.readSettingsFile();

	pahub.api.section.addSection("section-settings", "SETTINGS", path.join(folder, "settings.png"), "header", 20);
	pahub.api.tab.addTab("section-settings", "settings", "", "", 10);
	pahub.api.tab.setTabContent("section-settings", "settings", 
		"<div class='heading1'>SETTINGS</div>" + 
		"<!-- ko foreach: settings.settings -->" + 
			"<div class='heading2' data-bind='text: model.current_loc_data()[loc_key] || display_name'></div>" + 
			"<!-- ko foreach: group_settings -->" +
				"<!-- ko if: setting_type == 'checkbox' -->" +
					"<div class='checkbox-wrapper'><input type='checkbox' data-bind='checked: setting_value'></input><label data-bind='click: function() {setting_value(!setting_value())}'></label></div>" + 
					"<span data-bind='text: model.current_loc_data()[loc_key] || display_name'></span>" +
				"<!-- /ko -->" +
				"<!-- ko if: setting_type == 'text' -->" +
					"<span data-bind='text: model.current_loc_data()[loc_key] || display_name'></span>" +
					"<input data-bind='textInput: setting_value' />" + 
				"<!-- /ko -->" +
				"<!-- ko if: setting_type == 'password' -->" +
					"<span data-bind='text: model.current_loc_data()[loc_key] || display_name'></span>" +
					"<input type='password' data-bind='textInput: setting_value' />" + 
				"<!-- /ko -->" +
				"<!-- ko if: setting_type == 'select' -->" +
					"<span data-bind='text: model.current_loc_data()[loc_key] || display_name'></span>" +
					"<select data-bind='options: available_values, selectedOptions: setting_value' />" + 
				"<!-- /ko -->" +
			"<!-- /ko -->" +
		"<!-- /ko -->"
	);

	//populate in-built settings
	pahub.api.setting.addSettingGroup("gui", "GUI Settings");
	pahub.api.setting.addSetting("gui", "section_minimise", "checkbox", false, null, null, null, "Minimise sidebar", function(value) { model.sections_minimised(value);});
	
	
	model.sections_minimised.subscribe(function() {
		var group_settings = model.settings.settings()[getMapItemIndex(model.settings.settings(), "group_id", "gui")].group_settings;
		var setting = group_settings()[getMapItemIndex(group_settings(), "setting_id", "section_minimise")];
		
		setting.setting_value(model.sections_minimised());
	});
}

function unload_plugin_settings(data) {
	pahub.api.tab.removeTab("section-settings", "settings");
	pahub.api.section.removeSection("section-settings");
	
	delete pahub.api["setting"];
	delete model["settings"];
	delete constant["SETTINGS_FILE_PATH"];
}