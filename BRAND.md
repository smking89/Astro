# ASTRO brand guidelines

ASTRO is the identity layer behind Bleek, Koba.games, SnagChat and KOBAbot. These rules keep it recognisable across
every product: how the mark is drawn, where it may sit, what the sign-in control looks like, and what an integration
may and may not say about the account it connects to.

**Version 1.0 · October 2026.** The same guidelines render at `/astro/brand` on the ASTRO host, with the specimens
drawn inline. When these rules and a shipped screen disagree, the rules win and the screen gets fixed.

## 1. The mark

The ASTRO mark is the two-stroke A. It is drawn once and never redrawn: the strokes taper, the apex stays open, and the
counter is a clean vertical channel. Production ships an opaque app icon on Space Black; the transparent knockouts are
for layout where the surface has to show through.

| Surface | Treatment |
| --- | --- |
| Space Black `#000000` | Full colour mark. Default for app icon and metadata. |
| Abyss Charcoal `#0B0C0E` | Full colour mark. |
| Static White `#F8FAFC` | Black knockout. |
| Any other dark flat panel | White knockout. |

**Clear space** is half the mark's height, free on all four sides. Nothing enters that margin: no text, no rule, no
icon, no crop edge. The margin scales with the mark, so a 20px mark keeps 10px of air and a 96px mark keeps 48px.

**Minimum size**

| Use | Minimum |
| --- | --- |
| Digital icon | 20px, square, never squashed |
| Horizontal lockup | 88px wide, mark 24px |
| Print | 8mm height |
| Engraving and embroidery | 12mm, single-colour knockout only |

Below the minimum, drop the mark and set the wordmark on its own.

**Never** rotate, skew, mirror, recolour, tint, outline, glow, drop-shadow, condense, crop, or place the mark on a
gradient, a photograph, a video still, another logo, glass or a translucent overlay.

## 2. Wordmark and lockup

The wordmark is **ASTRO** in Inter Bold, uppercase, with 0.22em tracking — the same treatment as the product headers.
The default lockup is horizontal: mark at 26px, a 12px gap, then the wordmark at 13px. Below 88px of available width,
use the icon alone.

Do not set the wordmark in title case or another typeface, attach a tagline, a URL or a `®`, enclose the lockup in a
pill or coloured plate, letterspace Bleek, Koba.games, SnagChat or KOBAbot to match it, or rebuild the lockup at a
different mark-to-wordmark ratio.

## 3. Colour

Black is the canvas, charcoal is the depth, and colour is a signal rather than decoration. Astro Red is reserved for
the mark so the identity never competes with a button.

| Token | Hex | Use | Never |
| --- | --- | --- | --- |
| Space Black | `#000000` | Application canvas, and the mark's home field | Not a text colour on other surfaces |
| Abyss Charcoal | `#0B0C0E` | Panels, sidebars, elevated cards | Keep type at Muted Slate or brighter |
| Astro Red | `#FF0000` | The mark, and nothing else | Never UI text, buttons, banners or borders |
| Beek Indigo | `#4F46E5` | Primary buttons, mentions, notifications | Never a substitute fill for the mark |
| Electric Cyan | `#06B6D4` | Speaking rings, verified handles, premium accents | Not decorative glow |
| Static White | `#F8FAFC` | Primary text and the light sign-in fill | Never `#FFFFFF` for body copy |
| Muted Slate | `#64748B` | Timestamps, descriptions, offline labels | Darkest permitted is `#6E7C93` on Space Black |

No glows, fog or blur on brand surfaces. Body copy at 4.5:1 or better, large text at 3:1 or better.

## 4. Typography

Inter only, self-hosted, weights 400, 500, 600 and 700. One family across marketing, product and console — no condensed
cuts, no display faces, no per-product substitutions. Numbers people compare (coin balances, reaction counts, quotas)
use tabular numerals.

| Role | Size / line | Weight | Tracking | Where |
| --- | --- | --- | --- | --- |
| Display | 40–56px / 1.05 | 700 | −0.02em | Landing headlines, one per page |
| Section | 20px / 28px | 600 | −0.01em | Page and panel titles |
| Body | 13px / 24px | 400 | 0 | Explanatory copy, form labels |
| Chat | 16px / 22px | 400 | 0 | Message content in Bleek |
| Meta | 11–12px / 16px | 500 | 0.14em uppercase | Eyebrows, table heads, captions |
| Mono | 11.5–12px / 20px | 500 | 0 | ASTROid, keys, code; tabular numerals for balances |

Do not letterspace body copy or messages, centre paragraphs, set product UI below 11px, or fall back to the operating
system's default sans — ship Inter.

## 5. "Sign in with ASTRO"

One label, one control. Use it wherever an account can be created or resumed with ASTRO, and nowhere else. The mark
stays in full colour inside the button; the fill carries the surface it sits on.

| Property | Spec |
| --- | --- |
| Label | `Sign in with ASTRO` — sentence case, always with the mark |
| Height | 40px standard, 32px compact. Never below 32px |
| Fill and radius | 8px radius; Static White on dark surfaces, Space Black on light ones |
| Mark | 18px at standard, 15px compact, full colour, 10px from the label |
| Label type | Inter 600, 13px (12px compact), no letter-spacing |
| Hover | Fill shifts one step; the mark never moves or animates |
| Focus | 2px Electric Cyan outline, 2px offset |
| Pressed | Fill returns to the resting colour; no scale or bounce |
| Busy | Label reads `Signing in…` and the control keeps its width |
| Width | Content width, or full width of the form column — never taller to fill a box |

