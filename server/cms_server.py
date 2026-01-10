import http.server
import socketserver
import os
import json
import subprocess
import base64
import shutil

# CONFIGURATION
PORT = 8000
DIRECTORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Root of 'live cms'
CONFIG_PATH = os.path.join(DIRECTORY, 'data', 'config.json')

# Helper function to find git
def find_git():
    """
    Finds git executable. Returns path if found, None otherwise.
    """
    git_path = shutil.which('git')
    if git_path:
        return git_path
    
    # Common Windows installation paths
    common_paths = [
        r'C:\Program Files\Git\cmd\git.exe',
        r'C:\Program Files (x86)\Git\cmd\git.exe',
        r'C:\Git\cmd\git.exe',
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            return path
    
    return None

class CMSServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        # Parse API endpoints
        if self.path == '/api/save_config':
            self.handle_save_config()
        elif self.path == '/api/deploy':
            self.handle_deploy()
        elif self.path == '/api/sync':
            self.handle_sync()
        elif self.path == '/api/connect':
            self.handle_connect()
        else:
            self.send_error(404, "API Endpoint Not Found")

    def handle_save_config(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            new_config = json.loads(post_data)
            # Validate JSON structure heavily here in real app
            
            with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                json.dump(new_config, f, indent=4)
                
            self.send_json_response({'status': 'success', 'message': 'Config saved successfully.'})
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 500)

    def handle_deploy(self):
        """
        Commits and Pushes changes to GitHub.
        Uses force push to ensure repo contains ONLY CMS files.
        """
        try:
            git_cmd = find_git()
            if not git_cmd:
                raise Exception("Git is not installed. Please install Git first.")
            
            # 1. Add all changes (stages all CMS files)
            subprocess.run([git_cmd, 'add', '.'], cwd=DIRECTORY, check=True, capture_output=True, text=True)
            
            # 2. Commit (may have nothing to commit, that's ok)
            commit_result = subprocess.run([git_cmd, 'commit', '-m', 'CMS Admin Update'], cwd=DIRECTORY, check=False, capture_output=True, text=True)
            
            # 3. Check if we've ever pushed to this remote
            check_result = subprocess.run([git_cmd, 'ls-remote', 'origin', 'main'], cwd=DIRECTORY, capture_output=True, text=True)
            
            # 4. Push with appropriate strategy
            if check_result.returncode != 0 or not check_result.stdout.strip():
                # Remote branch doesn't exist - first push
                result = subprocess.run([git_cmd, 'push', '--set-upstream', 'origin', 'main', '--force'], cwd=DIRECTORY, capture_output=True, text=True)
            else:
                # Remote exists - force push to replace everything
                result = subprocess.run([git_cmd, 'push', '--force'], cwd=DIRECTORY, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.send_json_response({'status': 'success', 'message': 'All CMS files uploaded! Repository now contains only your CMS files.'})
            else:
                # Fallback: try with upstream if normal force push failed
                if 'no upstream branch' in result.stderr:
                    result = subprocess.run([git_cmd, 'push', '--set-upstream', 'origin', 'main', '--force'], cwd=DIRECTORY, capture_output=True, text=True)
                    if result.returncode == 0:
                        self.send_json_response({'status': 'success', 'message': 'All CMS files uploaded! Repository now contains only your CMS files.'})
                    else:
                        self.send_json_response({'status': 'error', 'message': f"Push Failed: {result.stderr}"}, 500)
                else:
                    self.send_json_response({'status': 'error', 'message': f"Push Failed: {result.stderr}"}, 500)
                
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 500)

    def handle_sync(self):
        """
        Pulls latest changes from GitHub.
        """
        try:
            git_cmd = find_git()
            if not git_cmd:
                raise Exception("Git is not installed. Please install Git first.")
            
            result = subprocess.run([git_cmd, 'pull'], cwd=DIRECTORY, capture_output=True, text=True)
            if result.returncode == 0:
                self.send_json_response({'status': 'success', 'message': 'Synced with GitHub successfully!'})
            else:
                self.send_json_response({'status': 'error', 'message': f"Pull Failed: {result.stderr}"}, 500)
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 500)

    def handle_connect(self):
        """
        Configures the local git repo with the provided credentials.
        """
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            # Check if git is available
            git_cmd = find_git()
            if not git_cmd:
                raise Exception("Git is not installed or not in PATH. Please install Git from https://git-scm.com/download/win")
            
            data = json.loads(post_data)
            username = data.get('username')
            repo = data.get('repo')
            token = data.get('token')
            
            if not username or not repo or not token:
                raise Exception("Missing required fields: username, repo, or token")

            # Construct Remote URL (with Auth)
            remote_url = f"https://{username}:{token}@github.com/{username}/{repo}.git"

            # 1. Init Git if not exists
            if not os.path.exists(os.path.join(DIRECTORY, '.git')):
                subprocess.run([git_cmd, 'init'], cwd=DIRECTORY, check=True, capture_output=True, text=True)
                subprocess.run([git_cmd, 'branch', '-M', 'main'], cwd=DIRECTORY, check=True, capture_output=True, text=True)

            # 2. Configure User
            subprocess.run([git_cmd, 'config', 'user.name', username], cwd=DIRECTORY, check=True, capture_output=True, text=True)
            subprocess.run([git_cmd, 'config', 'user.email', f"{username}@users.noreply.github.com"], cwd=DIRECTORY, check=True, capture_output=True, text=True)

            # 3. Set Remote
            # Remove origin if exists to avoid error
            subprocess.run([git_cmd, 'remote', 'remove', 'origin'], cwd=DIRECTORY, check=False, capture_output=True, text=True) 
            subprocess.run([git_cmd, 'remote', 'add', 'origin', remote_url], cwd=DIRECTORY, check=True, capture_output=True, text=True)

            # Note: We DON'T pull here to avoid downloading unwanted files from the repo
            # The first "Upload All" will replace everything in the repo with CMS files only
            
            self.send_json_response({'status': 'success', 'message': f'Connected to {repo}. Ready to upload CMS files. Click "Upload All" to replace repository contents.'})
            
        except subprocess.CalledProcessError as e:
            error_msg = f"Git command failed: {e.stderr if e.stderr else str(e)}"
            self.send_json_response({'status': 'error', 'message': error_msg}, 500)
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 500)

    def send_json_response(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    # Disable Caching for Development
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

def run_server():
    # Ensure we are in the right directory
    os.chdir(DIRECTORY)
    
    print(f"🚀 CMS Server Started at http://localhost:{PORT}")
    print(f"📂 Serving: {DIRECTORY}")
    print("-------------------------------------------------")
    print("Press Ctrl+C to stop.")
    
    with socketserver.TCPServer(("", PORT), CMSServer) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server Stopping...")
            httpd.server_close()

if __name__ == "__main__":
    run_server()
