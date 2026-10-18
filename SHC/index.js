const rainRuntime = globalThis.rain;
if (!rainRuntime || !rainRuntime.api) {
  throw new Error("Discord plugin API unavailable");
}

const { metro, api } = rainRuntime;
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

let unpatches = [];
let PermissionStore = null;
let originalCan = null;
const VIEW_CHANNEL = 1024n;

function isHidden(channel) {
  if (!channel) return false;
  if (typeof channel.isDM === "function" && (channel.isDM() || channel.isGroupDM?.() || channel.isMultiUserDM?.())) {
    return false;
  }
  if (!PermissionStore || !originalCan) return false;
  try {
    if (originalCan.call(PermissionStore, VIEW_CHANNEL, channel) === false) return true;
  } catch {}
  try {
    if (originalCan.call(PermissionStore, 1024, channel) === false) return true;
  } catch {}
  return false;
}

function onStart() {
  PermissionStore = findByStoreName("PermissionStore");

  if (PermissionStore && typeof PermissionStore.can === "function") {
    // save the real function BEFORE patching so isHidden() can still see true permissions
    originalCan = PermissionStore.can;

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

  // Try to add lock icon
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

  // DIAGNOSTIC: toggle the plugin on, then go to the ORDER server within 8 seconds.
  // Remove this block once we have the result.
  setTimeout(() => {
    try {
      const CS = findByStoreName("ChannelStore");
      const SG = findByStoreName("SelectedGuildStore");
      const gid = SG?.getGuildId?.();
      const a = CS?.getMutableGuildChannelsForGuild
        ? Object.keys(CS.getMutableGuildChannelsForGuild(gid) || {}).length
        : "nofn";
      const b = CS?.getGuildChannels
        ? Object.keys(CS.getGuildChannels(gid) || {}).length
        : "nofn";
      ui.toasts.showToast(`gid=${gid} | mutable=${a} | guild=${b}`);
    } catch (e) {
      ui.toasts.showToast("diag failed: " + e.message);
    }
  }, 8000);
}

function onStop() {
  for (const unpatch of unpatches) {
    try { unpatch(); } catch {}
  }
  unpatches = [];
  originalCan = null;
  ui.toasts.showToast("Show Hidden Channels disabled");
}

module.exports = {
  start() {
    onStart();
  },
  stop() {
    onStop();
  }
};
