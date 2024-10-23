const { St, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Soup = imports.gi.Soup;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Prefs = Me.imports.prefs;

let API_KEY;

var PopupExample = GObject.registerClass(
    class PopupExample extends PanelMenu.Button {
        _init() {
            // Correct way to call parent constructor
            super._init(0.0, "Chat GnomePT");

            // Create a button in the top bar
            let icon = new St.Icon({
                icon_name: "system-run-symbolic",
                style_class: "system-status-icon",
            });
            this.add_child(icon); // add_child is available without using 'this.actor'

            this.search = new St.Entry({
                name: "search",
                can_focus: true,
                track_hover: true,
                hint_text: "Prompt",
                style_class: "cgpt-search-entry",
            });

            this.search.clutter_text.connect("text-changed", (entry) => {
                // logconsole(entry.get_text());
            });

            this.sendButton = new St.Button({
                child: new St.Icon({
                    icon_name: "mail-send-symbolic",
                }),
                can_focus: true,
                style_class: "cgpt-send-button",
            });

            this.sendButton.connect("clicked", async () => {
                let prompt = this.search.get_text();
                await getData(prompt)
                    .then((response) => {
                        for (const [key, value] of Object.entries(response)) {
                            logconsole(`${key}: ${value}`);
                        }
                        let message = response.choices[0].message.content;

                        let resultItem = new PopupMenu.PopupBaseMenuItem({
                            reactive: false,
                            can_focus: false,
                            style_class: "cgpt-search-result-item",
                        });

                        let resultLabel = new St.Label({
                            text: message,
                            style_class: "cgpt-search-result-label",
                        });

                        resultItem.add(resultLabel);
                        this.menu.addMenuItem(resultItem);

                        logconsole(`Message: ${message}`);
                    })
                    .catch((error) => {
                        // logconsole("Error:", error);
                        for (const [key, value] of Object.entries(error)) {
                            logconsole(`Error: ${key}: ${value}`);
                        }
                    });
            });

            const entryItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
                style_class: "cgpt-search-entry-item",
            });

            entryItem.add(this.search);
            entryItem.add(this.sendButton);

            this.menu.addMenuItem(entryItem);

            this.menu.connect("open-state-changed", (self, open) => {
                if (open) {
                    this.search.set_text("");

                    GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                        this.search.grab_key_focus();
                        return GLib.SOURCE_REMOVE;
                    });
                }
            });

            const settingsMenuItem = new PopupMenu.PopupBaseMenuItem();
            settingsMenuItem.add_child(
              new St.Icon({
                icon_name: 'emblem-system-symbolic',
                style_class: 'cgpt-settings-icon',
              }),
            );
            settingsMenuItem.connect('activate', this._openSettings.bind(this));

            this.menu.addMenuItem(settingsMenuItem);
        }

        _openSettings() {
            ExtensionUtils.openPrefs();
            this.menu.close();
        }

        _fetchSettings() {
            API_KEY = Prefs.getString("api-key");
        }

        toggleMenu() {
            this.menu.toggle();
        }
    }
);

// Enable the extension
function init() {}

function enable() {
    let indicator = new PopupExample();
    Main.panel.addToStatusArea("chat-gnomept", indicator);

    // Custom keybind
    let settings = ExtensionUtils.getSettings(
        "org.gnome.shell.extensions.chat-gnomept"
    );
    Main.wm.addKeybinding(
        "open-search-test",
        settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        () => {
            indicator.toggleMenu();
        }
    );
}

function disable() {
    // Remove the extension
    Main.panel.statusArea["chat-gnomept"].destroy();

    // Remove the keybind
    Main.wm.removeKeybinding("open-search-test");
}

async function getData(prompt) {
    const url = "https://api.openai.com/v1/chat/completions";
    logconsole(`URL: ${url}`);

    return new Promise((resolve, reject) => {
        let session = new Soup.Session();
        let message = Soup.Message.new("POST", url);

        message.request_headers.append("Content-Type", "application/json");
        message.request_headers.append("Authorization", `Bearer ${API_KEY}`);

        // Prepare the request body
        let body = JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        logconsole(`Request body: ${body}`);

        message.set_request("application/json", Soup.MemoryUse.COPY, body);

        logconsole("Sending request...");

        session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null,
            (session, result) => {
                try {
                    let bytes = session.send_and_read_finish(result);
                    let decoder = new TextDecoder("utf-8");
                    let text = decoder.decode(bytes.get_data());
                    logconsole(`Raw response: ${text}`);

                    try {
                        let jsonResponse = JSON.parse(text);
                        logconsole(
                            `Parsed response: ${JSON.stringify(
                                jsonResponse,
                                null,
                                2
                            )}`
                        );
                        resolve(jsonResponse);
                    } catch (parseError) {
                        logconsole(`Error parsing JSON: ${parseError}`);
                        reject(parseError);
                    }
                } catch (error) {
                    log(`Error in request: ${error}`);
                    reject(error);
                }
            }
        );
    });
}

function logconsole(message) {
    log("[EXTENSION_LOG]", message);
}
