import json, sys, subprocess

data = json.load(sys.stdin)
fp = data.get("tool_input", {}).get("file_path", "")

if "CLAUDE.md" in fp:
    branch = subprocess.check_output(
        ["git", "branch", "--show-current"], text=True
    ).strip()
    if branch != "main":
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    f"CLAUDE.md may only be modified on the 'main' branch "
                    f"(current branch: '{branch}')."
                )
            }
        }))
