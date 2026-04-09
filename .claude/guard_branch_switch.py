import json, sys, re, subprocess

data = json.load(sys.stdin)
cmd = data.get("tool_input", {}).get("command", "")

# Match branch creation / switching commands:
#   git checkout -b <name>
#   git switch [-c] <name>
#   git checkout <branch>  (but not `git checkout -- <file>`)
is_branch_op = bool(
    re.search(r'\bgit\s+checkout\b.*\B-b\b', cmd) or
    re.search(r'\bgit\s+switch\b', cmd) or
    (re.search(r'\bgit\s+checkout\b', cmd) and '--' not in cmd)
)

if not is_branch_op:
    sys.exit(0)

# Check for untracked or modified-but-not-staged files
result = subprocess.run(
    ["git", "status", "--porcelain"],
    capture_output=True, text=True,
    cwd="D:/CodeSpace/HomeBoard"
)

dirty = [
    line for line in result.stdout.splitlines()
    if len(line) >= 2 and line[1] != ' '  # Y != ' ' covers both unstaged changes and ??
]

if dirty:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                "Cannot create or switch branches: working tree has untracked or "
                "modified-but-not-staged files. Stage or stash your changes first.\n"
                "Dirty files:\n" + "\n".join(f"  {l}" for l in dirty[:10])
            )
        }
    }))
