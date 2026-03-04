from rest_framework.permissions import BasePermission


class IsPlayer(BasePermission):
    """
    Grants access only to authenticated users whose role is 'player'.
    Only players should be allowed to create bookings.
    """

    message = "Only users with the 'player' role can create bookings."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "player"
        )


class IsBookingOwner(BasePermission):
    """
    Object-level permission — only the user who made the booking
    can cancel or view it.
    """

    message = "You do not have permission to modify this booking."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsOwnerOfGround(BasePermission):
    """
    Grants access to authenticated users with role='owner'.
    Used on the OwnerBookingsView — the view further filters
    bookings to only those belonging to the owner's grounds.
    """

    message = "Only ground owners can access this resource."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "owner"
        )
