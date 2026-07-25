import Link from 'next/link';

// Builds the page list with ellipses, e.g. [1, '...', 4, 5, 6, '...', 12]
function getPageNumbers(current, total) {
  const delta = 1; // how many pages to show around the current page
  const range = [];
  const pages = [];

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  let prev;
  for (const i of range) {
    if (prev !== undefined && i - prev > 1) pages.push('...');
    pages.push(i);
    prev = i;
  }
  return pages;
}

export default function Pagination({ currentPage, totalPages, basePath }) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const linkStyle = (isActive) => ({
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    minWidth: 36,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    color: isActive ? '#FBF7F0' : '#2A211C',
    background: isActive ? '#9E3A1C' : 'transparent',
    border: isActive ? '1px solid #9E3A1C' : '1px solid #E4D3BF',
  });

  return (
    <nav
      aria-label="Product pagination"
      className="mt-12 flex items-center justify-center gap-2 flex-wrap"
    >
      {/* Prev */}
      {currentPage > 1 ? (
        <Link
          href={`${basePath}?page=${currentPage - 1}`}
          style={linkStyle(false)}
          aria-label="Previous page"
        >
          ‹
        </Link>
      ) : (
        <span style={{ ...linkStyle(false), opacity: 0.35, cursor: 'not-allowed' }} aria-hidden="true">
          ‹
        </span>
      )}

      {/* Page numbers */}
      {pageNumbers.map((p, idx) =>
        p === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#8A7B6C', padding: '0 4px' }}
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={`${basePath}?page=${p}`}
            style={linkStyle(p === currentPage)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={`${basePath}?page=${currentPage + 1}`}
          style={linkStyle(false)}
          aria-label="Next page"
        >
          ›
        </Link>
      ) : (
        <span style={{ ...linkStyle(false), opacity: 0.35, cursor: 'not-allowed' }} aria-hidden="true">
          ›
        </span>
      )}
    </nav>
  );
}