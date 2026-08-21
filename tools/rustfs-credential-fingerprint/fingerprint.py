#!/usr/bin/env python3
import hashlib
import os
import re
import sys

ASCII_WS = b" \t\r\n\v\f"


def env_bytes(name: str) -> bytes:
    key = name.encode("utf-8")
    if key not in os.environb:
        print(f"{name}_PRESENT=NO")
        sys.exit(2)
    return os.environb[key]


def yn(flag: bool) -> str:
    return "YES" if flag else "NO"


def report(label: str, value: bytes, expected_len: int) -> None:
    digest = hashlib.sha256(value).hexdigest()
    trailing_cr = value.endswith(b"\r")
    trailing_lf = value.endswith(b"\n")
    leading_ws = len(value) > 0 and value[:1] in [bytes([b]) for b in ASCII_WS]
    trailing_ws = len(value) > 0 and value[-1:] in [bytes([b]) for b in ASCII_WS]
    literal_reference = bool(re.fullmatch(rb"\$\{\{[^\r\n]+\}\}", value))

    print(f"{label}_LENGTH={len(value)}")
    print(f"{label}_SHA256={digest}")
    print(f"{label}_ZERO_LENGTH={yn(len(value) == 0)}")
    print(f"{label}_TRAILING_CR={yn(trailing_cr)}")
    print(f"{label}_TRAILING_LF={yn(trailing_lf)}")
    print(f"{label}_TRAILING_NEWLINE={yn(trailing_cr or trailing_lf)}")
    print(f"{label}_EDGE_WHITESPACE={yn(leading_ws or trailing_ws)}")
    print(f"{label}_UNEXPECTED_LENGTH={yn(len(value) != expected_len)}")
    print(f"{label}_LITERAL_REFERENCE={yn(literal_reference)}")


access_name = os.environ.get("ACCESS_VAR_NAME", "RUSTFS_ACCESS_KEY")
secret_name = os.environ.get("SECRET_VAR_NAME", "RUSTFS_SECRET_KEY")
expected_access = int(os.environ.get("EXPECTED_ACCESS_LENGTH", "20"))
expected_secret = int(os.environ.get("EXPECTED_SECRET_LENGTH", "40"))

access = env_bytes(access_name)
secret = env_bytes(secret_name)

report("ACCESS_KEY", access, expected_access)
print()
report("SECRET_KEY", secret, expected_secret)
print()
print(f"ACCESS_SECRET_SWAPPED_SHAPE={yn(len(access) == expected_secret and len(secret) == expected_access)}")
print("CREDENTIAL_VALUES_PRINTED=NO")
