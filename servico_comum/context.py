def get_request_id(request):
    return getattr(request.state, "request_id", None)

def get_user(request):
    return getattr(request.state, "user", None)
