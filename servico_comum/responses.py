def success(data=None):
    return {
        "success": True,
        "data": data or {}
    }

def fail(message, details=None):
    return {
        "success": False,
        "error": message,
        "details": details or {}
    }