```html
<a href="/astro" class="inline-flex items-center justify-center rounded-lg font-semibold ring-1 ring-inset bg-[#F8FAFC] text-black ring-black/10 hover:bg-[#E2E8F0] h-10 gap-2.5 px-4 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06B6D4]">
  <img src="/astro-icon.png" alt="" width="18" height="18" class="h-[18px] w-[18px] object-contain" />
  Sign in with ASTRO
</a>
```

Give the control the same weight as your other sign-in options and put it inside your own form. Do not rewrite the
label, recolour the mark, swap the fill for product indigo, drop the mark, shrink below 32px, stretch the height, add
badges, taglines, prices or "new" flags inside it, or present it as an ASTRO endorsement of your product.

## 6. Naming and voice

The name is four letters in caps. Products carry their own casing exactly as written, and handles are always
lowercase with an `@`.

| Correct | Not permitted |
| --- | --- |
| ASTRO | Astro, astro, ASTRO™ |
| Sign in with ASTRO | Login with ASTRO, Log in with Astro |
| an ASTRO account | an Astro account, an Astro login |
| ASTROid | AstroID, Astro ID, ASTRO ID, astro-id |
| @koba | koba, @Koba, @ koba |
| Bleek · Koba.games · SnagChat · KOBAbot | Beek, Koba Games, Snagchat, Kobabot |
| coins, wallet | credits, tokens, ASTRO coins |

Voice is plain and declarative, second person, present tense. Numerals for counts and money. "Suspended" for a paused
account, "unverified" for a handle without staff review. No exclamation marks, no "seamless", "revolutionary" or
"supercharged". No invented compounds such as ASTROChat, ASTROverse or "ASTRO-verified partner". No unqualified
security claims: the ASTROid is public and verifiable, not secret.

## 7. The ASTROid and the verified badge

Every account carries one ASTROid, minted at registration and never edited:

```
ASTRO-4K7Q-9WTM-2XHB-8NDR-3FVC-6PZS
```

Prefix, then six groups of four from Crockford base32. Look-alikes normalise on input (I and L to 1, O to 0), so a
pasted value can be checked without being "fixed".

Show the whole string, grouped in fours, in a monospace face, with a copy control that copies the full value. Verify it
locally with `verifyAstroId()` and treat a failed signature as "not an ASTRO account".

Never re-group, lowercase, truncate mid-group or ellipsise the interior; if space runs out, hide trailing groups and
keep the full value in the copy action. Never treat the ASTROid as a password, session token, reset code or proof of
ownership. Never ask a person to paste one into chat to prove they own an account. Never mint, patch or "repair" one, and
never rename it Astro ID or AstroID in an interface string.

The cyan check means one thing: ASTRO staff reviewed the handle behind this account. Only the ASTRO host, or a product
reading the account's `handleVerifiedAt`, may render it — beside the handle it belongs to, never in your own artwork,
never for sale, never self-issued.

## 8. Rules and permissions

**Permitted without asking**

- Show the mark unchanged to link to ASTRO, or to say your app signs people in with an ASTRO account.
- Use the supplied sign-in button, in one of its two approved surfaces, on your own sign-in screen.
- Show unmodified screenshots and screen recordings of ASTRO products.
- State factual compatibility: "Works with ASTRO accounts."
- Link to the profile and developer pages from documentation and release notes.

**Not permitted**

- Redraw, recolour, rotate, crop, outline, animate or re-proportion the mark, or rebuild the wordmark in another typeface.
- Use the mark, the word ASTRO, or a confusingly similar name in your product name, app icon, domain, package name or
  social handle.
- Imply partnership, endorsement, certification or "powered by ASTRO" without written approval.
- Render the cyan verification check, or describe a handle as "ASTRO verified", unless ASTRO staff verified it.
- Register the mark, or a near copy, as a trademark; sell merchandise carrying it.
- Present ASTRO as the operator of your product, or your product as an ASTRO product.
- Alter, extend or invent an ASTROid, or present one as a password, proof of ownership or secret.

These permissions end when an integration stops following these rules or when ASTRO asks it to stop. On request, remove
the mark, the sign-in control and any ASTRO naming from live surfaces and store listings within 30 days. Nothing here
grants a trademark licence beyond the uses listed above, and nothing transfers ownership of the mark. If a use is not
described in this file, it is not permitted yet — ask first.

## 9. Assets and tokens

The canonical files ship with the ASTRO host: `public/astro-icon.png` (512×512, opaque Space Black field) and
`public/brand/astro-mark-red.png`, `astro-mark-white.png`, `astro-mark-black.png` (512×512, transparent). Ship them
yourself; do not trace, recolour or export your own from a screenshot, and do not hotlink another deployment.

```css
--astro-space-black: #000000;
--astro-abyss: #0B0C0E;
--astro-red: #FF0000;   /* mark only */
--astro-indigo: #4F46E5;
--astro-cyan: #06B6D4;
--astro-white: #F8FAFC;
--astro-slate: #64748B;
```
