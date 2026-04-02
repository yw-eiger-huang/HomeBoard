import json, sys, os, re

data = json.load(sys.stdin)
fp = data.get("tool_input", {}).get("file_path", "")

# Match Spec/YYYYMMDD.md
if re.search(r'[/\\]Spec[/\\](\d{8})\.md$', fp):
    # Only block if the file does not already exist (i.e. creating a new one)
    if not os.path.exists(fp):
        date_str = re.search(r'(\d{8})\.md$', fp).group(1)
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    f"You are about to create a new spec file '{os.path.basename(fp)}'. "
                    f"Per CLAUDE.md rules, you must first ask the user whether to create "
                    f"a new dated file or update the existing highest-dated spec file."
                )
            }
        }))
