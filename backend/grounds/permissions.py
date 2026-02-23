from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerRole(BasePermission):
    """
    Grants access only to authenticated users whose role is 'owner'.

    Used on the Create endpoint so that players and admins cannot
    list grounds as owners.
    """

    message = "Only users with the 'owner' role can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "owner"
        )


class IsGroundOwner(BasePermission):
    """
    Object-level permission — grants write access only to the owner
    of the specific Ground instance being modified.

    Read access (SAFE_METHODS) is not granted here; combine with
    AllowAny or IsAuthenticated at the view level if reads are needed.
    """

    message = "You do not have permission to modify this ground."

    def has_permission(self, request, view):
        # User must at least be authenticated with the 'owner' role
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "owner"
        )

    def has_object_permission(self, request, view, obj):
        # The authenticated owner must be the ground's owner
        return obj.owner == request.user


class IsAdminRole(BasePermission):
    """
    Grants access only to authenticated users whose role is 'admin'.

    Note: this checks the *custom* role field on the User model,
    not Django's built-in is_staff / is_superuser flags (though those
    are also fine to use for Django admin access).
    """

    message = "Only admin users can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )
