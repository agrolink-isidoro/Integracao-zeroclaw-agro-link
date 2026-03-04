def safe_get(obj, attr_path, default=None):
    """Safely traverse an attribute path (like 'a.b.c') returning default if any step is missing.

    Example: safe_get(instance, 'rel_obj.attr') == getattr(instance.rel_obj, 'attr') if rel_obj exists else default
    """
    try:
        current = obj
        for part in attr_path.split('.'):
            if current is None:
                return default
            current = getattr(current, part)
        return current
    except Exception:
        return default