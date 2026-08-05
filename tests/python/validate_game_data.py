#!/usr/bin/env python3
"""Static validation for NDA/NDE JavaScript game data.

This tool deliberately does not execute JavaScript.  It reads the repository's
ES module data definitions and validates the literal values that can be
identified safely with the Python standard library.
"""

from __future__ import annotations

import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
RARITY_COSTS = {"C": 1, "R": 2, "SR": 4, "L": 6, "Z": 8}
NEGATIVE_FORBIDDEN = {
    "hp", "maxHp", "sp", "maxSp", "attack", "atk", "def", "cost", "spCost",
    "baseHealing", "spellPower", "hitCount", "powerPerHit",
}

DATA_FILES = [
    Path("data/classes.js"),
    Path("data/bosses.js"),
    Path("data/enemies.js"),
    Path("data/equipment.js"),
    Path("data/items.js"),
    Path("data/npcs.js"),
    Path("data/skills.js"),
    Path("data/spells.js"),
    Path("data/status-effects.js"),
    Path("data/town.js"),
    Path("data/traps.js"),
    Path("data/weapons.js"),
]
CARD_FILES = [
    Path("prototype/card-system/cards/common/cards.js"),
    Path("prototype/card-system/cards/rare/cards.js"),
    Path("prototype/card-system/cards/super-rare/cards.js"),
    Path("prototype/card-system/cards/legendary/cards.js"),
    Path("prototype/card-system/cards/zodiac/cards.js"),
]
JSON_GLOBS = ("data/**/*.json", "prototype/**/*.json")


@dataclass
class Finding:
    status: str
    message: str
    file: Path | None = None
    record_id: str | None = None
    field: str | None = None
    actual: Any = None
    expected: Any = None
    reason: str | None = None


