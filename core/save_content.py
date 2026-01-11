import os
import subprocess
import sys
import datetime

# ==========================================
# GITHUB SYNC SCRIPT
# ==========================================
# This script emulates the "Save" functionality from the old CMS.
# It performs a git pull (to sync remote changes) and then a git push.

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_git_command(args, cwd=REPO_ROOT):
    try:
        result = subprocess.run(
            ['git'] + args,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False
        )
        if result.returncode != 0:
            print(f"⚠️ Git Error ({' '.join(args)}): {result.stderr.strip()}")
            return False, result.stderr.strip()
        
        print(f"✅ Git Success ({' '.join(args)}): {result.stdout.strip()}")
        return True, result.stdout.strip()
    except Exception as e:
        print(f"🔥 Critical Error: {e}")
        return False, str(e)

def main():
    print("--- 🔄 STARTING ADMIN CONTENT SYNC ---")
    
    # 1. Pull Changes (Rebase to keep history clean)
    print("1. Pulling latest changes from remote...")
    success, output = run_git_command(['pull', '--rebase', 'origin', 'main'])
    if not success:
        print("   -> Pull failed. Attempting standard pull...")
        run_git_command(['pull', 'origin', 'main'])

    # 2. Add Changes
    print("2. Staging local changes...")
    run_git_command(['add', '.'])

    # 3. Commit
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"3. Committing updates ({timestamp})...")
    run_git_command(['commit', '-m', f"Admin Panel Update: {timestamp}"])

    # 4. Push
    print("4. Pushing to remote...")
    success, output = run_git_command(['push', 'origin', 'main'])
    
    if success:
        print("--- ✅ SYNC COMPLETE: Content is live on GitHub ---")
    else:
        print("--- ❌ SYNC FAILED: Check console logs ---")
        # Ensure we exit with non-zero if push failed, so calling process knows
        sys.exit(1)

if __name__ == "__main__":
    main()
