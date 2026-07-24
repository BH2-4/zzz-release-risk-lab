#!/usr/bin/env python3
"""Commit Theory run output through a journaled directory-fd transaction."""

import base64
import fcntl
import json
import os
import stat
import sys
import uuid


DIRECTORY_FD = 3
EXIT_EXISTS = 17
EXIT_CONFLICT = 73
EXIT_FAILURE = 74
EXIT_INTERRUPTED = 75
EXIT_BUSY = 76
VERSION = 1


def respond(payload):
    sys.stdout.write(json.dumps(payload, separators=(",", ":")))


def valid_name(name):
    return isinstance(name, str) and name not in {"", ".", ".."} and os.path.basename(name) == name


def identity(file_stat):
    return {"dev": str(file_stat.st_dev), "ino": str(file_stat.st_ino)}


def same_identity(left, right):
    return bool(left and right and left.get("dev") == right.get("dev") and left.get("ino") == right.get("ino"))


def inspect(name):
    try:
        file_stat = os.stat(name, dir_fd=DIRECTORY_FD, follow_symlinks=False)
    except FileNotFoundError:
        return {"kind": "missing"}
    if stat.S_ISLNK(file_stat.st_mode):
        return {"kind": "symlink", "identity": identity(file_stat)}
    if stat.S_ISREG(file_stat.st_mode):
        return {"kind": "file", "identity": identity(file_stat)}
    return {"kind": "other", "identity": identity(file_stat)}


def expected_target(value):
    if not isinstance(value, dict) or value.get("kind") not in {"missing", "file"}:
        raise ValueError("invalid expected target")
    if value["kind"] == "file":
        expected_identity = value.get("identity")
        if not isinstance(expected_identity, dict) or not all(
            isinstance(expected_identity.get(key), str) for key in ("dev", "ino")
        ):
            raise ValueError("invalid expected target identity")
    return value


def target_matches(actual, expected):
    if expected["kind"] == "missing":
        return actual["kind"] == "missing"
    return actual["kind"] == "file" and same_identity(actual.get("identity"), expected.get("identity"))


def write_all(descriptor, contents):
    offset = 0
    while offset < len(contents):
        written = os.write(descriptor, contents[offset:])
        if written <= 0:
            raise OSError("short write")
        offset += written


def create_json_file(name, value):
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(name, flags, 0o600, dir_fd=DIRECTORY_FD)
    try:
        write_all(descriptor, (json.dumps(value, separators=(",", ":")) + "\n").encode("utf-8"))
        os.fsync(descriptor)
        file_identity = identity(os.fstat(descriptor))
    finally:
        os.close(descriptor)
    os.fsync(DIRECTORY_FD)
    return file_identity


def verify_owned(name, expected_identity):
    actual = inspect(name)
    return actual["kind"] == "file" and same_identity(actual.get("identity"), expected_identity)


def unlink_owned(name, expected_identity):
    if expected_identity is None:
        return False
    actual = inspect(name)
    if actual["kind"] == "missing":
        return False
    if actual["kind"] != "file" or not same_identity(actual.get("identity"), expected_identity):
        raise OSError("owned entry identity changed")
    os.unlink(name, dir_fd=DIRECTORY_FD)
    return True


def create_journal(transaction):
    return create_json_file(transaction["journalName"], transaction)


def update_journal(transaction, journal_identity):
    journal_name = transaction["journalName"]
    if not verify_owned(journal_name, journal_identity):
        raise OSError("journal ownership changed")
    next_revision = transaction.get("revision", 0) + 1
    update_name = f".theory-transaction-update-{transaction['operationId']}-{next_revision}-{uuid.uuid4()}"
    updated_transaction = {**transaction, "revision": next_revision}
    update_identity = None
    try:
        update_identity = create_json_file(update_name, updated_transaction)
        interrupt_at(transaction, "after-journal-update-create")
        if not verify_owned(journal_name, journal_identity):
            raise OSError("journal ownership changed")
        interrupt_at(transaction, "before-journal-update-replace")
        os.replace(update_name, journal_name, src_dir_fd=DIRECTORY_FD, dst_dir_fd=DIRECTORY_FD)
        update_identity = None
        os.fsync(DIRECTORY_FD)
        current = inspect(journal_name)
        if current["kind"] != "file":
            raise OSError("journal update missing")
        transaction["revision"] = next_revision
        return current["identity"]
    finally:
        if update_identity is not None:
            unlink_owned(update_name, update_identity)