class Validator:
    def __init__(self) -> None:
        self.findings: list[Finding] = []
        self.files_checked: set[Path] = set()
        self.texts: dict[Path, str] = {}
        self.records: dict[Path, list[dict[str, Any]]] = {}

    def report(self, status: str, message: str, **details: Any) -> None:
        self.findings.append(Finding(status, message, **details))

    def load_text(self, relative: Path) -> str | None:
        path = ROOT / relative
        try:
            text = path.read_text(encoding="utf-8")
        except FileNotFoundError:
            self.report(
                "WARN", "検証対象ファイルが見つかりません",
                file=relative, expected="existing UTF-8 file",
                reason="ファイルが追加・移動された可能性があります",
            )
            return None
        except (OSError, UnicodeError) as exc:
            self.report(
                "FAIL", "検証対象ファイルを読み込めません",
                file=relative, actual=str(exc), expected="readable UTF-8 file",
                reason="UTF-8またはファイルアクセスを確認してください",
            )
            return None
        self.files_checked.add(relative)
        self.texts[relative] = text
        return text

    def run(self) -> int:
        for relative in DATA_FILES + CARD_FILES:
            text = self.load_text(relative)
            if text is not None:
                self.records[relative] = extract_literal_records(text)

        self.validate_json_files()
        self.validate_ids()
        self.validate_core_schemas()
        self.validate_numbers()
        self.validate_references()
        self.validate_asset_paths()
        self.validate_cards()
        self.report_skips()
        self.print_report()
        return 1 if any(item.status == "FAIL" for item in self.findings) else 0

    def validate_json_files(self) -> None:
        json_paths = sorted({
            path for pattern in JSON_GLOBS for path in ROOT.glob(pattern)
            if path.is_file()
        })
        if not json_paths:
            self.report("SKIP", "JSONゲームデータ", reason="現在のゲームデータはJavaScript ES Modulesで管理されています")
            return
        for path in json_paths:
            relative = path.relative_to(ROOT)
            try:
                json.loads(path.read_text(encoding="utf-8"))
                self.files_checked.add(relative)
                self.report("PASS", "JSON構文", file=relative)
            except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                self.report("FAIL", "JSON構文", file=relative, actual=str(exc), expected="valid UTF-8 JSON")

    def validate_ids(self) -> None:
        collections: dict[str, list[tuple[Path, dict[str, Any]]]] = {}
        for relative in DATA_FILES:
            records = self.records.get(relative, [])
            for collection_name, collection_records in id_collections(relative, records).items():
                collections.setdefault(collection_name, []).extend(
                    (relative, record) for record in collection_records
                )
        for relative in CARD_FILES:
            collections.setdefault("cards", []).extend(
                (relative, record) for record in self.records.get(relative, [])
                if record.get("rarity") in RARITY_COSTS
            )

        duplicates: list[tuple[str, str, list[Path]]] = []
        for collection_name, entries in collections.items():
            occurrences: dict[str, list[Path]] = {}
            for relative, record in entries:
                record_id = record.get("id")
                if isinstance(record_id, str):
                    occurrences.setdefault(record_id, []).append(relative)
            duplicates.extend(
                (collection_name, record_id, paths)
                for record_id, paths in occurrences.items()
                if len(paths) > 1
            )

        if duplicates:
            for collection_name, record_id, paths in sorted(duplicates):
                self.report(
                    "FAIL", "IDの重複", file=paths[0], record_id=record_id,
                    actual=[path.as_posix() for path in paths], expected="unique ID",
                    reason=f"同一データコレクション「{collection_name}」内でIDは一意である必要があります",
                )
        else:
            self.report("PASS", "各データコレクション内のIDに重複はありません")

    def validate_core_schemas(self) -> None:
        schemas = {
            Path("data/bosses.js"): ("ボス", ("id", "name", "image", "maxHp", "stats", "def", "attack", "experienceReward")),
            Path("data/enemies.js"): ("敵", ("id", "name", "image", "maxHp", "stats", "def", "attack", "experienceReward")),
            Path("data/weapons.js"): ("武器", ("id", "name", "type", "attack")),
            Path("data/classes.js"): ("職業", ("id", "name", "maxHp", "maxSp", "stats", "initialSkillIds")),
            Path("data/skills.js"): ("戦技", ("id", "name", "spCost")),
            Path("data/spells.js"): ("呪文・奇蹟", ("id", "name", "spCost")),
            Path("data/npcs.js"): ("NPC", ("id", "name", "image")),
            Path("data/items.js"): ("アイテム", ("id", "name", "category", "usableIn", "effects", "maxOwned")),
        }
        for relative, (label, required) in schemas.items():
            records = relevant_records(relative, self.records.get(relative, []))
            if not records:
                self.report("SKIP", f"{label}の必須項目", file=relative, reason="静的なデータレコードを抽出できませんでした")
                continue
            failures_before = self.failure_count
            for record in records:
                for field in required:
                    if field not in record:
                        self.report(
                            "FAIL", f"{label}の必須項目がありません",
                            file=relative, record_id=record.get("id"), field=field,
                            actual="missing", expected="defined value",
                        )
            if self.failure_count == failures_before:
                self.report("PASS", f"{label}の必須項目", file=relative)

    def validate_numbers(self) -> None:
        checked = 0
        failures_before = self.failure_count
        for relative, records in self.records.items():
            for record in records:
                for field, value in record.items():
                    if field not in NEGATIVE_FORBIDDEN:
                        continue
                    checked += 1
                    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                        self.report(
                            "FAIL", "数値項目の型が不正です", file=relative,
                            record_id=record.get("id"), field=field, actual=value,
                            expected="finite number",
                        )
                    elif value < 0:
                        self.report(
                            "FAIL", "負数を許可しない数値項目です", file=relative,
                            record_id=record.get("id"), field=field, actual=value,
                            expected="0以上", reason="HP、SP、攻撃力、DEF、コスト等は負数にできません",
                        )
        if checked and self.failure_count == failures_before:
            self.report("PASS", f"数値型と非負数（{checked}項目）")

    def validate_references(self) -> None:
        skill_ids = ids_from(self.records, Path("data/skills.js")) | ids_from(self.records, Path("data/spells.js"))
        status_ids = ids_from(self.records, Path("data/status-effects.js"))
        weapon_ids = {
            record["id"] for record in relevant_records(Path("data/weapons.js"), self.records.get(Path("data/weapons.js"), []))
        }
        class_ids = {
            record["id"] for record in relevant_records(
                Path("data/classes.js"),
                self.records.get(Path("data/classes.js"), []),
            )
        }

        class_text = self.texts.get(Path("data/classes.js"), "")
        class_refs = re.findall(r"initialSkillIds\s*:\s*Object\.freeze\(\[([^\]]*)\]\)", class_text)
        missing_skills = []
        for group in class_refs:
            for skill_id in re.findall(r'["\']([^"\']+)["\']', group):
                if skill_id not in skill_ids:
                    missing_skills.append(skill_id)
        self._reference_result("職業から初期スキルへの参照", Path("data/classes.js"), missing_skills)

        missing_statuses = []
        for relative in (Path("data/skills.js"), Path("data/spells.js")):
            text = self.texts.get(relative, "")
            for status_id in re.findall(r'\bstatusId\s*:\s*["\']([^"\']+)["\']', text):
                if status_id not in status_ids:
                    missing_statuses.append(status_id)
        self._reference_result("スキルから状態効果への参照", Path("data/skills.js"), missing_statuses)

        equipment_text = self.texts.get(Path("data/equipment.js"), "")
        equipment_ids = set(re.findall(r'\bitem\(\s*["\']([^"\']+)', equipment_text))
        loadout_refs = re.findall(r'\bloadout\(([^)]*)\)', equipment_text)
        missing_equipment = []
        for arguments in loadout_refs:
            refs = re.findall(r'["\']([^"\']+)["\']', arguments)
            if not refs:
                continue
            if refs[0] not in weapon_ids:
                missing_equipment.append(refs[0])
            missing_equipment.extend(ref for ref in refs[1:] if ref not in equipment_ids)
        self._reference_result("初期装備IDの参照", Path("data/equipment.js"), missing_equipment)

        town_job_ids = {
            record["id"] for record in self.records.get(Path("data/town.js"), [])
            if "labelJa" in record or "labelEn" in record
        }
        missing_classes = sorted(town_job_ids - class_ids)
        self._reference_result("町の登録職業IDから職業データへの参照", Path("data/town.js"), missing_classes)

    def _reference_result(self, label: str, relative: Path, missing: list[str]) -> None:
        if missing:
            for record_id in sorted(set(missing)):
                self.report(
                    "FAIL", label, file=relative, record_id=record_id,
                    actual="missing reference target", expected="existing ID",
                )
        else:
            self.report("PASS", label, file=relative)

    def validate_asset_paths(self) -> None:
        fields_checked = 0
        for relative, text in self.texts.items():
            for field, asset in re.findall(
                r'\b(image|icon|background|portrait)\s*:\s*["\']([^"\']+)["\']', text
            ):
                if not looks_like_path(asset):
                    continue
                fields_checked += 1
                normalized = asset.split("?", 1)[0].replace("\\", "/")
                target = ROOT / Path(normalized)
                if not target.is_file():
                    self.report(
                        "FAIL", "画像・アイコンのパスが存在しません",
                        file=relative, field=field, actual=asset,
                        expected=f"existing path under {ROOT.name}",
                    )
        if fields_checked and not any(
            item.status == "FAIL" and item.message == "画像・アイコンのパスが存在しません"
            for item in self.findings
        ):
            self.report("PASS", f"画像・背景パス（{fields_checked}件）")
        elif not fields_checked:
            self.report("SKIP", "画像・アイコンのパス", reason="パス形式の静的フィールドを検出できませんでした")

    def validate_cards(self) -> None:
        card_records = []
        for relative in CARD_FILES:
            for record in self.records.get(relative, []):
                if record.get("rarity") in RARITY_COSTS and isinstance(record.get("id"), str):
                    card_records.append((relative, record))
        zodiac_relative = Path("prototype/card-system/cards/zodiac/cards.js")
        zodiac_text = self.texts.get(zodiac_relative, "")
        if not any(record.get("rarity") == "Z" for _, record in card_records):
            # Zodiac IDs are template literals produced from a compact tuple
            # table, so synthesize their statically knowable values without
            # executing the module.
            zodiac_names = re.findall(
                r'^\s*\[\s*["\']([a-z]+)["\']\s*,',
                zodiac_text,
                re.MULTILINE,
            )
            rarity_match = re.search(r'\brarity\s*:\s*["\']([^"\']+)["\']', zodiac_text)
            cost_match = re.search(r'\bdefaultCost\s*:\s*(\d+(?:\.\d+)?)', zodiac_text)
            if zodiac_names and rarity_match and cost_match:
                rarity = rarity_match.group(1)
                cost_number = float(cost_match.group(1))
                cost: int | float = int(cost_number) if cost_number.is_integer() else cost_number
                card_records.extend((
                    zodiac_relative,
                    {"id": f"zodiac_{name}", "rarity": rarity, "cost": cost},
                ) for name in zodiac_names)
        if not card_records:
            self.report("SKIP", "カードのレアリティとコスト", reason="カードデータが未実装です")
            self.report("SKIP", "Zカード全12種類", reason="Zカードデータが未実装です")
            return

        failures_before = self.failure_count
        for relative, record in card_records:
            rarity = record["rarity"]
            expected = RARITY_COSTS[rarity]
            if record.get("cost") != expected:
                self.report(
                    "FAIL", "カードのコストがレアリティ仕様と一致しません",
                    file=relative, record_id=record["id"], field="cost",
                    actual=record.get("cost"), expected=expected,
                    reason=f"{rarity}カードのコストは{expected}です",
                )
        if self.failure_count == failures_before:
            self.report("PASS", f"カードのレアリティ別コスト（{len(card_records)}枚）")

        zodiac = [(relative, record) for relative, record in card_records if record["rarity"] == "Z"]
        zodiac_ids = [record["id"] for _, record in zodiac]
        if len(zodiac) != 12:
            self.report(
                "FAIL", "Zカードの種類数", file=Path("prototype/card-system/cards/zodiac/cards.js"),
                actual=len(zodiac), expected=12, reason="Zカードは全12種類です",
            )
        elif len(set(zodiac_ids)) != 12:
            self.report(
                "FAIL", "ZカードIDの重複", file=Path("prototype/card-system/cards/zodiac/cards.js"),
                actual=zodiac_ids, expected="12 unique IDs",
            )
        elif all(record.get("cost") == 8 for _, record in zodiac):
            self.report("PASS", "Zカードは12種類・ID一意・コスト8です")

    def report_skips(self) -> None:
        self.report("SKIP", "カードの画像・アイコン実体", reason="カードはiconIdと描画関数レジストリを使用するため、単純なファイルパス検証の対象外です")
        self.report("SKIP", "ダンジョン生成結果の到達率・分布", file=Path("js/dungeon.js"), reason="ランダム生成を実行した結果が必要なため、JavaScript側からJSON出力する集計ブリッジが必要です")

    @property
    def failure_count(self) -> int:
        return sum(item.status == "FAIL" for item in self.findings)

    def print_report(self) -> None:
        print("NDE Data Validation")
        print("===================")
        for item in self.findings:
            location = f" [{item.file.as_posix()}]" if item.file else ""
            print(f"{item.status}: {item.message}{location}")
            if item.record_id is not None:
                print(f"ID: {item.record_id}")
            if item.field is not None:
                print(f"Field: {item.field}")
            if item.actual is not None:
                print(f"Actual: {item.actual}")
            if item.expected is not None:
                print(f"Expected: {item.expected}")
            if item.reason:
                print(f"Reason: {item.reason}")
            print()

        counts = {status: sum(item.status == status for item in self.findings) for status in ("PASS", "WARN", "FAIL", "SKIP")}
        print(f"Files checked: {len(self.files_checked)}")
        print(f"Passed: {counts['PASS']}")
        print(f"Warnings: {counts['WARN']}")
        print(f"Failed: {counts['FAIL']}")
        print(f"Skipped: {counts['SKIP']}")


