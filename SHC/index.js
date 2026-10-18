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
                var context = args[1];
                
                // Check if this is a message menu
                if (menu && menu.items && (menu.message || (context && context.message))) {
                    var msg = menu.message || context.message;
                    
                    // Add the button to the list
                    menu.items.push({
                        label: "Silent Delete",
                        icon: "Trash",
                        action: function() {
                            MsgActions.silentDelete(msg.channelId || msg.channel_id, msg.id);
                        }
                    });
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
