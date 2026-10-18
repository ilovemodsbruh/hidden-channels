function start(rain) {
  const { metro, api } = rain;
  const { patcher, ui, storage } = api;
  const { findByStoreName, findByName, findByProps } = metro;
  const { React, ReactNative: RN } = metro.common;

  const store = storage.createPluginStore("show-hidden-channels", {
    enabled: true,
    showLock: true,
    lockEmoji: "🔒"
  });

  const settings = new Proxy({}, {
    get(_, key) {
      return store.useStore.getState()[key];
    },
    set(_, key, value) {
      store.useStore.getState().updateSettings({ [key]: value });
      return true;
    }
  });

  const unpatches = [];
  let PermissionStore = null;
  const VIEW_CHANNEL = 1024n;

  function isHidden(channel) {
    if (!channel) return false;
    if (typeof channel.isDM === "function" && (channel.isDM() || channel.isGroupDM?.() || channel.isMultiUserDM?.())) {
      return false;
    }
    if (!PermissionStore) return false;
    try {
      if (PermissionStore.can(VIEW_CHANNEL, channel) === false) return true;
      if (PermissionStore.can(1024, channel) === false) return true;
      return false;
    } catch {
      return false;
    }
  }

  PermissionStore = findByStoreName("PermissionStore");

  if (PermissionStore && typeof PermissionStore.can === "function") {
    unpatches.push(
      patcher.instead("can", PermissionStore, function (args, orig) {
        const [perm] = args;
        if (perm === 1024 || perm === 1024n || perm === VIEW_CHANNEL) {
          return true;
        }
        return orig.apply(this, args);
      })
    );
  }

  // Try adding lock icon
  try {
    const modules = [
      findByName("ChannelName", false),
      findByName("ChannelListItem", false),
      findByName("GuildChannelListItem", false),
      findByProps("ChannelName")
    ].filter(Boolean);

    for (const mod of modules) {
      for (const key of Object.keys(mod)) {
        if (typeof mod[key] === "function" && /render|name|title|label/i.test(key)) {
          unpatches.push(
            patcher.after(key, mod, (args, res) => {
              try {
                const channel = args[0]?.channel || args[0]?.record || args[0];
                if (!channel || !settings.showLock || !isHidden(channel)) return res;

                if (typeof res === "string") {
                  return (settings.lockEmoji || "🔒") + " " + res;
                }

                if (React.isValidElement(res)) {
                  return React.createElement(
                    RN.View,
                    { style: { flexDirection: "row", alignItems: "center" } },
                    React.createElement(RN.Text, { style: { marginRight: 4 } }, settings.lockEmoji || "🔒"),
                    res
                  );
                }
              } catch {}
              return res;
            })
          );
        }
      }
    }
  } catch (e) {
    console.warn("[ShowHiddenChannels]", e);
  }

  ui.toasts.showToast("Show Hidden Channels enabled");

  // Return cleanup function
  return function stop() {
    for (const unpatch of unpatches) {
      try { unpatch(); } catch {}
    }
  };
}
