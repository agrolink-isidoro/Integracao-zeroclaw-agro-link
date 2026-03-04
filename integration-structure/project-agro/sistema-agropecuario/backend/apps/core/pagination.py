from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """Pagination that allows clients to set `page_size` up to a reasonable max.

    Use by setting DEFAULT_PAGINATION_CLASS to
    'backend.apps.core.pagination.DefaultPagination'.
    """
    page_size_query_param = 'page_size'
    max_page_size = 1000
