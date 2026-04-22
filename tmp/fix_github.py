#!/usr/bin/env python3
import sys

# Read github_env.txt and parse vars
github_vars = {}
with open("/root/appwrite/github_env.txt", "r") as f:
    for line in f:
        line = line.strip()
        if line.startswith("_APP_VCS_GITHUB") and "=" in line:
            key, val = line.split("=", 1)
            github_vars[key] = val

# Read current .env
with open("/root/appwrite/.env", "r") as f:
    lines = f.readlines()

new_lines = []
skip_key = False
for line in lines:
    stripped = line.rstrip("\n")
    # Skip old private key continuation lines
    if skip_key:
        if stripped.startswith("_") or stripped == "":
            skip_key = False
        else:
            continue
    # Replace github vars
    replaced = False
    for key, val in github_vars.items():
        if stripped.startswith(key + "=") or stripped.startswith(key + '="'):
            if "PRIVATE_KEY" in key:
                new_lines.append(key + "=" + val)
                skip_key = True
            else:
                new_lines.append(key + "=" + val)
            replaced = True
            break
    if not replaced:
        new_lines.append(stripped)

with open("/root/appwrite/.env", "w") as f:
    f.write("\n".join(new_lines))

print("DONE - Updated vars:")
for k, v in github_vars.items():
    print("  " + k + "=" + v[:40] + "...")
