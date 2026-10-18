module.exports = {
  start: function(rain) {
    var findProps = rain.metro.findByProps;
    var MsgActions = findProps('deleteMessage', 'editMessage');
    var CtxMenu = findProps('showContextMenu').showContextMenu;
    
    if (MsgActions) {
      MsgActions.silentDelete = async function(chId, msgId) {
        var txt = '...';
        try {
          var setting = rain.settings.get('replaceText');
          if (setting) txt = setting;
        } catch(e) {}
        
        try {
          await MsgActions.editMessage(chId, msgId, { content: txt });
          setTimeout(function() {
            MsgActions.deleteMessage(chId, msgId);
          }, 500);
        } catch (e) {
          MsgActions.deleteMessage(chId, msgId);
        }
      };
    }

    if (CtxMenu) {
      rain.patcher.before(CtxMenu, 'default', function(args) {
        var menu = args[0];
        if (menu && menu.items) {
          var idx = menu.items.findIndex(function(item) { return item.label === 'Delete Message'; });
          if (idx !== -1) {
            menu.items.splice(idx, 0, {
              label: 'Silent Delete',
              icon: 'Trash',
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
