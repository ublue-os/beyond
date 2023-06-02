# beyond

**What a GNOME OS could look like in the future—today**

[![release-please](https://github.com/ublue-os/beyond/actions/workflows/release-please.yml/badge.svg)](https://github.com/ublue-os/beyond/actions/workflows/release-please.yml)

Beyond is an opinionated look at what an ideal GNOME-based OS would look like, from the perspective of [Cassidy James Blaede](https://cassidyjames.com). Initial goals:

- **GNOME core apps** from Flathub, including upcoming hopeful inclusions e.g. Web, Console, Loupe, etc.
- **Flathub included as a user remote** so each user can install their own apps without interfering with other users
- **Dock** integrated as well as it can be into Shell since it’s the number one complaint I hear about GNOME from new users in the wild
- **GNOME design experiments** like experimental Activities button behavior, font changes, and more to come

# Usage

This is highly experimental at this stage!

## For existing Silverblue/Kinoite users

### Prepare

1. Ensure you're not using any overlays, as it could cause problems—you can add them back later if you choose.

2. Install all available OS updates and restart your computer.

3. [Pin the working deployment](https://docs.fedoraproject.org/en-US/fedora-silverblue/faq/#_about_using_silverblue) so you can safely rollback. 

### Rebase

1. Run the following in a terminal, based on which type of GPU you use:

   <details>
     <summary>AMD/Intel</summary>
     <code>sudo rpm-ostree rebase ostree-unverified-registry:ghcr.io/ublue-os/beyond:38</code>
   </details>

   <details>
     <summary>NVIDIA</summary>
     <code>sudo rpm-ostree rebase ostree-unverified-registry:ghcr.io/ublue-os/beyond-nvidia:38</code>
   </details>
        
2. Restart you computer.

### To revert back

```shell
sudo rpm-ostree rebase fedora:fedora/38/x86_64/silverblue
```

## Verification

These images are signed with sigstore's [cosign](https://docs.sigstore.dev/cosign/overview/). You can verify the signature by downloading the `cosign.pub` key from this repo and running the following command:

```shell
cosign verify --key cosign.pub ghcr.io/ublue-os/beyond
```
