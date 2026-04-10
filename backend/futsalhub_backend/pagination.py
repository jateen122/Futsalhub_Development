# backend/futsalhub_backend/pagination.py
from rest_framework.pagination import PageNumberPagination


class FlexiblePageNumberPagination(PageNumberPagination):
    """
    Same as DRF's default PageNumberPagination but allows the client
    to request a larger page via ?page_size=N (capped at 10000).

    This means the frontend fetchAllPages() helper works correctly —
    it follows `next` links — but the OwnerAnalytics page can also
    request all data in one call via ?page_size=10000 if desired.
    """
    page_size             = 10
    page_size_query_param = "page_size"
    max_page_size         = 10000
