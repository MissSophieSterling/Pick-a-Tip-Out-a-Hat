# Pick a Tip Out of a Hat

A small mobile game for tipping your Dasher. Delivered per instructions? Then the tip gets picked out of a red ball cap, with a hand that looks different every session, a nervous clock, a rising Shepard tone, and a celebration when the number lands.

It is a web app that installs to a phone's home screen (a PWA), so there is nothing to sideload and no app store. Open it in the phone's browser, add it to the home screen, and it runs full screen and offline.

## Play it

1. Host the folder anywhere that serves static files (GitHub Pages is set up below), or open `index.html` from a local server.
2. On iPhone: open the link in Safari, tap Share, then "Add to Home Screen". On Android: open it in Chrome and tap "Install app" or "Add to Home screen".
3. Tap the hat icon. Sound starts after the first tap, which is how phone browsers work.

### How a round goes

Tap **Draw a tip**. A receipt slides up first: type what the food cost (before tax, fees and delivery) into the subtotal line and hit Continue. The hand then writes the amounts on slips, tosses them in the cap, shakes it for a random stretch, reaches in and pulls one out. The slip is held for a random, anxious moment while the clock ticks, then it is revealed. The win screen says what share of the order the tip is.

On a win the screen signs off with a layered **THANK YOU FOR YOUR SERVICE!** that squeezes and stretches, holds still while firecrackers shoot up from behind the tip, and goes again a few times. The button under it starts another delivery.

Besides the dollar slips the hat holds a **Wild Card** (the Dasher names the tip), **blank slips** that send the hand back in, and **bonus slips** worth 1 to 3 extra draws. After a bonus slip the Dasher can keep any amount that comes up or draw again; the last draw is final, even if it is smaller.

### Default amounts

Every dollar from $1 to $35, then 40, 45, 50, 60, 70, 80, 90 and 100 (43 amounts), plus 1 wild card, 5 blank slips and 3 bonus slips. All of this is editable.

### How the order total weights the hat

The maths lives in `js/tipmath.js`, on its own, with no interface, animation or audio in it. The order total T is turned into integer cents C and every comparison is done in cents, so there is no floating-point drift at the boundaries.

Each eligible amount A (tipCents = A × 100) falls into exactly one group:

- **Preferred** (80% between them, equal shares): 10% to 20% of the order, both ends included. In cents: `tipCents × 10 >= C` and `tipCents × 5 <= C`.
- **High outlier** (1% between them): `A >= 40` and A is more than 20% of the order (`tipCents × 5 > C`). Inside the group each amount is weighted `1 / A²`, so $40 is 6.25 times as likely as $100.
- **Ordinary** (19% between them, equal shares): everything else. Ordinary amounts do not get rarer the further they sit from the preferred range.

Which group an amount lands in depends on the order: $100 is an outlier on a $50 order and preferred on a $600 one.

When a group is empty its share moves on, in this order: no preferred amounts, the 80% goes to ordinary; no outliers, the 1% goes to ordinary; no ordinary amounts, their share goes to preferred if there are any, otherwise to the outliers. The probabilities are then normalised to sum to 1. Every eligible amount keeps a positive chance for every order total.

Worked example, a $50 order: $5 to $10 are preferred (six amounts, about 13.33% each); 29 ordinary amounts share 19% (about 0.655% each); $40 to $100 are the eight outliers sharing 1%.

The draw itself: one uniform random number U from `crypto.getRandomValues`, walked through preferred, ordinary and outlier amounts in that order (ascending within each), picking the first whose cumulative probability exceeds U. `TipMath.select` takes an injected random source for deterministic tests. The result is chosen once, before the animation starts; nothing in the animation, hand, sound or reveal can change it.

The wild card, blank and bonus slips sit in the hat beside the money slips: each takes one slot, so the chance of pulling a special slip is `specials / (amounts + specials)`, and a special slip leaves the hat once drawn.

Run the tests with `npm test` (Node 18 or newer, no dependencies). They cover the inclusive boundaries, invalid input, empty preferred and outlier groups, normalisation, the ordering, deterministic selection and the $50 example.

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

The app ships with two looks. The default follows the Ember & Espresso design system below. The first design, bright and glossy with emoji and neon celebrations, is kept as the "party" look and is hidden behind an Easter egg: in Settings, set the tip amounts to only 7 and 11. Balloons float up, a crowd of kids cheers, and the party look appears. From then on a "Look" switch in Settings flips between the two, and the theme switch still does light and dark. Once the party look is in, the amounts go back to the full list, so the hat is not left holding just those two.

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
