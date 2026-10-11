# Pick a Tip Out of a Hat

A bright little mobile game for tipping your Dasher. Delivered per instructions? Then the tip gets picked out of a red ball cap, with a hand that looks different every session, a nervous clock, a rising Shepard tone, and a celebration when the number lands.

It is a web app that installs to a phone's home screen (a PWA), so there is nothing to sideload and no app store. Open it in the phone's browser, add it to the home screen, and it runs full screen and offline.

## Play it

1. Host the folder anywhere that serves static files (GitHub Pages is set up below), or open `index.html` from a local server.
2. On iPhone: open the link in Safari, tap Share, then "Add to Home Screen". On Android: open it in Chrome and tap "Install app" or "Add to Home screen".
3. Tap the hat icon. Sound starts after the first tap, which is how phone browsers work.

### Two ways to play

- **Draw a Tip.** The hand writes the amounts on slips, tosses them in the cap, shakes it for a random stretch, reaches in and pulls one out. The slip is held for a random, anxious moment while the clock ticks, then it is revealed.
- **Pick a Number.** First the Dasher picks a number. Every numbered card hides an amount. Same hat, same shake, same suspense; the reveal shows what was behind the chosen number.

Two special slips are in the hat by default: a **Wild Card** (the Dasher names the tip) and several **Choose Again** slips (back into the hat, or pick another number).

### Default amounts

$1, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 20, 23, 25, 28, 30, 35, 40, 45, 50, 55, 60, 67, 70, 80, 90, 100, plus 1 wild card and 5 choose-again slips. All of this is editable.

## Settings (hamburger, top right)

- **Theme**: light or dark. Follows the phone until you pick one.
- **The hand**: skin tone is random every session unless you switch on "Set skin tone" and pick one. Rings, stacked rings, watch, bracelets, nail polish, freckles and tattoos are rolled at random; "New random hand" rolls again.
- **The hat**: the cap color (red by default).
- **Tip amounts**: tap a chip to remove it, type to add one, set how many Choose Again and Wild Card slips go in, or reset to the defaults.
- **Celebration**: the winner background. Random by default, or pick one: the crowd going wild (a scrolling panorama where each fan holds a letter of "WE GOT A WINNER!"), confetti, stars expanding into view, or fireworks.
- **Sound** on or off. Every sound is synthesized in the browser: the scribble, the toss, the rattle of the cap, the clock, the Shepard tone and the fanfare.

Settings are saved on the device.

## Publishing with GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the `main` branch. Turn it on once: in the repository go to Settings, then Pages, and set Source to "GitHub Actions". After the next push to `main` the game is live at `https://<your-user>.github.io/Pick-a-Tip-Out-a-Hat/`.

## Running it locally

Any static server works. For example:

```
npx http-server -p 8080 .
```

Then open `http://localhost:8080/`. Add `?fast=1` to the URL to speed every animation up about eight times, or `?speed=0.5` for half speed, which is handy when testing.

## How it is built

No framework and no build step: plain HTML, CSS and JavaScript.

| File | What it does |
| --- | --- |
| `js/hand.js` | Draws the hand as SVG and rolls its random look. Fingers curl, the thumb pinches, and it can hold a pen or a slip. |
| `js/hat.js` | The upside-down cap, split into a back and a front layer so the hand can go inside it. |
| `js/audio.js` | All sound effects, synthesized with the Web Audio API. |
| `js/celebrate.js` | The four canvas celebrations. |
| `js/game.js` | Screens, the settings drawer and the round: write, toss, shake, reach, suspense, reveal. |
| `js/settings.js` | Defaults and saved settings. |
| `sw.js`, `manifest.webmanifest` | Offline cache and home-screen install. |
