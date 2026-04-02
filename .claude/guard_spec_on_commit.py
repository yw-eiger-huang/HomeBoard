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
    sys.exit(0)

# When a function spec (YYYYMMDD.md) is staged, its design spec (YYYYMMDD.design.md) must also be staged.
func_spec_dates = {
    re.search(r'(\d{8})\.md$', f).group(1)
    for f in staged
    if re.search(r'Spec[/\\]\d{8}\.md$', f)
}
design_spec_dates = {
    re.search(r'(\d{8})\.design\.md$', f).group(1)
    for f in staged
    if re.search(r'Spec[/\\]\d{8}\.design\.md$', f)
}
missing = func_spec_dates - design_spec_dates
if missing:
    dates_str = ", ".join(sorted(missing))
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"Function spec(s) for {dates_str} are staged but the corresponding "
                f"design spec(s) (Spec/{dates_str}.design.md) are not. "
                "Update the design spec to reflect the function spec changes before committing."
            )
        }
    }))
