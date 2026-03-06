from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name               = "notifications"

    def ready(self):
        """
        Import signals when the app is fully loaded.
        This is the correct Django pattern for registering signal handlers —
        placing it here ensures signals are connected exactly once when
        Django starts, regardless of how the app is imported.
        """
        import notifications.signals  # noqa: F401
