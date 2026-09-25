# Special maps — Phase 2B

Scope: share and manage Phase 2A map originals. No dungeon generation, entry, rewards, sessions or quest integration.

- `NDA16:` + unpadded canonical Base64URL, maximum 34 characters. ASCII spaces, tabs and CR/LF are ignored; case, hyphens and underscores are preserved.
- Binary format: code version u8 = 1; rules u8 = 0x80; seed u16 big endian; signature length u8 (1–4 BMP code units); normalized signature UTF-16BE; 8-byte tag.
- Rule byte 0x80 refers specifically to the frozen `phase2a-1` provisional name/Lv rules. Formal V1 must receive another rule identifier; never reinterpret these codes as future generated dungeons.
- Tag: first 8 bytes of HMAC-SHA256 with map-only public client key and purpose prefix. Detects casual corruption; does not authenticate a person or prevent deliberate forgery/seed enumeration. Uses the existing tested HMAC primitive without reusing the save key.
- Identity remains rules + seed + normalized discoverer; content identity excludes discoverer. Owner metadata never enters a code.
- Full duplicate registration precedes capacity checking and preserves existing metadata. Same content with another discoverer requires confirmation. New imports have acquisitionMethod `shared`; Phase 2A and self-discovered maps default to `discovered`.
- Delete and favorite changes use the same character snapshot transaction as appraisal. Favorite maps must be unfavorited before deletion. New import after deletion starts with empty ownership records.
- Clipboard writes begin directly in the activation handler. Visible read-only code is always available if permission/API fails.
- Forms opt in to gamepad input while focused. Up/down select input, submit, back; A focuses/executes, B returns. Text entry uses keyboard/OS input. Other game text fields retain gamepad suppression.
- Shared imports do not need a current signature: B can skip the initial signature screen and reach the tent. Appraisal prompts for setup when needed.

Validation: code round trips and canonical encodings, single-character corruption, independent Node HMAC oracle, boundaries, full duplicates, cross-save discoverer retention, same-content confirmation, failure rollback, favorite deletion guard, UI paging after deletion, touch handlers, focused gamepad polling. Browser QA uses the real UI module and production CSS with isolated in-memory fixtures at 390px; device hardware and iOS clipboard behavior still require real-device confirmation.
