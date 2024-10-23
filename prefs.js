const { GObject, Gtk, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

const SCHEMA_NAME = "org.gnome.shell.extensions.chat-gnomept";
var Settings = ExtensionUtils.getSettings(SCHEMA_NAME);

function init() {}

class Prefs extends GObject.Object {
    _init() {
        this.main = new Gtk.Grid({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 10,
            margin_end: 10,
            column_spacing: 10,
            row_spacing: 10,
            visible: true,
        });

        this.api_key = new Gtk.Entry({
            visible: true,
        });

        Settings.bind(
            "api-key",
            this.api_key,
            "text",
            Gio.SettingsBindFlags.DEFAULT
        );

        this.main.attach(new Gtk.Label({ label: "API Key" }), 0, 0, 1, 1);

        this.main.attach(this.api_key, 1, 0, 1, 1);
    }
}

const PrefsObj = new GObject.registerClass(Prefs);

function buildPrefsWidget() {
    let widget = new PrefsObj();
    return widget.main;
}
