# Pick a Tip Out of a Hat

A small mobile game for tipping your Dasher. Delivered per instructions? Then the tip gets picked out of a red ball cap, with a hand that looks different every session, a nervous clock, a rising Shepard tone, and a celebration when the number lands.

It is a web app that installs to a phone's home screen (a PWA), so there is nothing to sideload and no app store. Open it in the phone's browser, add it to the home screen, and it runs full screen and offline.

## Play it

1. Host the folder anywhere that serves static files (GitHub Pages is set up below), or open `index.html` from a local server.
2. On iPhone: open the link in Safari, tap Share, then "Add to Home Screen". On Android: open it in Chrome and tap "Install app" or "Add to Home screen".
3. Tap the hat icon. Sound starts after the first tap, which is how phone browsers work.

### How a round goes

Tap **Draw a tip**. The hand writes the amounts on slips, tosses them in the cap, shakes it for a random stretch, reaches in and pulls one out. The slip is held for a random, anxious moment while the clock ticks, then it is revealed.

Besides the dollar slips the hat holds a **Wild Card** (the Dasher names the tip), **blank slips** that send the hand back in, and **bonus slips** worth 1 to 5 extra draws. After a bonus slip the Dasher can keep any amount that comes up or draw again; the last draw is final, even if it is smaller.

### Default amounts

$1, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 20, 23, 25, 28, 30, 35, 40, 45, 50, 55, 60, 67, 70, 80, 90, 100, plus 1 wild card, 5 blank slips and 5 bonus slips. All of this is editable.

## Settings (hamburger, top right)

- **Theme**: light or dark. Follows the phone until you pick one.
- **The hand**: skin tone is random every session unless you switch on "Set skin tone" and pick one. Under "Accessories" you choose the rings (how many, and the metal), the watch, the bracelets (how many, and the style), the tattoo and where it sits, the nail colour, knuckle letters and freckles. Everything starts on "Random"; "New random hand" rolls again whatever is still on Random and keeps the rest.
- **The hat**: the cap color (red by default; ember and the rest of the palette are in the dropdown).
- **Tip amounts**: tap a chip to remove it, type to add one, set how many blank, Wild Card and bonus slips go in, or reset to the defaults.
- **Celebration**: the winner background. Random by default, or pick one: the crowd going wild (a scrolling panorama where each fan holds a letter of "WE GOT A WINNER!"), confetti, stars expanding into view, or fireworks.
- **Sound** on or off. Every sound is synthesized in the browser: the scribble, the toss, the rattle of the cap, the clock, the Shepard tone and the fanfare.

Settings are saved on the device.

## Publishing with GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `main` branch and enables GitHub Pages on the repository the first time it runs. After a push to `main` the game is live at `https://<your-user>.github.io/Pick-a-Tip-Out-a-Hat/`. If the first run reports that it could not create the site, enable Pages by hand once: in the repository go to Settings, then Pages, set Source to "GitHub Actions", and re-run the workflow.

## Running it locally

Any static server works. For example:

```
npx http-server -p 8080 .
```

Then open `http://localhost:8080/`. Add `?fast=1` to the URL to speed every animation up about eight times, or `?speed=0.5` for half speed, which is handy when testing.

## Two looks

The app ships with two looks. The default follows the Ember & Espresso design system below. The first design, bright and glossy with emoji and neon celebrations, is kept as the "party" look and is hidden behind an Easter egg: in Settings, set the tip amounts to only 7 and 11. Balloons float up, a crowd of kids cheers, and the party look appears. From then on a "Look" switch in Settings flips between the two; the amounts stay as you set them, so reset them afterwards.

## Design

The app follows the Ember & Espresso design system: coffee-brown surfaces, white type, and one ember orange that marks the single thing to tap. Jost carries the type (uppercase, imperative headlines) and DM Mono carries every number, from the tip amounts to the slip counter. Corners are 14px, depth is flat, icons are 22px line icons, and there are no emoji. The system's tokens are in `css/tokens.css` and its component classes (`ee-btn`, `ee-banner`, `ee-field`, `ee-seg`, `ee-badge`) are used unchanged from `css/ember-espresso.css`. Dark is the primary theme; light uses the system's light tokens.

The celebrations keep their motion but draw from the same palette: ember and its tints, taupe, white, and the system's gold and green accents on warm dark grounds.

## How it is built

No framework and no build step: plain HTML, CSS and JavaScript.

| File | What it does |
| --- | --- |
| `js/hand.js` | Draws the hand as SVG and rolls its random look. Fingers curl, the thumb pinches, and it can hold a pen or a slip. |
| `js/hat.js` | The upside-down cap, split into a back and a front layer so the hand can go inside it. |
| `js/audio.js` | All sound effects, synthesized with the Web Audio API. |
| `js/celebrate.js` | The four canvas celebrations. |
| `js/game.js` | Screens, the settings drawer and the round: write, toss, shake, reach, suspense, reveal, bonus draws. |
| `js/settings.js` | Defaults and saved settings. |
| `css/tokens.css`, `css/ember-espresso.css` | The design system's tokens and component classes. |
| `sw.js`, `manifest.webmanifest` | Offline cache and home-screen install. |
