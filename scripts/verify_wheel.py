"""Build artifacts and smoke-test the wheel outside the source checkout."""

import argparse
import os
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--uv", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    backend = root / "backend"
    with tempfile.TemporaryDirectory(prefix="prepare-wheel-") as temp:
        temporary = Path(temp)
        artifacts = temporary / "artifacts"
        subprocess.run(
            [sys.executable, "-m", "build", "--outdir", str(artifacts)],
            cwd=backend,
            check=True,
        )
        wheel = next(artifacts.glob("*.whl"))
        sdist = next(artifacts.glob("*.tar.gz"))
        with zipfile.ZipFile(wheel) as archive:
            assert "prepare_backend/app.py" in archive.namelist()
        with tarfile.open(sdist) as archive:
            assert any(
                name.endswith("/src/prepare_backend/app.py")
                for name in archive.getnames()
            )
        environment = temporary / "venv"
        subprocess.run(
            [args.uv, "venv", "--python", sys.executable, str(environment)], check=True
        )
        python = environment / (
            "Scripts/python.exe" if os.name == "nt" else "bin/python"
        )
        subprocess.run(
            [args.uv, "pip", "install", "--python", str(python), str(wheel)],
            check=True,
        )
        smoke = """
import pathlib
import sys
import prepare_backend
from prepare_backend.app import app, health
installed = pathlib.Path(prepare_backend.__file__).resolve()
assert installed.is_relative_to(pathlib.Path(sys.prefix).resolve())
assert health().model_dump() == {'status': 'ok'}
assert app.openapi()['paths']['/api/health']['get']['responses']['200']
print('Isolated wheel import and API smoke check: OK')
"""
        clean_env = os.environ.copy()
        clean_env.pop("PYTHONPATH", None)
        subprocess.run(
            [str(python), "-I", "-c", smoke],
            cwd=temporary,
            env=clean_env,
            check=True,
        )
        destination = backend / "dist"
        destination.mkdir(exist_ok=True)
        for artifact in (wheel, sdist):
            (destination / artifact.name).write_bytes(artifact.read_bytes())
        print(f"Verified wheel and sdist: {destination}")


if __name__ == "__main__":
    main()
