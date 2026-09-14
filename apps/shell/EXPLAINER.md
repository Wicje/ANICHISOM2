# Continua — The Complete Product & Technical Explainer

> **A straightforward breakdown of how Continua works, real-world user scenarios, authentication security, privacy controls, and why single-app cloud sync isn't enough.**

---

## 1. The Core Question: "Why not just use Microsoft Office or Google Drive sync?"

> **"Google Drive and OneDrive sync individual files. Continua syncs the entire multi-tool working constellation."**

When you work on any real project, you are almost never using just *one* file. You are operating in a **constellation of 4 to 6 tools simultaneously**:

```
        THE "REAL WORK" CONSTELLATION (What you actually do)
┌───────────────────────────────────────────────────────────────────┐
│ 1. A Google Doc / Word draft on the left side of your screen      │
│ 2. A Figma mockup or financial spreadsheet on the right           │
│ 3. 4 specific browser research tabs open to exact scroll points   │
│ 4. A terminal window running in a specific project subfolder      │
│ 5. A scratchpad with temporary pasteboards and to-do notes        │
└───────────────────────────────────────────────────────────────────┘
```

* **What Microsoft Office / OneDrive does**: Syncs only file #1. When you open a new laptop, you have to spend 20 minutes re-finding the 4 browser tabs, re-locating the Figma frame, reopening the terminal, and rebuilding your screen layout.
* **What Continua does**: Remembers the **entire layout, active URLs, git branch, cursor line, and tools together**, so you resume the whole working session in 3 seconds.

---

## 2. Real Scenarios: "When someone borrows a laptop or switches machines, what are they actually doing?"

### Scenario A: The "Night-Before Deadline" Laptop Failure
* **The Situation**: A university student or freelance marketer is finishing a 20-page client pitch. At 11 PM, their laptop screen flickers and the motherboard dies. They borrow their roommate's MacBook for 2 hours.
* **What they need to do**: They need to finish the deck without installing heavy software or leaving their private accounts logged in on the roommate's laptop.
* **How Continua solves it**:
  1. Open Safari on the roommate's laptop ➔ go to `continua.app`.
  2. Log in with Passkey / Google SSO.
  3. Their pitch draft, reference links, moodboard assets, and outline snap open in the browser sandbox.
  4. They finish the work, click **"Exit & Wipe Session"**, and close the lid. **Zero files, zero cookies, zero search history** remain on the roommate's Mac.

---

### Scenario B: The Developer / Designer Switching from Office to Home
* **The Situation**: A frontend developer finishes work on their office iMac. They have VS Code open to `src/checkout.tsx` (line 140), terminal running `npm run dev`, and Chrome open to Stripe API docs and Figma frame #3.
* **What they need to do**: Continue coding on their personal laptop on the couch without re-navigating everything.
* **How Continua solves it**:
  * Continua doesn't sync the whole hard drive (which is gigabytes). It syncs a tiny **10 KB State Manifest**:
    ```json
    {
      "git_branch": "feat/checkout",
      "active_file": "src/checkout.tsx",
      "line": 140,
      "tabs": [
        "https://stripe.com/docs/webhooks",
        "https://figma.com/file/123#node-4"
      ]
    }
    ```
  * When they open their home laptop, Continua commands native VS Code and native Chrome to snap open to those exact coordinates.

---

### Scenario C: The Agency Contractor (Multi-Client Silos)
* **The Situation**: A freelancer manages 3 clients (Client Alpha, Client Beta, Client Gamma).
* **The Problem**: Mixing up client logins, bookmark bars, and open tabs causes mistakes (e.g., posting to the wrong client repo or Slack).
* **How Continua solves it**: Continua creates isolated "Context Workspaces". One click switches the entire machine from Client Alpha's workspace to Client Beta's workspace with zero tab clutter.

---

## 3. The Authentication Question: "Does Continua store passwords or steal tokens?"

**The Answer: NO. Continua NEVER stores or keylogs your plaintext passwords.**

Here is how authentication is handled safely depending on the mode:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HOW AUTHENTICATION WORKS                              │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ In Web Mode (Borrowed Machine)       │ In Native Mode (Between Your Own PCs)│
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • You authenticate ONCE into         │ • You already have 1Password,        │
│   Continua via SSO or Passkey.       │   Keychain, or Chrome saved on both. │
│ • Built-in tools (notes, terminal,   │ • Continua only passes the URL or    │
│   docs, file manager) inherit your   │   file path.                         │
│   Continua identity automatically.   │ • The host machine's native browser  │
│ • External web tools open to their   │   supplies the existing session      │
│   URLs; you sign in via OAuth / SSO  │   without Continua touching tokens.  │
│   without storing passwords in text. │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 4. What Exactly Does Continua Track (And How Do You Control It)?

Continua does **NOT record your screen as video** (that would be a massive privacy risk and battery drain). Instead, it creates a **Structured State Graph**:

### What is Tracked:
1. **Layout & Coordinates**: Which windows were open, their size, and screen positions.
2. **Resource Locators (URIs)**: Active URLs, Figma file IDs, Git repository names, and current branch.
3. **Editor Pointers**: Active file path, cursor line number, and active scroll offset.
4. **Local Ephemeral State**: In-progress scratchpad notes and temporary terminal working directories (`cwd`).

### How the User Controls It (Privacy & Blacklists):
Continua includes built-in **Privacy & Blacklist Controls** (configured in [`lib/stores/privacy.store.ts`](lib/stores/privacy.store.ts)):

* 🚫 **Domain Blacklists**: Automatically ignores banking portals (`*.chase.com`, `*.bankofamerica.com`), password managers (1Password, Bitwarden), and private health sites.
* 🔒 **Incognito / Private Mode**: A quick toggle in the menu bar disables context tracking completely for the session.
* 📦 **Per-App Granular Permissions**: Users can select which applications Continua is allowed to snapshot (e.g., *"Track VS Code and Chrome, but never track Messages or WhatsApp"*).

---

## 5. Summary Cheat Sheet for Sharing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             KEY TAKEAWAYS                                   │
├───────────────────┬─────────────────────────┬───────────────────────────────┤
│ Multi-Tool Mesh   │ Zero Plaintext Passwords│ Clean-Room Ghost Mode         │
│ Continua syncs    │ Auth is handled via     │ On borrowed PCs, closing the  │
│ the relationship  │ SSO/OAuth and native    │ tab purges all local storage  │
│ between all your  │ browser keychains—never │ and cookies, leaving no trace │
│ active tools.     │ raw passwords.          │ on the host computer.         │
└───────────────────┴─────────────────────────┴───────────────────────────────┘
```
