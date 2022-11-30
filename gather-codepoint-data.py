from fontTools.ttLib import TTFont
import glob
from collections import defaultdict
from youseedee import ucd_data, database
from os.path import basename
import json

font_files = {}
noto_codepoints = defaultdict(list)

sources = [
    "notofonts.github.io/*/ttf/*/*Regular.?tf",
    "noto-cjk/Sans/OTF/*/*Regular.?tf",
    "noto-emoji/fonts/NotoColorEmoji.ttf"
]
for source in sources:
    for fontfile in glob.glob(source):
        font = TTFont(fontfile)
        font_name = font["name"].getDebugName(1).replace("Noto ", "")
        font_files[font_name] = fontfile
        for k in font.getBestCmap().keys():
            noto_codepoints[k].append(font_name)

def fontsort(font):
    if font in ["Arimo", "Tinos", "Cousine"]:
        return 'ZZZ'+font
    return font

block_ranges = sorted(database["Blocks.txt"]["reader"]("Blocks.txt"), key=lambda b:b[0])
blocks = []
for ix, (start, end, name) in enumerate(block_ranges):
    if (
        "Private Use Area" in name
        or "Surrogates" in name
        or "Variation Selectors" in name
        or name == "Tags"
    ):
        continue
    print("Processing %s" % name)
    coverage = "all"
    has_some = False
    cps = {}
    summary = ""
    for cp in range(start, end + 1):
        ucd = ucd_data(cp)
        if "Age" not in ucd:  # Unassigned
            summary += "X"
            continue
        cps[cp] = {"age": ucd["Age"]}
        if "Name" in ucd:
            cps[cp]["name"] = ucd["Name"]
        if ucd.get("General_Category", "") == "Cc" or cp == 32:
            cps[cp]["special"] = True
            summary += "S"
            continue
        if cp not in noto_codepoints:
            summary += "0"
            coverage = "partial"
        if cp in noto_codepoints and noto_codepoints[cp]:
            has_some = True
            cps[cp]["fonts"] = list(sorted(noto_codepoints[cp], key=fontsort))
            if len(noto_codepoints[cp]) > 1:
                summary += "M"
            else:
                summary += "1"
    if not has_some:
        coverage = "none"
    this_block = {
        "name": name,
        "start": start,
        "end": end,
        "coverage": coverage,
        "cps": cps,
    }
    ages = [cp["age"] for cp in cps.values()]
    if all(a == ages[0] for a in ages):
        this_block["age"] = ages[0]
        for cp in cps.values():
            del cp["age"]
    if coverage == "all":
        fontset = [cp["fonts"] for cp in cps.values() if "fonts" in cp]
        if all(f == fontset[0] for f in fontset[1:]):
            this_block["fonts"] = fontset[0]
            for cp in this_block["cps"].values():
                del cp["fonts"]
    json.dump(this_block, open("blocks/block-%03i.json" % ix, "w"))
    summary_block = {
        "ix": ix,
        "name": name,
        "start": start,
        "end": end,
        "coverage": coverage,
        "summary": summary,
    }
    blocks.append(summary_block)

json.dump(blocks, open("blocks.json", "w"))
json.dump(font_files, open("fontfiles.json", "w"))