def read_json_record(name):
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(name, flags, dir_fd=DIRECTORY_FD)
    try:
        file_stat = os.fstat(descriptor)
        if not stat.S_ISREG(file_stat.st_mode):
            raise ValueError("record is not a regular file")
        record_identity = identity(file_stat)
        chunks = []
        total = 0
        while True:
            chunk = os.read(descriptor, 65536)
            if not chunk:
                break
            total += len(chunk)
            if total > 1024 * 1024:
                raise ValueError("journal too large")
            chunks.append(chunk)
    finally:
        os.close(descriptor)
    return json.loads(b"".join(chunks).decode("utf-8")), record_identity


def validate_transaction(transaction, journal_name):
    required_strings = ("operationId", "mode", "targetName", "tempName", "backupName", "journalName", "state")
    if not isinstance(transaction, dict) or transaction.get("version") != VERSION:
        raise ValueError("invalid journal")
    if not all(isinstance(transaction.get(key), str) for key in required_strings):
        raise ValueError("invalid journal")
    if transaction["journalName"] != journal_name:
        raise ValueError("journal name mismatch")
    if transaction["mode"] not in {"noreplace", "replace"}:
        raise ValueError("invalid transaction mode")
    if not all(valid_name(transaction[key]) for key in ("targetName", "tempName", "backupName", "journalName")):
        raise ValueError("invalid transaction names")
    revision = transaction.get("revision", 0)
    if not isinstance(revision, int) or revision < 0:
        raise ValueError("invalid transaction revision")
    transaction["revision"] = revision
    transaction["expectedTarget"] = expected_target(transaction.get("expectedTarget"))
    return transaction


def matching_update_candidates(transaction):
    prefix = f".theory-transaction-update-{transaction['operationId']}-"
    candidates = []
    for name in os.listdir(DIRECTORY_FD):
        if not name.startswith(prefix) or not valid_name(name):
            continue
        try:
            candidate, candidate_identity = read_json_record(name)
            candidate = validate_transaction(candidate, transaction["journalName"])
        except (OSError, ValueError, json.JSONDecodeError, UnicodeDecodeError):
            continue
        if candidate["operationId"] != transaction["operationId"]:
            continue
        candidates.append((candidate["revision"], name, candidate, candidate_identity))
    return candidates


def reconcile_update_candidates(transaction, journal_identity):
    candidates = matching_update_candidates(transaction)
    newer = [candidate for candidate in candidates if candidate[0] > transaction["revision"]]
    if newer:
        revision, name, candidate, candidate_identity = max(newer, key=lambda value: (value[0], value[1]))
        if not verify_owned(transaction["journalName"], journal_identity):
            raise OSError("journal ownership changed")
        if not verify_owned(name, candidate_identity):
            raise OSError("journal update ownership changed")
        os.replace(name, transaction["journalName"], src_dir_fd=DIRECTORY_FD, dst_dir_fd=DIRECTORY_FD)
        os.fsync(DIRECTORY_FD)
        current = inspect(transaction["journalName"])
        if current["kind"] != "file":
            raise OSError("journal update missing")
        transaction = candidate
        journal_identity = current["identity"]

    for _, name, candidate, candidate_identity in candidates:
        if candidate["revision"] <= transaction["revision"]:
            unlink_owned(name, candidate_identity)
    return transaction, journal_identity