def extract_literal_records(text: str) -> list[dict[str, Any]]:
    """Extract object literals with a direct, literal ``id`` property."""
    records = []
    for start, end in brace_ranges(text):
        body = text[start + 1:end]
        masked = mask_nested(body)
        id_match = re.search(r'\bid\s*:\s*(["\'])(.*?)\1', masked, re.DOTALL)
        if not id_match:
            continue
        record: dict[str, Any] = {"id": id_match.group(2)}
        for match in re.finditer(
            r'\b([A-Za-z_$][\w$]*)\s*:\s*'
            r'(?:(["\'])(.*?)\2|(-?(?:\d+(?:\.\d*)?|\.\d+))\b|\b(true|false|null)\b)',
            masked, re.DOTALL,
        ):
            key = match.group(1)
            if match.group(2):
                value: Any = match.group(3)
            elif match.group(4):
                number = float(match.group(4))
                value = int(number) if number.is_integer() else number
            else:
                value = {"true": True, "false": False, "null": None}[match.group(5)]
            record[key] = value
        for key in ("stats", "initialSkillIds", "usableIn", "effects"):
            if re.search(rf"\b{key}\s*:", masked):
                record.setdefault(key, "<compound>")
        records.append(record)
    return records


def brace_ranges(text: str) -> Iterable[tuple[int, int]]:
    stack: list[int] = []
    quote: str | None = None
    escaped = False
    line_comment = False
    block_comment = False
    index = 0
    while index < len(text):
        char = text[index]
        nxt = text[index + 1] if index + 1 < len(text) else ""
        if line_comment:
            if char == "\n":
                line_comment = False
        elif block_comment:
            if char == "*" and nxt == "/":
                block_comment = False
                index += 1
        elif quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char == "/" and nxt == "/":
            line_comment = True
            index += 1
        elif char == "/" and nxt == "*":
            block_comment = True
            index += 1
        elif char in ('"', "'", "`"):
            quote = char
        elif char == "{":
            stack.append(index)
        elif char == "}" and stack:
            yield stack.pop(), index
        index += 1


