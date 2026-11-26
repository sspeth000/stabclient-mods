# Stabclient Mods

Welcome to the **StabClient Mods** repository! This repository contains mods for the StabClient mod loader.

This guide explains how to create a mod, organize its files, write its manifest, add it to the catalog, use the mod lifecycle hook, test it, and publish updates.

> **Important:** Mods currently run as trusted, unsandboxed JavaScript in the StabClient page. A mod can access and modify the page DOM and use browser APIs available to page scripts. Only install and publish code that you wrote or have carefully reviewed.

---

## Table of contents

- [How the mod system works](#how-the-mod-system-works)
- [Quick start](#quick-start)
- [Repository layout](#repository-layout)
- [Creating a mod folder](#creating-a-mod-folder)
- [Writing manifest.json](#writing-manifestjson)
- [Writing main.js](#writing-mainjs)
- [Working with arbitrary files and formats](#working-with-arbitrary-files-and-formats)
- [The Mod object and Mod.close()](#the-mod-object-and-modclose)
- [Building a UI panel](#building-a-ui-panel)
- [Cleaning up event listeners and timers](#cleaning-up-event-listeners-and-timers)
- [Adding your mod to availablemods.json](#adding-your-mod-to-availablemodsjson)
- [Testing your mod](#testing-your-mod)
- [Updating and versioning](#updating-and-versioning)
- [Current loader behavior and limitations](#current-loader-behavior-and-limitations)
- [Troubleshooting](#troubleshooting)
- [Publishing checklist](#publishing-checklist)

---

## How the mod system works

The mod loader and the mods live in separate repositories:

- **Client / loader:** `sspeth000/stabclient`
- **Mod repository:** `sspeth000/stabclient-mods`

The loader reads `availablemods.json` from this repository. That catalog tells the client which mods are available and where their manifests are located.

When a user enables a mod, the loader:

1. Finds the mod in the catalog.
2. Downloads its `manifest.json`.
3. Checks the manifest version, mod ID, entry path, and permissions field.
4. Downloads the JavaScript file named by `entry`.
5. Executes that script in the main page JavaScript context.
6. Gives the script its own mod-specific `Mod` object.

The mod is responsible for creating and managing its own interface. There is no automatic panel, built-in panel template, or iframe.

### Important runtime facts

- Mods run in the page's main JavaScript context, not inside an iframe.
- Mods can use normal JavaScript and browser DOM APIs.
- Each mod receives a separate `Mod` object.
- The currently supported lifecycle hook is `Mod.close()`.
- The loader downloads and executes only the manifest's `entry` script.
- The manifest does not need a `resources` section.
- A mod can fetch and interpret its own additional files, regardless of extension, using normal browser APIs.
- Installed mods start disabled after a full page reload.
- Removing a mod saves the removal and refreshes the page.
- Disabling a mod calls its cleanup hook, but a refresh is still recommended to guarantee that any resources it failed to clean up are cleared.

---

## Quick start

The smallest useful mod consists of two files:

```text
mods/
  hello-mod/
    manifest.json
    main.js
```

### 1. Create `mods/hello-mod/manifest.json`

```json
{
  "manifestVersion": 1,
  "id": "hello-mod",
  "name": "Hello Mod",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A small example mod.",
  "entry": "main.js",
  "permissions": []
}
```

### 2. Create `mods/hello-mod/main.js`

```js
(function () {
  'use strict';

  const message = document.createElement('div');
  message.textContent = 'Hello from my first mod!';
  message.id = 'hello-mod-message';

  message.style.cssText = [
    'position:fixed',
    'top:80px',
    'right:16px',
    'z-index:99999',
    'padding:12px 16px',
    'border-radius:10px',
    'background:#172033',
    'color:white',
    'font:14px Arial,sans-serif'
  ].join(';');

  document.body.appendChild(message);

  let closed = false;

  Mod.close = function () {
    if (closed) return;
    closed = true;
    message.remove();
  };
})();
```

### 3. Add it to the catalog

Add an entry to the `mods` array in `availablemods.json`. See [Adding your mod to availablemods.json](#adding-your-mod-to-availablemodsjson).

### 4. Test it

Open StabClient, open the Mods tab, refresh the catalog, install the mod, and enable it. The message should appear on the page.

---

## Repository layout

A recommended repository layout looks like this:

```text
stabclient-mods/
│
├── availablemods.json
├── README.md
│
└── mods/
    ├── test-mod/
    │   ├── manifest.json
    │   └── main.js
    │
    └── hello-mod/
        ├── manifest.json
        ├── main.js
        ├── styles.css
        ├── helpers.js
        └── assets/
            └── icon.png
```

You can organize each mod's files however you like, as long as the manifest's `entry` points to the correct JavaScript file and the path is valid.

The loader fetches only the entry script. It does not scan the mod folder or automatically load helper scripts, stylesheets, HTML, or assets. The mod can fetch any additional files it needs, as shown in [Working with arbitrary files and formats](#working-with-arbitrary-files-and-formats).

---

## Creating a mod folder

Every mod needs its own folder inside `mods/`.

Use a short, lowercase, hyphen-separated folder name. For example:

- `hello-mod`
- `custom-hud`
- `menu-theme`

The folder name does not technically have to be identical to the mod ID, but matching them makes the repository easier to navigate.

Avoid spaces and unusual punctuation in folder names. Use relative paths in the manifest and catalog.

---

## Writing manifest.json

The manifest describes your mod and identifies the one JavaScript entry script the loader should execute. Additional files are fetched and handled by the mod itself.

### Complete example

```json
{
  "manifestVersion": 1,
  "id": "hello-mod",
  "name": "Hello Mod",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A short description of what this mod does.",
  "entry": "main.js",
  "permissions": []
}
```

### Manifest fields

| Field | Required | Description |
|---|---:|---|
| `manifestVersion` | Yes | Currently must be the number `1`. |
| `id` | Yes | Must exactly match the catalog entry's ID. |
| `name` | Descriptive | Human-readable mod name. |
| `version` | Descriptive | Version string shown in the catalog. |
| `author` | Descriptive | Mod author's name or handle. |
| `description` | Descriptive | Short explanation of the mod. |
| `entry` | Yes | Relative path to the JavaScript entry file. |

| `permissions` | Yes | Must be an array. Keep it empty; no permission system is currently implemented. |

The loader validates the manifest version, matching ID, entry path, and that `permissions` is an array. Keep all fields correctly typed and use valid JSON.

### Entry paths

The `entry` value is relative to the manifest file.

For example, if the manifest is at:

```text
mods/hello-mod/manifest.json
```

Then this entry:

```json
"entry": "main.js"
```

points to:

```text
mods/hello-mod/main.js
```

Use forward slashes in paths. Do not use absolute paths, parent-directory traversal such as `../`, or external URLs.

---

## Writing main.js

The entry file is ordinary JavaScript. The loader executes its source inside a function and passes the mod's own `Mod` object into that function.

A simple starting structure is:

```js
(function () {
  'use strict';

  // 1. Create the mod's UI or initialize its feature.
  // 2. Store references to anything that needs cleanup.
  // 3. Define Mod.close so the loader can shut down this mod.

  Mod.close = function () {
    // Clean up this mod.
  };
})();
```

The outer function is a useful organizational pattern. It keeps variables such as `panel`, `button`, and `closed` local to your mod's code.

### JavaScript and DOM access

Because mods execute in the main page context, they can use normal page APIs such as:

- `document.createElement()`
- `document.querySelector()`
- `document.getElementById()`
- `element.appendChild()`
- `element.remove()`
- `element.addEventListener()`
- `window.addEventListener()`
- `setTimeout()` and `setInterval()`

Use unique element IDs and class names prefixed with your mod ID to avoid colliding with the client or another mod.

For example, prefer `hello-mod-panel` over a generic ID such as `panel`.

---

## Working with arbitrary files and formats

**The loader is not a file-format interpreter. The mod decides what each file means and how to use it.**

A mod may need images, stylesheets, JSON data, audio, fonts, binary data, or a completely custom file format. The loader should not need a special case for each extension. From the mod's point of view, a file is simply a resource that it can fetch and then process with the appropriate browser API or library.

For example:

- Fetch text and parse it as JSON.
- Fetch bytes with `response.arrayBuffer()` for binary formats.
- Turn bytes into a `Blob` or object URL when an API expects a URL.
- Pass data to a library, decoder, emulator, or parser included by the mod.
- Display media using browser elements when the browser supports that format.

A file extension alone does not guarantee that the browser can interpret a format. If a format needs a decoder, emulator, or third-party library, the mod is responsible for providing and using it.

### Example mod-owned resource loading

Today, the entry script can fetch additional files directly from the mod repository. Use the raw GitHub URL for the mod's folder:

```js
(function () {
  'use strict';

  const MOD_BASE =
    'https://raw.githubusercontent.com/sspeth000/stabclient-mods/main/mods/hello-mod/';

  async function fetchBytes(path) {
    const url = new URL(path, MOD_BASE);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Could not load mod resource: ' + path);
    }

    return response.arrayBuffer();
  }

  let objectUrl = null;

  async function start() {
    // The mod chooses how to interpret the bytes.
    const bytes = await fetchBytes('assets/example.bin');

    // Example only: create a Blob URL for an API that accepts one.
    const blob = new Blob([bytes], {
      type: 'application/octet-stream'
    });

    objectUrl = URL.createObjectURL(blob);

    // Pass objectUrl to the format-specific library or API your mod uses.
    // The loader does not decide what this binary file represents.
  }

  start().catch(error => console.error('[hello-mod]', error));

  Mod.close = function () {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  };
})();
```

Replace `hello-mod` with your actual mod folder and `assets/example.bin` with the resource path. The example treats the file as raw bytes; your mod can instead use `response.text()`, `response.json()`, `response.blob()`, or another suitable method.

### Important: what works today

- The loader fetches the manifest and executes the JavaScript file specified by `entry`.
- The entry script can use `fetch()` to retrieve additional files from the mod repository.
- The mod itself decides how to parse, display, decode, or otherwise use those files.
- The loader does not automatically download every file in the mod folder.
- The loader does not currently provide a resource registry, automatic asset map, or format-specific handlers.
- Any object URLs, event listeners, DOM elements, timers, or other resources created by the mod should be cleaned up in `Mod.close()`.

This keeps the design format-agnostic: adding a new file type does not require adding a new file-type branch to the loader. The mod supplies the logic needed to use that file.

---
## The Mod object and Mod.close()

`Mod` is the lifecycle object supplied to your mod by the loader. Each mod receives its own object, so one mod's cleanup function does not overwrite another mod's cleanup function.

### Supported API

| API | Description |
|---|---|
| `Mod.close` | Optional function your mod defines to clean up its own UI and resources when the loader disables or removes it. |

There are currently no other documented mod APIs. Do not assume methods such as `Mod.createPanel()`, `Mod.onEnable()`, or `Mod.storage` exist.

### Defining Mod.close

Define the function in your entry script:

```js
Mod.close = function () {
  // Remove your UI and clean up your resources.
};
```

The loader calls this function when the user disables or removes the mod.

The loader does not decide how your interface should close. Your mod defines that behavior.

For example, one mod may remove a panel, another may hide a custom overlay, and another may disconnect its own event listeners before removing its UI.

### Make cleanup safe to call more than once

A cleanup function should be idempotent: calling it repeatedly should not cause errors or unwanted behavior.

A simple pattern is:

```js
let closed = false;

Mod.close = function () {
  if (closed) return;
  closed = true;

  // Clean up resources here.
};
```

### Example: a panel with its own close button

```js
(function () {
  'use strict';

  const panel = document.createElement('section');
  panel.id = 'hello-mod-panel';
  panel.textContent = 'Hello from Hello Mod!';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';

  panel.appendChild(closeButton);
  document.body.appendChild(panel);

  let closed = false;

  function closePanel() {
    if (closed) return;
    closed = true;
    panel.remove();
  }

  closeButton.addEventListener('click', closePanel);

  // The loader calls this when the mod is disabled or removed.
  Mod.close = closePanel;
})();
```

The panel's button and the loader both use the same cleanup function. This keeps the close behavior in one place.

### What happens if Mod.close is missing?

Nothing special. The loader checks whether `Mod.close` is a function. If it is not, the loader skips the callback and continues its disable or removal process.

Even if your mod has no visible UI, define `Mod.close` if it creates listeners, timers, observers, or other resources that need to be stopped.

---

## Building a UI panel

Mods create their own interface. The loader does not generate panels for them.

A panel can be created with ordinary DOM elements:

```js
const panel = document.createElement('section');
panel.id = 'hello-mod-panel';
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-label', 'Hello Mod');

panel.style.cssText = [
  'position:fixed',
  'top:76px',
  'right:16px',
  'z-index:100000',
  'width:min(320px,calc(100vw - 32px))',
  'box-sizing:border-box',
  'padding:14px',
  'border:1px solid rgba(255,255,255,.2)',
  'border-radius:12px',
  'background:#111827',
  'color:#fff',
  'font:14px Arial,sans-serif',
  'box-shadow:0 10px 32px rgba(0,0,0,.4)'
].join(';');

document.body.appendChild(panel);
```

### UI recommendations

- Give every element a mod-specific ID or class prefix.
- Use `textContent` for plain text rather than inserting untrusted strings as HTML.
- Use `addEventListener` for events.
- Keep your panel's z-index high enough to be visible, but avoid unnecessarily extreme values.
- Make panels fit smaller screens.
- Add accessible labels to buttons and dialog-like elements.
- Keep references to created elements so `Mod.close` can remove them.

### Avoid duplicate panels

If your code may be executed more than once during testing, remove an older panel before creating a new one:

```js
const oldPanel = document.getElementById('hello-mod-panel');
if (oldPanel) oldPanel.remove();
```

This is a convenience for development. It does not replace proper cleanup.

---

## Cleaning up event listeners and timers

Removing a panel does not automatically remove every event listener or timer your mod created. Your cleanup function should stop them.

### Event listeners

Use an `AbortController` to make groups of event listeners easy to remove:

```js
const events = new AbortController();

window.addEventListener('resize', function () {
  // Update your mod's UI.
}, { signal: events.signal });

document.addEventListener('keydown', function (event) {
  // Handle a key used by your mod.
}, { signal: events.signal });

Mod.close = function () {
  events.abort();
  panel.remove();
};
```

You can also remove listeners manually with `removeEventListener()`. If you do, keep the original function reference and use the same event type and options when removing it.

### Intervals

Store the interval ID and clear it during cleanup:

```js
const intervalId = window.setInterval(function () {
  // Periodic update.
}, 1000);

Mod.close = function () {
  window.clearInterval(intervalId);
  panel.remove();
};
```

### Timeouts

Store timeout IDs if they may still be pending when the mod closes:

```js
const timeoutId = window.setTimeout(function () {
  // Delayed work.
}, 2000);

Mod.close = function () {
  window.clearTimeout(timeoutId);
  panel.remove();
};
```

### Observers

Disconnect observers during cleanup:

```js
const observer = new MutationObserver(function () {
  // React to a DOM change.
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

Mod.close = function () {
  observer.disconnect();
  panel.remove();
};
```

### Cleanup checklist

Your `Mod.close` should clean up everything the mod started, including:

- Panels, buttons, overlays, and other DOM elements.
- Event listeners attached to `window`, `document`, or existing page elements.
- Intervals and pending timeouts.
- Mutation observers, resize observers, and intersection observers.
- Subscriptions or callbacks registered with other systems.
- Any other repeating or long-lived work.

The loader catches errors thrown by `Mod.close`, but it cannot clean up resources your function leaves behind.

---

## Adding your mod to availablemods.json

The catalog file is at the repository root:

```text
availablemods.json
```

It contains a `schemaVersion` and a `mods` array.

### Complete catalog example

```json
{
  "schemaVersion": 1,
  "mods": [
    {
      "id": "hello-mod",
      "name": "Hello Mod",
      "version": "1.0.0",
      "author": "Your Name",
      "description": "A small example mod.",
      "category": "Example",
      "homepage": "https://github.com/sspeth000/stabclient-mods",
      "manifest": "mods/hello-mod/manifest.json"
    }
  ]
}
```

### Catalog fields

| Field | Description |
|---|---|
| `schemaVersion` | Must be the number `1`. |
| `mods` | Array of mod entries. |
| `id` | Unique mod identifier. |
| `name` | Display name shown in the Mods tab. |
| `version` | Version shown to users. |
| `author` | Author shown in the listing. |
| `description` | Short description shown in the listing. |
| `category` | Optional category label. |
| `homepage` | Optional HTTPS project page. |
| `manifest` | Path to the mod's manifest, relative to the repository root. |

### Mod ID rules

The current loader accepts IDs matching this pattern:

```text
a-z, 0-9, and hyphens
```

The ID must start with a letter or number and be between 2 and 48 characters long.

Examples:

- Valid: `hello-mod`
- Valid: `ui2`
- Invalid: `Hello Mod`
- Invalid: `-hello`
- Invalid: `hello_mod`

Keep the ID stable after publishing. The loader uses it to identify the installed mod and its saved settings.

### Keep catalog and manifest IDs identical

If the catalog says:

```json
"id": "hello-mod"
```

The manifest must also say:

```json
"id": "hello-mod"
```

The loader rejects a manifest whose ID does not match the catalog entry.

### Manifest path

For a mod at `mods/hello-mod/`, use:

```json
"manifest": "mods/hello-mod/manifest.json"
```

The loader also has a compatibility fallback that assumes this standard path when the catalog entry has no manifest property. It is better to include the manifest path explicitly.

---

## Testing your mod

Use this process before publishing:

1. Commit the mod folder and its files to the mod repository.
2. Add the mod to `availablemods.json`.
3. Open StabClient.
4. Open the Mods tab.
5. Press **Refresh** to fetch the latest catalog.
6. Find your mod and press **Install**.
7. Press **Enable**.
8. Confirm that the mod starts and its UI behaves correctly.
9. Press the mod's own close button, if it has one.
10. Enable it again and test the loader's **Disable** action.
11. Confirm that `Mod.close()` removes the mod's UI and stops its listeners, timers, and observers.
12. Refresh the page and verify that installed mods start disabled.

### Browser developer tools

If a mod does not load, open the browser's developer console and look for errors.

Useful checks include:

- Did the catalog load?
- Does the catalog entry have the correct manifest path?
- Does the manifest return valid JSON?
- Does the manifest ID match the catalog ID?
- Does the entry file exist at the specified path?
- Is there a JavaScript syntax error in `main.js`?
- Does the mod throw an error during startup?
- Does `Mod.close` get assigned before the mod finishes starting?

Do not publish a mod until it has been tested from the actual Mods tab.

---

## Updating and versioning

When publishing an update:

1. Make your code changes.
2. Test the updated mod.
3. Update the `version` in the manifest.
4. Update the matching `version` in `availablemods.json`.
5. Commit the changes.

Use a consistent version format, such as:

- `1.0.0` for the first stable release.
- `1.0.1` for a small fix.
- `1.1.0` for a feature addition.
- `2.0.0` for a major update.

The loader displays the catalog version and saves the installed version when the mod is enabled. The current loader does not provide a full automatic update manager, so users may need to refresh the page and re-enable a mod to load changed code.

---

## Current loader behavior and limitations

This section is important. It describes what the loader actually does today, rather than features that may be added later.

### Execution context

Mods execute in the main page JavaScript context. They are not placed in an iframe and are not sandboxed.

This gives mods direct access to the page DOM, but it also means a bug or unsafe script can affect the client page. Only use trusted code.

### Resource loading

The loader currently fetches:

- The manifest.
- The JavaScript file specified by `entry`.

It does not scan the mod folder or load a `resources` list. Additional files must be fetched by the mod's own entry script. There are no extension-specific handlers: the mod chooses how to interpret each response, whether as text, JSON, a Blob, an ArrayBuffer, or another representation.

### Lifecycle and disabling

When a mod is disabled, the loader calls its `Mod.close()` function if one exists, removes the injected script element, and marks the mod disabled.

Removing a script element does not reverse JavaScript that already executed. A mod must clean up its own resources in `Mod.close`. Refreshing the page is the reliable way to reset the page and clear anything left behind.

### Removing a mod

When a mod is removed, the loader calls its cleanup function if available, deletes the saved installed record, saves the change, and refreshes the page.

### Startup state

Installed mods are intentionally set to disabled after a full page reload. Users must enable them again from the Mods tab.

### Permissions

The manifest requires a `permissions` array, but a permissions system is not currently implemented. An empty array is recommended.

### No built-in panel API

There is no `Mod.createPanel()` function or automatic panel renderer. Create your UI with ordinary DOM APIs.

---

## Troubleshooting

### "No mods found in the catalog yet."

Check that:

- `availablemods.json` exists at the root of the mod repository.
- The JSON is valid.
- `schemaVersion` is the number `1`.
- `mods` is an array.
- Each entry has a valid unique ID and the required metadata fields.

Press **Refresh** in the Mods tab after committing catalog changes.

### The mod appears, but enabling it fails

Check that:

- The catalog's `manifest` path is correct.
- The manifest exists and contains valid JSON.
- `manifestVersion` is `1`.
- The manifest ID exactly matches the catalog ID.
- The `entry` path is correct and points to a JavaScript file.
- The JavaScript file has no syntax errors.

### The mod loads, but no panel appears

The loader does not create a panel for you. Your `main.js` must create its own DOM elements and append them to the document.

### The panel closes, but something keeps running

Your `Mod.close()` function probably does not clean up every resource. Check for event listeners, intervals, timeouts, observers, and callbacks. Refresh the page to reset the current runtime.

### Disabling does not restore the page perfectly

That is why cleanup is important. The loader cannot automatically reverse arbitrary JavaScript changes. Implement a thorough `Mod.close()` and refresh the page after disabling if anything remains.

### My mod does not show the latest code

Refresh the Mods catalog and reload the page if necessary. Check that the updated files were committed to the default branch and that the catalog and manifest versions agree.

---

## Publishing checklist

Before adding a mod to the public catalog, confirm each item:

- [ ] The mod has a unique, stable ID.
- [ ] The mod has its own folder under `mods/`.
- [ ] `manifest.json` is valid JSON.
- [ ] The manifest ID matches the catalog ID.
- [ ] The manifest entry path points to the correct JavaScript file.
- [ ] `main.js` runs without console errors.
- [ ] The mod creates and manages its own UI.
- [ ] Every created element uses mod-specific IDs or classes.
- [ ] `Mod.close()` is defined when cleanup is needed.
- [ ] `Mod.close()` safely handles repeated calls.
- [ ] Event listeners, timers, and observers are cleaned up.
- [ ] The catalog entry has the correct manifest path.
- [ ] The catalog and manifest versions match.
- [ ] The mod has been tested through the actual Mods tab.
- [ ] The code is trusted, reviewed, and does not perform unexpected actions.

---

## Example mod

The repository's [Test Mod](mods/test-mod/) is a minimal working example. It creates a closable panel and defines `Mod.close()` so the loader can remove that panel when the mod is disabled or removed.

Use it as a reference when starting a new mod.

Happy modding!
