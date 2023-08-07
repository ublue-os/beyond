# beyond

[![release-please](https://github.com/ublue-os/beyond/actions/workflows/release-please.yml/badge.svg)](https://github.com/ublue-os/beyond/actions/workflows/release-please.yml)

**Cassidy’s idea of what GNOME could look like in the future—today**

![Screenshot of Beyond overview](https://github.com/ublue-os/beyond/assets/611168/93a07df1-ac0a-4dff-b66b-9bebf58716ab) | ![Screenshot of Beyond desktop](https://github.com/ublue-os/beyond/assets/611168/f6ffac8a-6100-4ccc-8795-5b3b770ae6bd)
---|---


Beyond is an opinionated look at what an ideal GNOME-based OS would look like, from the perspective of [Cassidy James Blaede](https://cassidyjames.com).

## Default Apps

- **GNOME core apps from Flathub**—including upcoming hopeful inclusions—e.g. Calculator, Calendar, Characters, Clocks, Contacts, Document Viewer, Fonts, Loupe, Maps, Music, Nautilus Preview (Sushi), Videos, Weather, Web

- **GNOME apps from Fedora** where there are gaps or it doesn't make sense from Flathub, e.g. Console, Disks, Files, Settings, Software, System Monitor

## User Experience

- **Stock GNOME** starting point as much as possible, e.g. default background, stylesheet, icons, window button positions, keyboard shortcuts

- **GNOME design experiments** like experimental Activities button behavior, font changes, and more to come

- **Dock** integrated as well as it can be into Shell since it’s the number one complaint I hear about GNOME from new users in the wild

- **Default settings** tweaked very occasionally for accessibility, e.g. tap-to-click for touchpads

- **Flathub included as a user remote** so each user can install their own apps without interfering with other users

# Usage

This is **highly experimental** at this stage! Settings and installed apps may change frequently until a 1.0 release.

## For existing Silverblue/Kinoite users

### Prepare

1. Ensure you're not using any overlays, as it could cause problems—you can add them back later if you choose:

   ```shell
   rpm-ostree reset
   ```

2. Install all available OS updates:

   ```shell
   rpm-ostree upgrade
   ```

3. Restart your computer to ensure you're running the latest updates

4. Pin the working deployment so you can safely rollback ([more info](https://docs.fedoraproject.org/en-US/fedora-silverblue/faq/#_about_using_silverblue)):

   ```shell
   sudo ostree admin pin 0
   ```

### Rebase

1. Run the following in a terminal, based on which type of GPU you use:

   <details>
     <summary>AMD/Intel</summary>
     <pre><code>sudo rpm-ostree rebase ostree-unverified-registry:ghcr.io/ublue-os/beyond:38</code></pre>
   </details>

   <details>
     <summary>NVIDIA</summary>
     <pre><code>sudo rpm-ostree rebase ostree-unverified-registry:ghcr.io/ublue-os/beyond-nvidia:38</code></pre>
   </details>
        
2. Restart your computer

3. Rebase onto a signed image (optional, but recommended), based on which type of GPU you use:

   <details>
     <summary>AMD/Intel</summary>
     <pre><code>sudo rpm-ostree rebase ostree-image-signed:docker://ghcr.io/ublue-os/beyond:38</code></pre>
   </details>

   <details>
     <summary>NVIDIA</summary>
     <pre><code>sudo rpm-ostree rebase ostree-image-signed:docker://ghcr.io/ublue-os/beyond-nvidia:38</code></pre>
   </details>
        
4. Restart your computer (again, yes)

### Install extensions

Beyond comes with some GNOME extensions to tailor the desktop experience. For now, **you must manually install them (https://github.com/ublue-os/beyond/issues/74)**.

1. Open Console and run:

   ```shell
   just install-beyond-extensions
   ```

2. Log out and back in (or restart your computer) to ensure the extensions are running

### To revert back to Silverblue

```shell
sudo rpm-ostree rebase fedora:fedora/38/x86_64/silverblue
```

## Verification

These images are signed with sigstore's [cosign](https://docs.sigstore.dev/cosign/overview/). You can verify the signature by downloading the `cosign.pub` key from this repo and running the following command:

```shell
cosign verify --key cosign.pub ghcr.io/ublue-os/beyond
```
