import json
from collections import Counter

blocks = json.load(open("blocks.json"))
incomplete = [x for x in blocks if x["coverage"] != "all"]
by_age = Counter()
total_gaps = 0
print("By block:")
for i in incomplete:
    this_block = json.load(open("blocks/block-%03i.json" % i["ix"]))
    missing = {k: v for k, v in this_block["cps"].items() if "fonts" not in v}
    mini_by_age = Counter()
    for cp, info in missing.items():
        age = info.get("age", this_block.get("age"))
        name = info.get("name")
        by_age[age] += 1
        mini_by_age[age] += 1
        total_gaps += 1

    if len(mini_by_age) == 1:
        print("  %s (%s): %i" % (i["name"], age, len(missing)))
    else:
        sorted_by_age = sorted(list(mini_by_age.keys()), key=lambda x: float(x))
        ages = ", ".join("%s: %i" % (age, mini_by_age[age]) for age in sorted_by_age)
        print("  %s: %i (%s)" % (i["name"], len(missing), ages))

    if len(missing) < 200 and this_block["coverage"] != "none":
        for cp, info in missing.items():
            name = info.get("name")
            age = info.get("age", this_block.get("age"))
            if name and "CJK" not in name:
                if len(mini_by_age) > 1:
                    print("    U+%04X: %s (%s)" % (int(cp), name, age))
                else:
                    print("    U+%04X: %s" % (int(cp), name))

print("\nBy age:")
for age in sorted(list(by_age.keys()), key=lambda x: float(x)):
    print("  %s: %i" % (age, by_age[age]))

print("\nTotal gaps: %i" % total_gaps)
