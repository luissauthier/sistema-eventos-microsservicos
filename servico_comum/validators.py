from pydantic import validator

def strip_string(value: str):
    if isinstance(value, str):
        return value.strip()
    return value
