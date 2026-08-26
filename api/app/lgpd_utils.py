"""Helpers LGPD — celular E.164 e hash de device (sem logar PII)."""
from __future__ import annotations

import hashlib
import re

E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_e164(raw: str) -> str:
    s = (raw or "").strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not s.startswith("+"):
        digits = re.sub(r"\D", "", s)
        if digits.startswith("55"):
            s = "+" + digits
        else:
            s = "+55" + digits
    if not E164_RE.match(s):
        raise ValueError("Celular inválido. Use formato internacional com DDI (E.164).")
    return s


def celular_ult4(e164: str) -> str:
    digits = re.sub(r"\D", "", e164)
    return digits[-4:].zfill(4) if digits else "0000"


def hash_device_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