def load_journal(journal_name):
    if not valid_name(journal_name):
        raise ValueError("invalid journal name")
    transaction, journal_identity = read_json_record(journal_name)
    transaction = validate_transaction(transaction, journal_name)
    return reconcile_update_candidates(transaction, journal_identity)


def cleanup_update_candidates(transaction):
    for _, name, _, candidate_identity in matching_update_candidates(transaction):
        unlink_owned(name, candidate_identity)


def cleanup_auxiliary(transaction, journal_identity):
    cleanup_update_candidates(transaction)
    unlink_owned(transaction["tempName"], transaction.get("tempIdentity"))
    unlink_owned(
        transaction["backupName"],
        transaction.get("backupIdentity") or transaction.get("backupPlaceholderIdentity"),
    )
    unlink_owned(transaction["journalName"], journal_identity)
    os.fsync(DIRECTORY_FD)


def recover_transaction(journal_name, operation_id=None):
    try:
        transaction, journal_identity = load_journal(journal_name)
    except FileNotFoundError:
        return {"status": "none"}

    if operation_id is not None and transaction["operationId"] != operation_id:
        return {"status": "busy", "operationId": transaction["operationId"]}
    transaction["failpoint"] = None
    if transaction.get("state") == "unexpected-target-preserved":
        return {"status": "conflict-preserved", "operationId": transaction["operationId"]}

    if transaction.get("tempIdentity") is None:
        unrecorded_temp = inspect(transaction["tempName"])
        if unrecorded_temp["kind"] == "file" and transaction.get("state") == "initialized":
            transaction["tempIdentity"] = unrecorded_temp["identity"]
            transaction["state"] = "temp-created"
            journal_identity = update_journal(transaction, journal_identity)

    target = inspect(transaction["targetName"])
    published_identity = transaction.get("publishedIdentity") or transaction.get("tempIdentity")
    if target["kind"] == "file" and same_identity(target.get("identity"), published_identity):
        if transaction.get("publishedIdentity") is None or transaction.get("state") != "published":
            transaction["publishedIdentity"] = published_identity
            transaction["state"] = "published"
            journal_identity = update_journal(transaction, journal_identity)
        result = {
            "status": "published",
            "operationId": transaction["operationId"],
            "publishedIdentity": published_identity,
        }
        return result

    if transaction.get("backupIdentity") is not None and target["kind"] == "file" and not same_identity(
        target.get("identity"), transaction["backupIdentity"]
    ):
        transaction["state"] = "unexpected-target-preserved"
        update_journal(transaction, journal_identity)
        return {"status": "conflict-preserved", "operationId": transaction["operationId"]}

    expected = transaction["expectedTarget"]
    backup = inspect(transaction["backupName"])
    if backup["kind"] == "file" and transaction["expectedTarget"]["kind"] == "file":
        if transaction.get("backupIdentity") is None and same_identity(
            backup.get("identity"), transaction["expectedTarget"]["identity"]
        ):
            transaction["backupIdentity"] = backup["identity"]
            transaction["state"] = "backup-created"
            journal_identity = update_journal(transaction, journal_identity)
        elif transaction.get("backupIdentity") is None and transaction.get("state") == "backup-reserved" and not same_identity(
            backup.get("identity"), transaction.get("backupPlaceholderIdentity")
        ):
            transaction["backupIdentity"] = backup["identity"]
            transaction["backupPlaceholderIdentity"] = None
            transaction["state"] = "unexpected-target-moved"
            journal_identity = update_journal(transaction, journal_identity)

    if target_matches(target, expected):
        cleanup_auxiliary(transaction, journal_identity)
        return {"status": "unpublished", "operationId": transaction["operationId"]}

    if target["kind"] == "missing" and transaction.get("backupIdentity") is not None:
        if not verify_owned(transaction["backupName"], transaction["backupIdentity"]):
            raise OSError("backup ownership changed")
        restoration_collided = False
        try:
            os.link(
                transaction["backupName"],
                transaction["targetName"],
                src_dir_fd=DIRECTORY_FD,
                dst_dir_fd=DIRECTORY_FD,
                follow_symlinks=False,
            )
            os.fsync(DIRECTORY_FD)
        except FileExistsError:
            restoration_collided = True
        target = inspect(transaction["targetName"])
        if target["kind"] == "file" and same_identity(target.get("identity"), transaction["backupIdentity"]):
            cleanup_auxiliary(transaction, journal_identity)
            return {"status": "unpublished", "operationId": transaction["operationId"]}
        if restoration_collided:
            transaction["state"] = "unexpected-target-preserved"
            update_journal(transaction, journal_identity)
            return {"status": "conflict-preserved", "operationId": transaction["operationId"]}

    cleanup_auxiliary(transaction, journal_identity)
    return {"status": "conflict", "operationId": transaction["operationId"]}


