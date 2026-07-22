# Dungeon Command Menu Prototype

The reusable implementation is split into two replaceable units:

- `menu/`: command definitions, selection state, and command rendering.
- `controls/`: NDE-style virtual pad and A/B input binding.

`main.js` is prototype-only integration. A production integration can replace its navigation callbacks while retaining the menu and control modules.
