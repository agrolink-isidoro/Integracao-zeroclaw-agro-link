from django.db import models


class Language(models.Model):
    """Represents an application language / locale entry.

    Keep this model intentionally small: `code` should be an ISO-like code
    (ex.: pt-BR, en, en-US) and `is_active` controls availability in the UI.
    """

    code = models.CharField(max_length=10, unique=True, help_text="ISO code, ex: pt-BR")
    name = models.CharField(max_length=100, help_text="Human readable name, ex: Português (Brasil)")
    is_active = models.BooleanField(default=True, help_text="Whether the language is available for users")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Language"
        verbose_name_plural = "Languages"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.name} ({self.code})"
