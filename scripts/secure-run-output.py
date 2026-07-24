#!/usr/bin/env python3
"""Perform Theory run target operations relative to an inherited directory fd."""

import os
import stat
import sys


DIRECTORY_FD = 3
EXIT_EXISTS = 17
EXIT_FAILURE = 74


def valid_name(name):
    return name not in {"", ".", ".."} and os.path.basename(name) == name


def remove_if_present(name):
    try:
        os.unlink(name, dir_fd=DIRECTORY_FD)
    except FileNotFoundError:
        pass


def same_entry(first, second):
    try:
        first_stat = os.stat(first, dir_fd=DIRECTORY_FD, follow_symlinks=False)
        second_stat = os.stat(second, dir_fd=DIRECTORY_FD, follow_symlinks=False)
    except FileNotFoundError:
        return False
    return (first_stat.st_dev, first_stat.st_ino) == (second_stat.st_dev, second_stat.st_ino)


def inspect_target(target):
    try:
        target_stat = os.stat(target, dir_fd=DIRECTORY_FD, follow_symlinks=False)
    except FileNotFoundError:
        print("missing")
        return 0
    if stat.S_ISLNK(target_stat.st_mode):
        print("symlink")
    elif stat.S_ISREG(target_stat.st_mode):
        print(f"file {target_stat.st_dev} {target_stat.st_ino}")
    else:
        print("other")
    return 0


def write_temp(temp):
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(temp, flags, 0o600, dir_fd=DIRECTORY_FD)
    try:
        contents = sys.stdin.buffer.read()
        offset = 0
        while offset < len(contents):
            offset += os.write(descriptor, contents[offset:])
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def write_noreplace(temp, target):
    committed = False
    try:
        write_temp(temp)
        os.link(
            temp,
            target,
            src_dir_fd=DIRECTORY_FD,
            dst_dir_fd=DIRECTORY_FD,
            follow_symlinks=False,
        )
        committed = True
        os.fsync(DIRECTORY_FD)
        return 0
    except FileExistsError:
        if committed and same_entry(temp, target):
            remove_if_present(target)
        remove_if_present(temp)
        return EXIT_EXISTS
    except OSError:
        if committed and same_entry(temp, target):
            remove_if_present(target)
        remove_if_present(temp)
        return EXIT_FAILURE


def write_replace(temp, target, backup):
    backup_created = False
    committed = False
    try:
        write_temp(temp)
        try:
            target_stat = os.stat(target, dir_fd=DIRECTORY_FD, follow_symlinks=False)
            if stat.S_ISREG(target_stat.st_mode):
                os.link(
                    target,
                    backup,
                    src_dir_fd=DIRECTORY_FD,
                    dst_dir_fd=DIRECTORY_FD,
                    follow_symlinks=False,
                )
                backup_created = True
        except FileNotFoundError:
            pass
        os.replace(temp, target, src_dir_fd=DIRECTORY_FD, dst_dir_fd=DIRECTORY_FD)
        committed = True
        os.fsync(DIRECTORY_FD)
        return 0
    except OSError:
        if committed:
            if backup_created:
                os.replace(backup, target, src_dir_fd=DIRECTORY_FD, dst_dir_fd=DIRECTORY_FD)
                backup_created = False
            else:
                remove_if_present(target)
        remove_if_present(temp)
        if backup_created:
            remove_if_present(backup)
        return EXIT_FAILURE


def finalize(temp, backup):
    try:
        remove_if_present(temp)
        remove_if_present(backup)
        return 0
    except OSError:
        return EXIT_FAILURE


def rollback(operation, temp, target, backup):
    try:
        if operation == "rollback-noreplace":
            if same_entry(temp, target):
                remove_if_present(target)
        elif operation == "rollback-replace":
            try:
                os.replace(backup, target, src_dir_fd=DIRECTORY_FD, dst_dir_fd=DIRECTORY_FD)
            except FileNotFoundError:
                remove_if_present(target)
        remove_if_present(temp)
        remove_if_present(backup)
        os.fsync(DIRECTORY_FD)
        return 0
    except OSError:
        return EXIT_FAILURE


def main():
    if len(sys.argv) != 5:
        return EXIT_FAILURE
    operation, temp, target, backup = sys.argv[1:]
    if not all(valid_name(name) for name in (temp, target, backup)):
        return EXIT_FAILURE
    if operation == "inspect":
        return inspect_target(target)
    if operation == "write-noreplace":
        return write_noreplace(temp, target)
    if operation == "write-replace":
        return write_replace(temp, target, backup)
    if operation == "finalize":
        return finalize(temp, backup)
    if operation in {"rollback-noreplace", "rollback-replace"}:
        return rollback(operation, temp, target, backup)
    return EXIT_FAILURE


if __name__ == "__main__":
    sys.exit(main())