def validate_identity(value):
    if not isinstance(value, dict) or not all(isinstance(value.get(key), str) for key in ("dev", "ino")):
        raise ValueError("invalid identity")
    return value


def finalize_transaction(journal_name, operation_id, published_identity):
    if not isinstance(operation_id, str) or not operation_id:
        raise ValueError("invalid operation id")
    published_identity = validate_identity(published_identity)
    try:
        transaction, journal_identity = load_journal(journal_name)
    except FileNotFoundError:
        return {"status": "none", "operationId": operation_id}
    if transaction["operationId"] != operation_id:
        return {"status": "busy", "operationId": transaction["operationId"]}
    if transaction.get("state") != "published" or not same_identity(
        transaction.get("publishedIdentity"), published_identity
    ):
        return {"status": "conflict", "operationId": operation_id}
    target = inspect(transaction["targetName"])
    if target["kind"] != "file" or not same_identity(target.get("identity"), published_identity):
        return {"status": "conflict-preserved", "operationId": operation_id}
    cleanup_auxiliary(transaction, journal_identity)
    return {"status": "finalized", "operationId": operation_id}


def interrupt_at(request, point):
    if request.get("failpoint") == point:
        os._exit(EXIT_INTERRUPTED)


def create_temp(transaction, contents, journal_identity):
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(transaction["tempName"], flags, 0o600, dir_fd=DIRECTORY_FD)
    try:
        transaction["tempIdentity"] = identity(os.fstat(descriptor))
        interrupt_at(transaction, "after-temp-create-before-journal")
        transaction["state"] = "temp-created"
        journal_identity = update_journal(transaction, journal_identity)
        write_all(descriptor, contents)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    transaction["state"] = "prepared"
    journal_identity = update_journal(transaction, journal_identity)
    return journal_identity


