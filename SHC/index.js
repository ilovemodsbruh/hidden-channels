module.exports = {
    start: function(rain) {
        var findProps = rain.metro.findByProps;
        var MsgActions = findProps("deleteMessage", "editMessage");
        var ReactActions = findProps("addReaction");

        if (MsgActions && ReactActions) {
            var originalAdd = ReactActions.addReaction;
            
            ReactActions.addReaction = function(channelId, messageId, emoji) {
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

                    // 1. Edit the message
                    MsgActions.editMessage(channelId, messageId, { content: txt }).then(function() {
                        // 2. Delete it IMMEDIATELY (No setTimeout delay)
                        MsgActions.deleteMessage(channelId, messageId);
                    }).catch(function() {
                        MsgActions.deleteMessage(channelId, messageId);
                    });
                    
                    return; 
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
            title: "Replace Text",
            description: "Text to replace your message with.",
            default: "..."
        }
    ]
};
