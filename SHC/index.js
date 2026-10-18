module.exports = {
    start(rain) {
        const { findByProps } = rain.metro;
        const MessageActions = findByProps('deleteMessage', 'editMessage');
        const { showContextMenu } = findByProps('showContextMenu');

        if (MessageActions) {
            MessageActions.silentDelete = async (channelId, messageId) => {
                try {
                    // Get the text from your settings
                    let customText = '...';
                    if (rain.settings && rain.settings.get) {
                        customText = rain.settings.get('silent-delete', 'replaceText') || '...';
                    }
                    
                    // Edit message to your custom text
                    await MessageActions.editMessage(channelId, messageId, { content: customText });
                    
                    // Wait 500ms, then delete
                    setTimeout(() => {
                        MessageActions.deleteMessage(channelId, messageId);
                    }, 500);
                } catch (e) {
                    // If edit fails, delete normally
                    MessageActions.deleteMessage(channelId, messageId);
                }
            };
        }

        if (showContextMenu && rain.patcher) {
            rain.patcher.before(showContextMenu, 'default', (args) => {
                const menu = args[0];
                if (menu && menu.items) {
                    const deleteIndex = menu.items.findIndex(i => i.label === 'Delete Message');
                    if (deleteIndex !== -1) {
                        menu.items.splice(deleteIndex, 0, {
                            label: 'Silent Delete',
                            icon: 'Trash',
                            action: () => {
                                MessageActions.silentDelete(menu.message.channelId, menu.message.id);
                            }
                        });
                    }
                }
            });
        }
    },
    stop() {
        // Cleanup
    },
    settings: [
        {
            type: "string",
            id: "replaceText",
            title: "Silent Delete Text",
            description: "Text that replaces your message before deletion.",
            default: "..."
        }
    ]
};
