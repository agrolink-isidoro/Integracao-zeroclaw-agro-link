# Shim to expose real core app implementation located at ../apps/core
import importlib
import sys

_real = importlib.import_module('apps.core')
sys.modules[__name__] = _real
