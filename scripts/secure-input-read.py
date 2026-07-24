#!/usr/bin/env python3
"""Read one project-relative file by walking from an inherited root directory fd."""

import base64
import json
import os
import stat
import sys


ROOT_FD = 3
EXIT_FAILURE = 74
MAX_INPUT_BYTES = 32 * 1024 * 1024


def respond(payload):
    sys.stdout.write(json.dumps(payload, separators=(",", ":")))


def read_request():
    request = json.load(sys.stdin)
    relative_path = request.get("relativePath")
    if not isinstance(relative_path, str) or not relative_path:
        raise ValueError("invalid relative path")
    components = relative_path.split("/")
    if any(component in {"", ".", ".."} or "/" in component for component in components):
        raise ValueError("invalid path component")
    return components


def main():
    try:
        components = read_request()
        directory_fd = os.dup(ROOT_FD)
        try:
            directory_flags = os.O_RDONLY | os.O_DIRECTORY | getattr(os, "O_NOFOLLOW", 0)
            for component in components[:-1]:
                next_fd = os.open(component, directory_flags, dir_fd=directory_fd)
                os.close(directory_fd)
                directory_fd = next_fd
            file_flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
            file_fd = os.open(components[-1], file_flags, dir_fd=directory_fd)
            try:
                file_stat = os.fstat(file_fd)
                if not stat.S_ISREG(file_stat.st_mode):
                    raise OSError("not a regular file")
                chunks = []
                total = 0
                while True:
                    chunk = os.read(file_fd, 65536)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_INPUT_BYTES:
                        raise OSError("input too large")
                    chunks.append(chunk)
            finally:
                os.close(file_fd)
        finally:
            os.close(directory_fd)
        respond({
            "status": "ok",
            "identity": {"dev": str(file_stat.st_dev), "ino": str(file_stat.st_ino)},
            "contents": base64.b64encode(b"".join(chunks)).decode("ascii"),
        })
        return 0
    except (OSError, ValueError, json.JSONDecodeError):
        return EXIT_FAILURE


if __name__ == "__main__":
    sys.exit(main())
