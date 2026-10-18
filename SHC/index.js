module.exports = {
    start: function(rain) {
        var findProps = rain.metro.findByProps;
        var MsgActions = findProps("deleteMessage", "editMessage");
        
        if (MsgActions) {
            MsgActions.silentDelete = function(chId, msgId) {
                var txt = "...";
                try {
                    var setting = rain.settings.get("replaceText");
                    if (setting) txt = setting;
                } catch(e) {}
                
                MsgActions.editMessage(chId, msgId, { content: txt }).then(function() {
                    setTimeout(function() {
                        MsgActions.deleteMessage(chId, msgId);
                    }, 500);
                }).catch(function() {
                    MsgActions.deleteMessage(chId, msgId);
                });
            };
        }

        var menuModule = findProps("showContextMenu");
        var showContextMenu = menuModule ? (menuModule.showContextMenu || menuModule) : null;

        if (showContextMenu && rain.patcher) {
            rain.patcher.before(showContextMenu, "default", function(args) {
                var menu = args[0];
                if (menu && menu.items) {
                    var idx = menu.items.findIndex(function(item) { return item.label === "Delete Message"; });
                    if (idx !== -1) {
                        menu.items.splice(idx, 0, {
                            label: "Silent Delete",
                            icon: "Trash",
                            action: function() {
                                MsgActions.silentDelete(menu.message.channelId, menu.message.id);
                            }
                        });
                    }
                }
            });
        }
    },
    stop: function() {},
    settings: [
        {
            type: "string",
            id: "replaceText",
            title: "Silent Delete Text",
            description: "Text to replace message before delete.",
            default: "..."
        }
    ]
};
