import re

with open('apps/fiscal/views.py', 'r') as f:
    orig = f.read()

new_content = orig.replace(
    'if not self._user_can_manifestar(request.user, nfe):',
    'print("CALLED _user_can_manifestar", getattr(request.user, "email", "no"), self._user_can_manifestar(request.user, nfe))\n        if not self._user_can_manifestar(request.user, nfe):'
)

new_content = new_content.replace(
    'if not self._user_can_retry(request.user):',
    'print("CALLED _user_can_retry", getattr(request.user, "username", "no"), self._user_can_retry(request.user))\n            if not self._user_can_retry(request.user):'
)

with open('apps/fiscal/views.py', 'w') as f:
    f.write(new_content)

