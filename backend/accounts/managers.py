from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """
    Custom manager for the User model that uses email as the
    unique identifier instead of username.
    """

    def create_user(self, email, full_name, password=None, **extra_fields):
        """
        Create and save a regular user with the given email, full_name
        and password.
        """
        if not email:
            raise ValueError("An email address is required.")
        if not full_name:
            raise ValueError("A full name is required.")

        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)   # hashes the password
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        """
        Create and save a superuser with the given email, full_name
        and password.
        """
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        extra_fields.setdefault("is_verified", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, full_name, password, **extra_fields)
