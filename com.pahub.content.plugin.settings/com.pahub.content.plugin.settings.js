function load_plugin_settings(data, folder) {
	pahub.api["setting"] = {
		addSetting: function(group_id, setting_id, observable_value, setting_type, control_type, default_value, display_name, callback, params) { model.settings.addSetting(group_id, setting_id, observable_value, setting_type, control_type, default_value, /*min_value, max_value, available_values, */ display_name, callback, params); },
		addSettingGroup: function(group_id, display_name) { model.settings.addSettingGroup(group_id, display_name); },
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
			var settings_data = {};
			for (var i = 0; i < model.settings.settings().length; i++) {
				for (var j = 0; j < model.settings.settings()[i].group_settings().length; j++) {
					if (ko.isObservable(model.settings.settings()[i].group_settings()[j].setting_value) == true) {
						settings_data[model.settings.settings()[i].group_settings()[j].setting_id] = model.settings.settings()[i].group_settings()[j].setting_value();
					}
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
		addSetting: function(group_id, setting_id, observable_value, setting_type, control_type, default_value, display_name, callback, params) {
			if (model.settings.settingGroupExists(group_id) == true) {
				if (model.settings.settingExists(group_id, setting_id) == false) {
					if (ko.isObservable(observable_value) == true || observable_value == null) {
						pahub.api.log.addLogMessage("verb", "Adding setting: " + setting_id + " (group: " + group_id + ")");
						
						var group_settings = model.settings.settings()[getMapItemIndex(model.settings.settings(), "group_id", group_id)].group_settings;
						group_settings.push({
							setting_id: setting_id,
							group_id: group_id,
							setting_type: setting_type,
							control_type: control_type,
							default_value: default_value,
							min_value: params["min_value"],
							max_value: params["max_value"],
							available_values: params["observable_available_values"],
							display_name: display_name,
							loc_key: createLocKey(display_name),
							setting_value: observable_value,
							callback: callback
						});
										
						var setting = group_settings()[getMapItemIndex(group_settings(), "setting_id", setting_id)];
					
						if (ko.isObservable(observable_value) == true) {
							setting.setting_value.subscribe(function() { 
								model.settings.settingChanged(group_id, setting_id);}
							);
							if (model.settings.loaded_settings().hasOwnProperty(setting_id) == true) {
								setting.setting_value(model.settings.loaded_settings()[setting_id]);
							} else {
								if (model.settings.settingValueIsValid(setting_id, default_value) == true) {
									setting.setting_value(default_value);
								}
							}
						}
					} else {
						pahub.api.log.addLogMessage("error", "Failed to add setting '" + setting_id + "': Invalid observable_value");
					}
				} else {
					pahub.api.log.addLogMessage("warm", "Failed to add setting '" + setting_id + "': Setting already exists");
				}
			} else {
				pahub.api.log.addLogMessage("error", "Failed to add setting '" + setting_id + "': Group '" + group_id + "' does not exist");
			}
		},

		addSettingGroup: function(group_id, display_name) {
			if (model.settings.settingGroupExists(group_id) == false) {
				pahub.api.log.addLogMessage("verb", "Adding setting group: '" + group_id + "'");
				model.settings.settings.push({
					group_id: group_id,
					display_name: display_name,
					loc_key: createLocKey(display_name),
					group_settings: ko.observableArray()
				});
			} else {
				pahub.api.log.addLogMessage("warm", "Failed to add setting group '" + group_id + "': Setting group already exists");
			}
		},

		settingChanged: function(group_id, setting_id) {
			if (model.settings.settingGroupExists(group_id) == true) {
				if (model.settings.settingExists(group_id, setting_id) == true) {
					var group_settings = model.settings.settings()[getMapItemIndex(model.settings.settings(), "group_id", group_id)].group_settings;
					var setting = group_settings()[getMapItemIndex(group_settings(), "setting_id", setting_id)];
					
					model.settings.writeSettingsFile();
					if (typeof setting.callback == "function") {
						setting.callback(setting.setting_value());
					}
				}
			}
		},
		
		settingValueIsValid: function(setting_id, value) {
			return true;
		}
	}
	
	setConstant("SETTINGS_FILE_PATH", path.join(constant.PAHUB_DATA_DIR, "pahub-settings.json"));
	model.settings.readSettingsFile();
	
	//populate in-built settings
	pahub.api.setting.addSettingGroup("gui", "GUI Settings");
	pahub.api.setting.addSetting("gui", "pahub.section_minimise", model.sections_minimised, "boolean", "checkbox", false, "Minimise sidebar", null, {});
	pahub.api.setting.addSetting("gui", "pahub.stream", model.stream, "list", "select", process.platform == "linux" ? "LINUX" : "STABLE", "Stream", null, {observable_available_values: model.streams});
	pahub.api.setting.addSetting("gui", "pahub.active_section_id", model.active_section_id, "text", null, "section-community", "active_section_id", null, {});
	pahub.api.setting.addSetting("gui", "pahub.active_tab_id", model.active_tab_id, "text", null, "news", "active_tab_id", null, {});
	pahub.api.setting.addSettingGroup("cache", "Cache Settings");
	pahub.api.setting.addSetting("cache", "pahub.clear_cache", null, null, "button", null, "Clear Cache", function() {
		//TODO: Move this to pahub as a clearCache function
		deleteFolderRecursive(constant.PAHUB_CACHE_DIR);
		alert("PA Hub will now restart to clear the cache");
		restart();
	}, {});
	
	pahub.api.section.addSection("section-settings", "", path.join(folder, "settings.png"), "header", 30);
	pahub.api.tab.addTab("section-settings", "settings", "", "", 10);
	pahub.api.tab.setTabContent("section-settings", "settings", 
		"<div class='heading1'>SETTINGS</div>" + 
		"<!-- ko foreach: settings.settings -->" + 
			"<!-- ko if: $index() > 0 -->" +
				"<br/>" +
			"<!-- /ko -->" +
			"<!-- ko if: $data.display_name != '' -->" +
				"<div class='heading2' data-bind='text: model.current_loc_data()[loc_key] || display_name'></div>" + 
			"<!-- /ko -->" +
			"<!-- ko foreach: group_settings -->" +
				"<!-- ko if: control_type == 'checkbox' -->" +
					"<div class='checkbox-wrapper'><input type='checkbox' data-bind='checked: setting_value'></input><label data-bind='click: function() {setting_value(!setting_value())}'></label></div>" + 
					"<span data-bind='text: (model.current_loc_data()[loc_key] || display_name)'></span>" +
					"<br/>" +
				"<!-- /ko -->" +
				"<!-- ko if: control_type == 'text' -->" +
					"<span data-bind='text: (model.current_loc_data()[loc_key] || display_name) + \": \"'></span>" +
					"<input data-bind='textInput: setting_value' />" + 
					"<br/>" +
				"<!-- /ko -->" +
				"<!-- ko if: control_type == 'password' -->" +
					"<span data-bind='text: (model.current_loc_data()[loc_key] || display_name) + \": \"'></span>" +
					"<input type='password' data-bind='textInput: setting_value' />" + 
					"<br/>" +
				"<!-- /ko -->" +
				"<!-- ko if: control_type == 'select' -->" +
					"<span data-bind='text: (model.current_loc_data()[loc_key] || display_name) + \": \"'></span>" +
					"<select data-bind='options: available_values, selectedOptions: setting_value' />" + 
					"<br/>" +
				"<!-- /ko -->" +
				"<!-- ko if: control_type == 'button' -->" +
					"<div class='text-button' data-bind='click: function() { if (callback) { $data.callback(); } }, text: (model.current_loc_data()[loc_key] || display_name)'></div>" + 
					"<br/>" +
				"<!-- /ko -->" +
			"<!-- /ko -->" +
		"<!-- /ko -->"
	);

}

function unload_plugin_settings(data) {
	pahub.api.tab.removeTab("section-settings", "settings");
	pahub.api.section.removeSection("section-settings");
	
	delete pahub.api["setting"];
	delete model["settings"];
	delete unsetConstant("SETTINGS_FILE_PATH");
}