def commit_transaction(request):
    operation_id = request.get("operationId")
    mode = request.get("mode")
    names = {key: request.get(key) for key in ("targetName", "tempName", "backupName", "journalName")}
    if not isinstance(operation_id, str) or not operation_id or mode not in {"noreplace", "replace"}:
        raise ValueError("invalid transaction request")
    if not all(valid_name(value) for value in names.values()):
        raise ValueError("invalid transaction names")
    expected = expected_target(request.get("expectedTarget"))
    encoded_contents = request.get("contents")
    if not isinstance(encoded_contents, str):
        raise ValueError("invalid transaction contents")
    contents = base64.b64decode(encoded_contents, validate=True)
    transaction = {
        "version": VERSION,
        "operationId": operation_id,
        "mode": mode,
        **names,
        "expectedTarget": expected,
        "tempIdentity": None,
        "backupIdentity": None,
        "backupPlaceholderIdentity": None,
        "publishedIdentity": None,
        "revision": 0,
        "state": "initialized",
        "failpoint": request.get("failpoint"),
    }
    journal_identity = create_journal(transaction)
    journal_identity = create_temp(transaction, contents, journal_identity)

    interrupt_at(request, "before-publication")
    target = inspect(transaction["targetName"])
    if not target_matches(target, expected):
        status = "exists" if mode == "noreplace" and target["kind"] != "missing" else "conflict"
        respond({"status": status, "operationId": operation_id})
        return EXIT_EXISTS if status == "exists" else EXIT_CONFLICT

    if mode == "replace" and expected["kind"] == "file":
        os.link(
            transaction["targetName"],
            transaction["backupName"],
            src_dir_fd=DIRECTORY_FD,
            dst_dir_fd=DIRECTORY_FD,
            follow_symlinks=False,
        )
        os.fsync(DIRECTORY_FD)
        interrupt_at(request, "after-backup-create-before-journal")
        backup = inspect(transaction["backupName"])
        if backup["kind"] != "file" or not same_identity(backup.get("identity"), expected["identity"]):
            raise OSError("backup target identity changed")
        transaction["backupIdentity"] = backup["identity"]
        transaction["backupPlaceholderIdentity"] = None
        transaction["state"] = "backup-created"
        journal_identity = update_journal(transaction, journal_identity)
        if not verify_owned(transaction["targetName"], expected["identity"]):
            respond({"status": "conflict", "operationId": operation_id})
            return EXIT_CONFLICT
        os.unlink(transaction["targetName"], dir_fd=DIRECTORY_FD)
        os.fsync(DIRECTORY_FD)
        interrupt_at(request, "after-target-move-before-journal")
        interrupt_at(request, "between-replacement-steps")

    target = inspect(transaction["targetName"])
    if target["kind"] != "missing":
        status = "exists" if mode == "noreplace" else "conflict"
        respond({"status": status, "operationId": operation_id})
        return EXIT_EXISTS if status == "exists" else EXIT_CONFLICT

    os.link(
        transaction["tempName"],
        transaction["targetName"],
        src_dir_fd=DIRECTORY_FD,
        dst_dir_fd=DIRECTORY_FD,
        follow_symlinks=False,
    )
    os.fsync(DIRECTORY_FD)
    transaction["publishedIdentity"] = transaction["tempIdentity"]
    transaction["state"] = "published"
    journal_identity = update_journal(transaction, journal_identity)
    interrupt_at(request, "after-publication-before-response")
    if request.get("failpoint") == "malformed-final-response":
        sys.stdout.write("{")
        return 0
    respond({
        "status": "committed",
        "operationId": operation_id,
        "publishedIdentity": transaction["publishedIdentity"],
    })
    return 0


def main():
    try:
        request = json.load(sys.stdin)
        try:
            fcntl.flock(DIRECTORY_FD, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            respond({"status": "busy"})
            return EXIT_BUSY
        operation = request.get("operation")
        if operation == "inspect":
            target_name = request.get("targetName")
            if not valid_name(target_name):
                raise ValueError("invalid target name")
            respond({"status": "ok", "target": inspect(target_name)})
            return 0
        if operation == "recover":
            operation_id = request.get("operationId")
            if operation_id is not None and (not isinstance(operation_id, str) or not operation_id):
                raise ValueError("invalid operation id")
            result = recover_transaction(request.get("journalName"), operation_id)
            respond(result)
            if result["status"] == "busy":
                return EXIT_BUSY
            if result["status"] == "conflict-preserved":
                return EXIT_CONFLICT
            return 0
        if operation == "finalize":
            result = finalize_transaction(
                request.get("journalName"),
                request.get("operationId"),
                request.get("publishedIdentity"),
            )
            respond(result)
            if result["status"] == "busy":
                return EXIT_BUSY
            if result["status"] in {"conflict", "conflict-preserved"}:
                return EXIT_CONFLICT
            return 0
        if operation == "commit":
            return commit_transaction(request)
        raise ValueError("invalid operation")
    except (OSError, ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return EXIT_FAILURE


if __name__ == "__main__":
    sys.exit(main())
