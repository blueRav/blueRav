from pathlib import Path
import subprocess
import sys
root = Path(__file__).resolve().parents[1]
projects = sorted((root / "python").iterdir())
count = 0
for project in projects:
    candidate = project / "backend" if (project / "backend" / "tests").is_dir() else project
    if (candidate / "tests").is_dir():
        print("\nTesting " + project.name, flush=True)
        subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
                       cwd=candidate, check=True)
        count += 1
print(f"Verified {count} Python projects.")
