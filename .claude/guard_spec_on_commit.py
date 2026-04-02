import json, sys, re, subprocess

data = json.load(sys.stdin)
cmd = data.get("tool_input", {}).get("command", "")

# Only intercept git commit commands
if not re.search(r'\bgit\s+commit\b', cmd):
    sys.exit(0)

# Get staged files
result = subprocess.run(
    ["git", "diff", "--cached", "--name-only"],
    capture_output=True, text=True,
    cwd="D:/CodeSpace/HomeBoard"
)
staged = result.stdout.splitlines()

has_code = any(f.startswith("Code/") for f in staged)
has_spec = any(f.startswith("Spec/") for f in staged)

if has_code and not has_spec:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                "Code files are staged but no Spec file is included. "
                "Update the latest Spec/*.md to reflect the changes before committing."
            )
        }
    }))
