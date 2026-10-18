module.exports = {
    start: function(rain) {
        var findProps = rain.metro.findByProps;
        var MsgActions = findProps("deleteMessage", "editMessage");
        var ReactActions = findProps("addReaction");

        if (MsgActions && ReactActions) {
            // Hook into the reaction action
            var originalAdd = ReactActions.addReaction;
            
            ReactActions.addReaction = function(channelId, messageId, emoji) {
                // If you react with a trash can 🗑️
                var isTrash = false;
                if (emoji) {
                    if (typeof emoji === "string" && emoji.includes("🗑️")) isTrash = true;
                    if (emoji.name === "🗑️" || emoji.name === "wastebasket") isTrash = true;
                }

                if (isTrash) {
                    var txt = "...";
                    try {
                        var setting = rain.settings.get("replaceText");
                        if (setting) txt = setting;
                    } catch(e) {}

                    // Edit the message first
                    MsgActions.editMessage(channelId, messageId, { content: txt }).then(function() {
                        // Wait half a second, then delete
                        setTimeout(function() {
                            MsgActions.deleteMessage(channelId, messageId);
                        }, 500);
                    }).catch(function() {
                        MsgActions.deleteMessage(channelId, messageId);
                    });
                    
                    return; // Stop it from actually adding the trash can reaction
                }

                return originalAdd.apply(this, arguments);
            };
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
