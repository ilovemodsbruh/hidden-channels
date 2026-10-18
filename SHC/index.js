module.exports = {
    start: function(rain) {
        var findProps = rain.metro.findByProps;
        var MsgActions = findProps("deleteMessage", "editMessage");
        var ActionSheet = findProps("showActionSheetWithOptions");
        
        // 1. Rename the "Delete Message" button in the menu
        if (ActionSheet) {
            rain.patcher.before(ActionSheet, "showActionSheetWithOptions", function(args) {
                var options = args[0];
                if (options && options.options) {
                    var deleteIndex = options.options.findIndex(function(o) { 
                        return o === "Delete Message" || o === "Delete"; 
                    });
                    if (deleteIndex !== -1) {
                        options.options[deleteIndex] = "Silent Delete";
                    }
                }
            });
        }
        
        // 2. Intercept the delete action to edit the message first
        if (MsgActions) {
            var originalDelete = MsgActions.deleteMessage;
            MsgActions.deleteMessage = function(chId, msgId) {
                var txt = "...";
                try {
                    var setting = rain.settings.get("replaceText");
                    if (setting) txt = setting;
                } catch(e) {}
                
                MsgActions.editMessage(chId, msgId, { content: txt }).then(function() {
                    setTimeout(function() {
                        originalDelete(chId, msgId);
                    }, 500);
                }).catch(function() {
                    originalDelete(chId, msgId);
                });
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