def mask_nested(body: str) -> str:
    chars = list(body)
    depth = 0
    quote: str | None = None
    escaped = False
    for index, char in enumerate(chars):
        if quote:
            if depth:
                chars[index] = " "
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in ('"', "'", "`"):
            quote = char
            if depth:
                chars[index] = " "
        elif char in "{[(":
            depth += 1
            chars[index] = " "
        elif char in "}])":
            chars[index] = " "
            depth = max(0, depth - 1)
        elif depth:
            chars[index] = " "
    return "".join(chars)


def relevant_records(relative: Path, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if relative in (Path("data/enemies.js"), Path("data/bosses.js")):
        # Enemy objects can contain nested action objects with their own IDs.
        # Only records carrying an enemy-level combat field belong to the
        # exported enemy collection.
        return [
            record for record in records
            if any(field in record for field in ("maxHp", "image", "experienceReward"))
        ]
    if relative == Path("data/weapons.js"):
        return [record for record in records if "attack" in record]
    if relative == Path("data/classes.js"):
        return [record for record in records if "maxHp" in record]
    if relative in (Path("data/skills.js"), Path("data/spells.js")):
        return [record for record in records if "spCost" in record]
    if relative == Path("data/items.js"):
        return [record for record in records if "maxOwned" in record]
    return records


def ids_from(records: dict[Path, list[dict[str, Any]]], relative: Path) -> set[str]:
    return {
        record["id"] for record in records.get(relative, [])
        if isinstance(record.get("id"), str)
    }


def id_collections(
    relative: Path,
    records: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Return independent ID namespaces defined in one data module."""
    if relative == Path("data/town.js"):
        return {
            "town facilities": [
                record for record in records
                if "background" in record or "keeper" in record
            ],
            "character registration jobs": [
                record for record in records
                if "labelJa" in record or "labelEn" in record
            ],
        }
    if relative == Path("data/weapons.js"):
        return {
            "weapon types": [record for record in records if "attack" not in record],
            "weapons": [record for record in records if "attack" in record],
        }
    if relative == Path("data/items.js"):
        return {
            "items": [record for record in records if "maxOwned" in record],
        }
    if relative == Path("data/enemies.js"):
        return {
            "enemies": relevant_records(relative, records),
        }
    return {relative.as_posix(): records}


def looks_like_path(value: str) -> bool:
    return "/" in value and bool(re.search(r"\.(?:avif|png|jpe?g|webp|svg|gif)$", value, re.IGNORECASE))


def main() -> int:
    try:
        return Validator().run()
    except Exception as exc:  # Last-resort readable failure for development use.
        print("NDE Data Validation")
        print("===================")
        print("FAIL: validator")
        print(f"Actual: {type(exc).__name__}: {exc}")
        print("Expected: validation completes without an internal error")
        print("Reason: validate_game_data.py自体の処理を確認してください")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
