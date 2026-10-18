module.exports = {
    // Must be an array (using square brackets)
    settings: [
        {
            type: "string",
            id: "replaceText",
            title: "Silent Delete Text",
            description: "The text that replaces your message before it gets deleted.",
            default: "..."
        }
    ],
    onLoad: () => {
        const { findByProps } = rain.metro;
        
        const MessageActions = findByProps('deleteMessage', 'editMessage');
        const { showContextMenu } = findByProps('showContextMenu');

        if (MessageActions) {
            MessageActions.silentDelete = async (channelId, messageId) => {
                try {
                    // Read the text from the settings array
                    const customText = this.settings.get('replaceText') || '...';
                    
                    // 1. Edit message to your custom text
                    await MessageActions.editMessage(channelId, messageId, { content: customText });
                    
                    // 2. Wait 500ms, then delete
                    setTimeout(async () => {
                        await MessageActions.deleteMessage(channelId, messageId);
                    }, 500);
                } catch (e) {
                    // If edit fails, just delete
                    MessageActions.deleteMessage(channelId, messageId);
                }
            };
        }

        if (showContextMenu) {
            const unpatch = rain.patcher.before(showContextMenu, 'default', (args) => {
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
            module.exports.onUnload = unpatch;
        }
    },
    onUnload: () => {}
};
