module.exports = {
    onLoad: () => {
        const { findByProps } = rain.metro;
        
        // Find Discord's message actions and context menu
        const MessageActions = findByProps('deleteMessage', 'editMessage');
        const { showContextMenu } = findByProps('showContextMenu');

        if (MessageActions) {
            // Create the silent delete function
            MessageActions.silentDelete = async (channelId, messageId) => {
                try {
                    // Edit to "..."
                    await MessageActions.editMessage(channelId, messageId, { content: '...' });
                    
                    // Wait half a second, then delete
                    setTimeout(async () => {
                        await MessageActions.deleteMessage(channelId, messageId);
                    }, 500);
                } catch (e) {
                    // If edit fails, just delete normally
                    MessageActions.deleteMessage(channelId, messageId);
                }
            };
        }

        // Patch the context menu to add the "Silent Delete" button
        if (showContextMenu) {
            const unpatch = rain.patcher.before(showContextMenu, 'default', (args) => {
                const menu = args[0];
                
                // Only add to message menus
                if (menu && menu.items) {
                    // Find the "Delete Message" button to put ours right next to it
                    const deleteIndex = menu.items.findIndex(i => i.label === 'Delete Message');
                    
                    if (deleteIndex !== -1) {
                        menu.items.splice(deleteIndex, 0, {
                            label: 'Silent Delete',
                            icon: 'Trash', // Uses Discord's built-in trash icon
                            action: () => {
                                const { channelId, messageId } = menu.message;
                                MessageActions.silentDelete(channelId, messageId);
                            }
                        });
                    }
                }
            });
            // Save to unload later
            module.exports.onUnload = unpatch;
        }
    },
    onUnload: () => {}
};
