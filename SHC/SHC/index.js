const rainRuntime = globalThis.rain;
if (!rainRuntime || !rainRuntime.api || !rainRuntime.api.storage) {
  throw new Error("Discord plugin API unavailable");
}

const rainStore = rainRuntime.api.storage.createPluginStore("show-hidden-channels", {
  enabled: true,
  showLock: true,
  lockEmoji: "🔒",
  dimHidden: true
});

const updatePluginSettings = (patch) => rainStore.useStore.getState().updateSettings(patch);

const pluginSettings = new Proxy(Object.create(null), {
  get(_target, prop) {
    return Reflect.get(rainStore.useStore.getState(), prop);
  },
  set(_target, prop, value) {
    updatePluginSettings({ [prop]: value });
    return true;
  },
});

const implementation = (() => {
  "use strict";

  const { metro } = rainRuntime;
  const patcher = rainRuntime.api.patcher;
  const ui = rainRuntime.api.ui;
  const { findByStoreName, findByProps, findByName } = metro;
  const { FluxDispatcher, React, ReactNative: RN } = metro.common;

  const unpatches = [];
  let PermissionStore = null;
  let ChannelStore = null;

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

  function onStart() {
    PermissionStore = findByStoreName("PermissionStore");
    ChannelStore = findByStoreName("ChannelStore");

    if (!PermissionStore) {
      ui.toasts.showToast("Show Hidden Channels: PermissionStore not found");
      return;
    }

    // Force VIEW_CHANNEL to true so channels appear
    if (typeof PermissionStore.can === "function") {
      unpatches.push(
        patcher.instead("can", PermissionStore, function (args, orig) {
          const [perm, channel] = args;
          if (perm === 1024 || perm === 1024n || perm === VIEW_CHANNEL) {
            return true;
          }
          return orig.apply(this, args);
        })
      );
    }

    // Try to add lock icon next to channel name
    try {
      const ChannelNameModules = [
        findByName("ChannelName", false),
        findByProps("ChannelName"),
        findByProps("renderChannelName"),
        findByName("GuildChannelListItem", false),
        findByName("ChannelListItem", false),
      ].filter(Boolean);

      for (const mod of ChannelNameModules) {
        for (const key of Object.keys(mod)) {
          if (typeof mod[key] === "function" && /render|name|title|label/i.test(key)) {
            unpatches.push(
              patcher.after(key, mod, function (args, res) {
                try {
                  const channel = args[0]?.channel || args[0]?.record || args[0];
                  if (!channel || !pluginSettings.showLock || !isHidden(channel)) return res;

                  if (typeof res === "string") {
                    return (pluginSettings.lockEmoji || "🔒") + " " + res;
                  }

                  if (React.isValidElement(res) && res.props) {
                    const lock = pluginSettings.lockEmoji || "🔒";
                    const original = res.props.children;

                    return React.cloneElement(res, {
                      ...res.props,
                      children: [
                        React.createElement(RN.Text, { key: "lock", style: { marginRight: 4 } }, lock),
                        original
                      ]
                    });
                  }
                } catch {}
                return res;
              })
            );
          }
        }
      }
    } catch (e) {
      console.warn("[ShowHiddenChannels] name patch failed", e);
    }

    // Fallback for list item
    try {
      const listItem = findByName("ChannelListItem") || findByName("GuildChannelListItem");
      if (listItem && listItem.default) {
        unpatches.push(
          patcher.after("default", listItem, function (args, res) {
            try {
              const props = args[0] || {};
              const channel = props.channel || props.record;
              if (!channel || !pluginSettings.showLock || !isHidden(channel)) return res;

              if (React.isValidElement(res)) {
                const lock = pluginSettings.lockEmoji || "🔒";
                return React.createElement(
                  RN.View,
                  { style: { flexDirection: "row", alignItems: "center" } },
                  React.createElement(RN.Text, { style: { marginRight: 6, opacity: 0.9 } }, lock),
                  res
                );
              }
            } catch {}
            return res;
          })
        );
      }
    } catch {}

    try {
      FluxDispatcher.dispatch({ type: "CHANNEL_UPDATES", channels: [] });
    } catch {}

    ui.toasts.showToast("Show Hidden Channels + lock enabled");
  }

  function onStop() {
    for (const u of unpatches) {
      try { u(); } catch {}
    }
    unpatches.length = 0;
    ui.toasts.showToast("Show Hidden Channels disabled");
  }

  function Settings() {
    const s = pluginSettings;

    return React.createElement(
      RN.ScrollView,
      { style: { flex: 1, padding: 16 } },
      React.createElement(RN.Text, {
        style: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 }
      }, "Show Hidden Channels"),

      React.createElement(RN.Text, {
        style: { color: "#b5bac1", marginBottom: 20, lineHeight: 20 }
      }, "Shows channels you cannot access and puts a lock next to their name.\nYou still cannot read the messages inside them."),

      React.createElement(
        RN.TouchableOpacity,
        {
          onPress: () => { s.showLock = !s.showLock; },
          style: {
            backgroundColor: "#2b2d31",
            padding: 14,
            borderRadius: 8,
            marginBottom: 10,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center"
          }
        },
        React.createElement(RN.Text, { style: { color: "#fff" } }, "Show lock icon"),
        React.createElement(RN.Text, { style: { color: "#fff" } }, s.showLock ? "ON" : "OFF")
      ),

      React.createElement(RN.Text, {
        style: { color: "#b5bac1", marginTop: 8, marginBottom: 6 }
      }, "Lock emoji"),
      React.createElement(RN.TextInput, {
        value: s.lockEmoji || "🔒",
        onChangeText: (t) => { s.lockEmoji = t || "🔒"; },
        style: {
          backgroundColor: "#1e1f22",
          color: "#fff",
          padding: 12,
          borderRadius: 8,
          marginBottom: 20
        }
      }),

      React.createElement(RN.Text, {
        style: { color: "#72767d", fontSize: 13 }
      }, "Note: On some Discord versions the real channel name may already be replaced with \"No Access\" or \"___hidden___\". The lock will still appear.")
    );
  }

  return {
    onStart,
    onStop,
    settings: Settings
  };
})();
