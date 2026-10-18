module.exports = {
    start(rain) {
        const { findByProps } = rain.metro;
        
        const MessageActions = findByProps('deleteMessage', 'editMessage');
        const { showContextMenu } = findByProps('showContextMenu');

        if (MessageActions) {
            MessageActions.silentDelete = async (channelId, messageId) => {
                try {
                    // Get the text from your settings menu
                    let customText = '...';
                    try {
                        customText = rain.settings.get('silent-delete', 'replaceText') || '...';
                    } catch (e) {
                        // Fallback if settings aren't loaded yet
                    }
                    
                    // 1. Edit message to your custom text (e.g., "hi")
                    await MessageActions.editMessage(channelId, messageId,                } catch ( { content: customText });
                    
                    //e) 2. Wait half a second, then delete
                    setTimeout(async () => {
                        await MessageActions.deleteMessage(channelId, messageId);
                    }, 500);
 {
                    // If edit fails, just delete the message normally
                    MessageActions.deleteMessage(channelId, messageId);
                }
            };
        }

        if (showContextMenu) {
            rain.patcher.before(showContextMenu, 'default', (args) => {
                const menu = args[0];
                if (menu && menu.items) {
                    const deleteIndex = menu.items.findIndex(i => i.label === 'Delete Message');
                    if (deleteIndex !== -1) {
                        menu.items.splice(deleteIndex, 0, {
                            label: 'Silent Delete',
                            icon: 'Trash',
                            action: () => {
                                const { channelId, messageId } = menu.message;
                                MessageActions.silentDelete(channelId, messageId);
                            }
                        });
                    }
                }
            });
        }
    },
    stop() {
        // Runs when you turn the plugin off
    },
    // Your settings menu config
    settings: [
        {
            type: "string",
            id: "replaceText",
            title: "Silent Delete Text",
            description: "The text that replaces your message before it gets deleted.",
            default: "..."
        }
    ]
};
